import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useSettings } from '../settingsContext';
import { isoWeek, weekLabel } from '../../domain/dates';
import { Header } from '../components/Layout';

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export function Home() {
  const { t, lang } = useI18n();
  const s = useSettings();
  const { isoYear, isoWeek: w } = isoWeek(new Date());
  const [storage, setStorage] = useState<{ used?: number; persisted?: boolean }>({});

  useEffect(() => {
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setStorage({ used: est?.usage, persisted });
    })().catch(() => undefined);
  }, []);

  const prefix = lang === 'de' ? 'KW' : lang === 'fr' ? 'S' : 'W';
  return (
    <>
      <Header title={s.siteName ? `${t('app.title')} — ${s.siteName}` : t('app.title')} />
      <section className="card hero">
        <div className="hero-week">{weekLabel(isoYear, w, prefix)}</div>
        <div className="muted">{new Date().toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <button type="button" className="btn btn-primary btn-big" disabled>▶ {t('nav.audit')}</button>
        <div className="muted small">{t('common.comingSoon')}</div>
      </section>
      {(!s.siteName || !s.auditorName) && (
        <Link to="/settings/general" className="card notice">⚙️ {t('home.setupHint')}</Link>
      )}
      <section className="card small muted">
        <div>📴 {t('home.offline')}</div>
        {storage.used !== undefined && <div>💾 {t('home.storage', { used: formatBytes(storage.used) })}</div>}
        {storage.persisted !== undefined && (
          <div>{storage.persisted ? `🔒 ${t('home.persisted')}` : `⚠️ ${t('home.notPersisted')}`}</div>
        )}
      </section>
    </>
  );
}

export function Placeholder({ titleKey }: { titleKey: 'nav.actions' | 'nav.report' | 'nav.trends' }) {
  const { t } = useI18n();
  return (
    <>
      <Header title={t(titleKey)} />
      <section className="card muted">{t('common.comingSoon')}</section>
    </>
  );
}
