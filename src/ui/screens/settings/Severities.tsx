import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../../data/db';
import { addSeverity, removeSeverity, updateSeverity } from '../../../data/repo';
import { useI18n } from '../../../i18n';
import { Header } from '../../components/Layout';
import { LocalizedField } from '../../components/LocalizedField';

export function Severities() {
  const { t } = useI18n();
  const sevs = useLiveQuery(() => db.severities.orderBy('rank').toArray(), []);
  const [msg, setMsg] = useState<string>();
  if (!sevs) return null;
  return (
    <>
      <Header title={t('settings.severities')} back />
      {msg && <div className="card notice">{msg}</div>}
      {sevs.map((s) => (
        <section key={s.id} className="card form" style={{ borderLeft: `8px solid ${s.color}` }}>
          <LocalizedField label={t('sev.label')} value={s.label} onCommit={(label) => updateSeverity(s.id, { label })} />
          <div className="row row-end">
            <label className="toggle">
              {t('sev.color')}
              <input type="color" value={s.color} onChange={(e) => updateSeverity(s.id, { color: e.target.value })} />
            </label>
            <button type="button" className="btn btn-danger" onClick={async () => {
              if (!confirm(t('common.confirmDelete'))) return;
              setMsg((await removeSeverity(s.id)) ? undefined : t('sev.inUse'));
            }}>{t('common.delete')}</button>
          </div>
        </section>
      ))}
      <div className="bottom-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={() => addSeverity()}>＋ {t('sev.new')}</button>
      </div>
    </>
  );
}
