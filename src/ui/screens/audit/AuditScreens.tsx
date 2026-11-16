import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../data/db';
import { closeAudit, reopenAudit, startAudit, updateAudit } from '../../../data/auditRepo';
import { auditProgress, durationMs, formatDuration } from '../../../domain/audit';
import { parseISODate, weekLabel } from '../../../domain/dates';
import type { Audit, Lang } from '../../../domain/types';
import { useI18n } from '../../../i18n';
import { useSettings } from '../../settingsContext';
import { Header } from '../../components/Layout';
import { TextField } from '../../components/fields';
import { useNow } from '../../hooks';

export function weekPrefix(lang: Lang) {
  return lang === 'de' ? 'KW' : lang === 'fr' ? 'S' : 'W';
}

/** Audit en cours le plus récent, sinon undefined. */
export function useInProgressAudit() {
  return useLiveQuery(async () => (await db.audits.where('status').equals('in_progress').reverse().sortBy('date'))[0] ?? null, []);
}

/** /audit : reprend l'audit en cours, ou propose d'en démarrer un. */
export function AuditEntry() {
  const { t, lang } = useI18n();
  const s = useSettings();
  const nav = useNavigate();
  const current = useInProgressAudit();
  const history = useLiveQuery(() => db.audits.orderBy('date').reverse().toArray(), []);
  if (current === undefined || !history) return null;
  if (current) return <Navigate to={`/audit/${current.id}`} replace />;

  return (
    <>
      <Header title={t('nav.audit')} />
      <section className="card hero">
        <button type="button" className="btn btn-primary btn-big" onClick={async () => nav(`/audit/${(await startAudit()).id}`, { replace: true })}>
          ▶ {t('audit.start')}
        </button>
        <div className="small muted">
          {t('audit.auditor')} : {s.auditorName || '—'}
          {s.defaultParticipants.length > 0 && ` · ${s.defaultParticipants.join(', ')}`}
        </div>
      </section>
      {history.length > 0 && (
        <section className="card">
          <h2>{t('audit.previous')}</h2>
          <ul className="list">
            {history.map((a) => (
              <li key={a.id} className="list-item">
                <Link to={`/audit/${a.id}`} className="list-main">
                  <span className="strong">{weekLabel(a.isoYear, a.isoWeek, weekPrefix(lang))}</span>
                  <span className="small muted">{parseISODate(a.date).toLocaleDateString(lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** /audit/:auditId : avancement, établis, clôture. */
export function AuditView() {
  const { auditId = '' } = useParams();
  const { t, lang } = useI18n();
  const now = useNow();
  const audit = useLiveQuery(() => db.audits.get(auditId).then((a) => a ?? null), [auditId]);
  const wbs = useLiveQuery(() => db.workbenches.orderBy('order').toArray(), []);
  const was = useLiveQuery(() => db.workbenchAudits.where('auditId').equals(auditId).toArray(), [auditId]);
  const findings = useLiveQuery(() => db.findings.where('auditId').equals(auditId).toArray(), [auditId]);

  if (audit === null) return <><Header title={t('nav.audit')} back /><section className="card">{t('audit.notFound')}</section></>;
  if (!audit || !wbs || !was || !findings) return null;

  const closed = audit.status === 'closed';
  const byWb = new Map(was.map((w) => [w.workbenchId, w]));
  // Établis actifs + établis archivés déjà audités dans cet audit
  const shown = wbs.filter((w) => w.active || byWb.has(w.id));
  const p = auditProgress(wbs, was);
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;

  const close = async () => {
    if (p.remaining > 0 && !confirm(t('audit.closeConfirm', { remaining: p.remaining }))) return;
    await closeAudit(audit.id);
  };

  return (
    <>
      <Header title={`${t('nav.audit')} ${weekLabel(audit.isoYear, audit.isoWeek, weekPrefix(lang))}`} />
      <section className="card">
        <div className="row">
          <span className="grow">{parseISODate(audit.date).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className="strong">⏱ {formatDuration(durationMs(audit.startedAt, audit.closedAt, now))}</span>
        </div>
        <div className="progress" aria-label={t('audit.progress', { done: p.done, total: p.total })}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="small muted">{t('audit.progress', { done: p.done, total: p.total })} · {t('audit.findingsCount', { n: findings.length })}</div>
        <ParticipantsEditor audit={audit} disabled={closed} />
      </section>

      {closed && (
        <section className="card notice">
          ✓ {t('audit.closed')} — <Link to="/settings/backup">{t('audit.backupReminder')}</Link>
        </section>
      )}

      <ul className="list">
        {shown.map((w) => {
          const wa = byWb.get(w.id);
          const n = findings.filter((f) => f.workbenchId === w.id).length;
          const status = wa?.status ?? 'todo';
          return (
            <li key={w.id} className={`list-item wb-status-${status}`}>
              <Link to={`/audit/${audit.id}/wb/${w.id}`} className="list-main">
                <span className="status-icon" aria-hidden>{status === 'done' ? '✅' : status === 'in_progress' ? '🟡' : '⚪'}</span>
                <div className="grow">
                  <div className="strong">{w.name}</div>
                  <div className="small muted">
                    {t(`audit.status.${status}`)}
                    {wa?.markedCompliant ? ` · ${t('audit.compliantBadge')}` : ''}
                    {n > 0 ? ` · ${t('audit.findingsCount', { n })}` : ''}
                  </div>
                </div>
                {wa?.status === 'done' && wa.scorePct !== undefined && <span className="score">{wa.scorePct} %</span>}
                <span className="chevron">›</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="bottom-actions">
        {closed ? (
          <button type="button" className="btn btn-big" onClick={() => reopenAudit(audit.id)}>{t('audit.reopen')}</button>
        ) : (
          <button type="button" className={`btn btn-big ${p.remaining === 0 ? 'btn-primary' : ''}`} onClick={close}>
            🏁 {t('audit.close')}
          </button>
        )}
      </div>
    </>
  );
}

function ParticipantsEditor({ audit, disabled }: { audit: Audit; disabled: boolean }) {
  const { t } = useI18n();
  const summary = [audit.auditorName, ...audit.participants].filter(Boolean).join(', ') || '—';
  if (disabled) return <div className="small muted">👥 {summary}</div>;
  return (
    <details>
      <summary className="small muted">👥 {summary}</summary>
      <TextField label={t('audit.auditor')} value={audit.auditorName} onCommit={(v) => updateAudit(audit.id, { auditorName: v.trim() })} />
      <TextField label={t('audit.participants')} hint={t('audit.participantsHint')} multiline
        value={audit.participants.join('\n')}
        onCommit={(v) => updateAudit(audit.id, { participants: v.split('\n').map((x) => x.trim()).filter(Boolean) })} />
    </details>
  );
}
