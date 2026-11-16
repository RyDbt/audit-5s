import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../../data/db';
import { addCategory, moveItem, removeCategory, updateCategory } from '../../../data/repo';
import { useI18n } from '../../../i18n';
import { Header } from '../../components/Layout';
import { SelectField } from '../../components/fields';
import { LocalizedField } from '../../components/LocalizedField';
import { S_KEYS, type SKey } from '../../../domain/types';
import { loc } from '../../../domain/localize';

export function Categories() {
  const { t, lang } = useI18n();
  const cats = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
  const sevs = useLiveQuery(() => db.severities.orderBy('rank').toArray(), []);
  const [msg, setMsg] = useState<string>();
  if (!cats || !sevs) return null;

  return (
    <>
      <Header title={t('settings.categories')} back />
      <p className="small muted pad">{t('cat.translations')}</p>
      {msg && <div className="card notice">{msg}</div>}
      {cats.map((c, i) => (
        <section key={c.id} className={`card form ${c.active ? '' : 'archived'}`}>
          <LocalizedField label={t('cat.label')} value={c.label} onCommit={(label) => updateCategory(c.id, { label })} />
          <SelectField label={t('cat.s')} value={c.s}
            options={S_KEYS.map((s) => ({ value: s, label: t(`s.${s}`) }))}
            onChange={(s: SKey) => updateCategory(c.id, { s })} />
          <SelectField label={t('cat.defaultSeverity')} value={c.defaultSeverityId ?? ''}
            options={[{ value: '', label: t('cat.none') }, ...sevs.map((s) => ({ value: s.id, label: loc(s.label, lang) }))]}
            onChange={(v) => updateCategory(c.id, { defaultSeverityId: v || undefined })} />
          <div className="row row-end">
            <label className="toggle">
              <input type="checkbox" checked={c.active} onChange={(e) => updateCategory(c.id, { active: e.target.checked })} />
              {t('common.active')}
            </label>
            <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => moveItem('categories', c.id, -1)} aria-label={t('common.up')}>▲</button>
            <button type="button" className="btn btn-ghost" disabled={i === cats.length - 1} onClick={() => moveItem('categories', c.id, 1)} aria-label={t('common.down')}>▼</button>
            <button type="button" className="btn btn-danger" onClick={async () => {
              if (!confirm(t('common.confirmDelete'))) return;
              const r = await removeCategory(c.id);
              setMsg(r === 'archived' ? t('cat.archivedInfo') : undefined);
            }}>{t('common.delete')}</button>
          </div>
        </section>
      ))}
      <div className="bottom-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={() => addCategory()}>＋ {t('cat.new')}</button>
      </div>
    </>
  );
}
