import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../data/db';
import {
  answerRemainingYes, completeWorkbenchAudit, markCompliant, openWorkbenchAudit,
  reopenWorkbenchAudit, setAnswer, unansweredCount,
} from '../../../data/auditRepo';
import { durationMs, formatDuration, nextWorkbenchId } from '../../../domain/audit';
import { loc } from '../../../domain/localize';
import type { Finding } from '../../../domain/types';
import { useI18n } from '../../../i18n';
import { Header } from '../../components/Layout';
import { PhotoView, PhotoZoom } from '../../components/photos';
import { useNow } from '../../hooks';
import { FindingSheet, type FindingSheetHandle } from './FindingSheet';

export function WorkbenchAuditScreen() {
  const { auditId = '', wbId = '' } = useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const sheet = useRef<FindingSheetHandle>(null);
  const [zoom, setZoom] = useState<string>();
  const [msg, setMsg] = useState<string>();
  const now = useNow();

  const [waId, setWaId] = useState<string>();
  const audit = useLiveQuery(() => db.audits.get(auditId), [auditId]);
  const wb = useLiveQuery(() => db.workbenches.get(wbId), [wbId]);
  const wa = useLiveQuery(() => (waId ? db.workbenchAudits.get(waId) : undefined), [waId]);
  const findings = useLiveQuery(() => (waId ? db.findings.where('workbenchAuditId').equals(waId).sortBy('createdAt') : []), [waId]);
  const cats = useLiveQuery(() => db.categories.toArray(), []);
  const sevs = useLiveQuery(() => db.severities.toArray(), []);

  const readOnly = audit?.status === 'closed';

  useEffect(() => {
    setMsg(undefined);
    if (!audit) return;
    if (readOnly) {
      db.workbenchAudits.where('[auditId+workbenchId]').equals([auditId, wbId]).first().then((x) => setWaId(x?.id));
    } else {
      openWorkbenchAudit(auditId, wbId).then((x) => setWaId(x.id));
    }
  }, [auditId, wbId, !!audit, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!audit || !wb) return null;

  const catLabel = (id?: string) => loc(cats?.find((c) => c.id === id)?.label, lang);
  const sev = (id?: string) => sevs?.find((s) => s.id === id);
  const answers = new Map(wa?.answers.map((a) => [a.questionId, a.answer]));
  const answeredCount = wb.checklist.filter((q) => answers.has(q.id)).length;
  const deviations = findings?.filter((f) => f.type === 'deviation').length ?? 0;
  const done = wa?.status === 'done';

  const goNext = async () => {
    const [wbs, was] = await Promise.all([db.workbenches.toArray(), db.workbenchAudits.where('auditId').equals(auditId).toArray()]);
    const next = nextWorkbenchId(wbs, was, wbId);
    nav(next ? `/audit/${auditId}/wb/${next}` : `/audit/${auditId}`, { replace: true });
  };

  const finish = async () => {
    if (!wa) return;
    const missing = await unansweredCount(wa.id);
    if (missing > 0) {
      if (!confirm(t('wba.unansweredConfirm', { n: missing }))) return;
      await answerRemainingYes(wa.id);
    }
    await completeWorkbenchAudit(wa.id);
    await goNext();
  };

  const compliant = async () => {
    if (!wa) return;
    if (await markCompliant(wa.id)) await goNext();
    else setMsg(t('wba.compliantRefused'));
  };

  const findingRow = (f: Finding) => {
    const s = sev(f.severityId);
    return (
      <li key={f.id}>
        <button type="button" className="finding-row" disabled={readOnly} onClick={() => sheet.current?.edit(f)}>
          {f.photoIds[0] ? <PhotoView id={f.photoIds[0]} thumb className="thumb" /> : <div className="thumb photo-placeholder">—</div>}
          <div className="finding-text">
            <div className="strong">
              {f.type === 'improvement' ? `💡 ${t('finding.improvement')}` : catLabel(f.categoryId)}
              {f.type === 'improvement' && f.categoryId ? ` · ${catLabel(f.categoryId)}` : ''}
            </div>
            <div className="small muted">
              {s && <span className="sev-dot" style={{ background: s.color }} />} {s ? loc(s.label, lang) : ''}
              {f.photoIds.length > 1 ? ` · 📷 ${f.photoIds.length}` : ''}
            </div>
            {f.comment && <div className="small">{f.comment}</div>}
          </div>
        </button>
      </li>
    );
  };

  return (
    <>
      <Header title={wb.name} back />
      <div className="wb-meta small muted">
        {[wb.zone, wa?.startedAt ? t('wba.time', { time: formatDuration(durationMs(wa.startedAt, wa.completedAt, now)) }) : '']
          .filter(Boolean).join(' · ')}
        {done && <span className="badge done"> ✓ {wa?.markedCompliant ? t('audit.compliantBadge') : t('wba.done')}</span>}
      </div>
      {readOnly && <section className="card notice">{t('wba.closedAudit')}</section>}

      <section className="card ref-card">
        {wb.referencePhotoId ? (
          <PhotoView id={wb.referencePhotoId} thumb className="ref-thumb" onClick={() => setZoom(wb.referencePhotoId)} />
        ) : (
          <div className="ref-thumb photo-placeholder">📷</div>
        )}
        <div>
          <div className="strong">{t('wba.reference')}</div>
          {!wb.referencePhotoId && <div className="small muted">{t('wba.noReference')}</div>}
        </div>
      </section>

      <section className="card">
        <h2>{t('wba.findings', { n: findings?.length ?? 0 })}</h2>
        <ul className="findings">{findings?.map(findingRow)}</ul>
        {!readOnly && (
          <div className="row add-finding">
            <button type="button" className="btn btn-primary btn-big grow" onClick={() => sheet.current?.startNew(true)}>
              📷 ＋ {t('wba.addFinding')}
            </button>
            <button type="button" className="btn btn-big no-photo" onClick={() => sheet.current?.startNew(false)} aria-label={t('finding.new')}>
              ✎
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="row">
          <h2 className="grow">{t('wba.checklist')}</h2>
          {answeredCount < wb.checklist.length
            ? <span className="small muted">{t('wba.answered', { n: answeredCount, total: wb.checklist.length })}</span>
            : wa?.scorePct !== undefined && <span className="score">{t('wba.score', { score: wa.scorePct })}</span>}
        </div>
        <ol className="checklist">
          {wb.checklist.map((q) => {
            const a = answers.get(q.id);
            return (
              <li key={q.id}>
                <span className="q-text">{loc(q.text, lang)}</span>
                <div className="yesno">
                  <button type="button" className={a === 'yes' ? 'on yes' : ''} disabled={readOnly || !wa}
                    onClick={() => wa && setAnswer(wa.id, q.id, 'yes')}>{t('wba.yes')}</button>
                  <button type="button" className={a === 'no' ? 'on no' : ''} disabled={readOnly || !wa}
                    onClick={() => wa && setAnswer(wa.id, q.id, 'no')}>{t('wba.no')}</button>
                </div>
              </li>
            );
          })}
        </ol>
        {!readOnly && answeredCount < wb.checklist.length && (
          <button type="button" className="btn" onClick={() => wa && answerRemainingYes(wa.id)}>{t('wba.remainingYes')}</button>
        )}
      </section>

      {msg && <section className="card error">{msg}</section>}

      {!readOnly && (
        <div className="bottom-actions">
          {done ? (
            <div className="row">
              <button type="button" className="btn btn-big grow" onClick={() => wa && reopenWorkbenchAudit(wa.id)}>{t('wba.edit')}</button>
              <button type="button" className="btn btn-primary btn-big grow" onClick={goNext}>→</button>
            </div>
          ) : (
            <div className="row">
              {deviations === 0 && (
                <button type="button" className="btn btn-success btn-big grow" onClick={compliant}>✓ {t('wba.compliant')}</button>
              )}
              <button type="button" className="btn btn-primary btn-big grow" onClick={finish}>{t('wba.finishNext')}</button>
            </div>
          )}
        </div>
      )}

      {waId && <FindingSheet ref={sheet} waId={waId} />}
      {zoom && <PhotoZoom id={zoom} onClose={() => setZoom(undefined)} />}
    </>
  );
}
