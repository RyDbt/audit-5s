import { forwardRef, useImperativeHandle, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../data/db';
import {
  addFinding, deleteFinding, discardPhotos, updateFinding, validateFinding, type FindingInput,
} from '../../../data/auditRepo';
import type { Finding, FindingType } from '../../../domain/types';
import { loc } from '../../../domain/localize';
import { useI18n } from '../../../i18n';
import { NoFacesReminder, PhotoView, useCamera } from '../../components/photos';

export interface FindingSheetHandle {
  /** Ouvre un nouveau constat ; avec `camera`, l'appareil photo s'ouvre immédiatement. */
  startNew: (camera: boolean) => void;
  edit: (f: Finding) => void;
}

interface Draft extends FindingInput {
  id?: string;
  /** Photos prises pendant cette saisie (supprimées si on abandonne) */
  added: string[];
}

const EMPTY: Draft = { type: 'deviation', photoIds: [], added: [] };

/** Saisie rapide d'un constat, en plein écran, pensée pour une main. */
export const FindingSheet = forwardRef<FindingSheetHandle, { waId: string }>(function FindingSheet({ waId }, ref) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string>();
  const cats = useLiveQuery(() => db.categories.orderBy('order').filter((c) => c.active).toArray(), []);
  const sevs = useLiveQuery(() => db.severities.orderBy('rank').toArray(), []);

  const cam = useCamera('finding', (p) =>
    setDraft((d) => (d ? { ...d, photoIds: [...d.photoIds, p.id], added: [...d.added, p.id] } : d)));

  useImperativeHandle(ref, () => ({
    startNew: (camera) => {
      setError(undefined);
      setDraft({ ...EMPTY });
      if (camera) cam.open();
    },
    edit: (f) => {
      setError(undefined);
      setDraft({ id: f.id, type: f.type, categoryId: f.categoryId, severityId: f.severityId, comment: f.comment, photoIds: [...f.photoIds], added: [] });
    },
  }));

  // L'input de l'appareil photo reste toujours monté au même endroit :
  // il est ouvert avant l'affichage du formulaire et doit recevoir la photo ensuite.
  if (!draft) return <>{cam.element}</>;

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const pickCategory = (id: string) => {
    const c = cats?.find((x) => x.id === id);
    const same = draft.categoryId === id;
    set({
      categoryId: same && draft.type === 'improvement' ? undefined : id,
      severityId: draft.severityId && draft.id ? draft.severityId : (c?.defaultSeverityId ?? draft.severityId),
    });
  };
  const setType = (type: FindingType) => set({ type });

  const close = () => setDraft(null);
  const cancel = async () => {
    if (draft.added.length > 0) {
      if (!confirm(t('finding.cancelConfirm'))) return;
      await discardPhotos(draft.added);
    }
    close();
  };
  const save = async () => {
    const input: FindingInput = { type: draft.type, categoryId: draft.categoryId, severityId: draft.severityId, comment: draft.comment, photoIds: draft.photoIds };
    const err = validateFinding(input);
    if (err) return setError(t(err === 'missingCategory' ? 'finding.missingCategory' : 'finding.missingSeverity'));
    if (draft.id) await updateFinding(draft.id, input);
    else await addFinding(waId, input);
    close();
  };
  const remove = async () => {
    if (!draft.id || !confirm(t('common.confirmDelete'))) return;
    await deleteFinding(draft.id);
    close();
  };
  const removePhoto = async (id: string) => {
    // Une photo ajoutée pendant cette saisie est supprimée tout de suite ; les autres à l'enregistrement.
    if (draft.added.includes(id)) await discardPhotos([id]);
    set({ photoIds: draft.photoIds.filter((p) => p !== id), added: draft.added.filter((p) => p !== id) });
  };

  return (
    <>
    {cam.element}
    <div className="sheet" role="dialog" aria-label={draft.id ? t('finding.edit') : t('finding.new')}>
      <header className="sheet-header">
        <button type="button" className="btn btn-ghost" onClick={cancel}>✕ {t('common.cancel')}</button>
        <h2>{draft.id ? t('finding.edit') : t('finding.new')}</h2>
      </header>
      <div className="sheet-body">
        <div className="segmented">
          {(['deviation', 'improvement'] as const).map((ty) => (
            <button key={ty} type="button" className={draft.type === ty ? `on ${ty}` : ''} onClick={() => setType(ty)}>
              {ty === 'deviation' ? `⚠️ ${t('finding.deviation')}` : `💡 ${t('finding.improvement')}`}
            </button>
          ))}
        </div>

        <h3>{t('finding.photos', { n: draft.photoIds.length })}</h3>
        <NoFacesReminder />
        <div className="photo-strip">
          {draft.photoIds.map((id) => (
            <div key={id} className="photo-tile">
              <PhotoView id={id} thumb />
              <button type="button" className="photo-remove" aria-label={t('finding.removePhoto')} onClick={() => removePhoto(id)}>✕</button>
            </div>
          ))}
          <button type="button" className="photo-tile photo-add" disabled={cam.busy} onClick={cam.open} aria-label={t('finding.addPhoto')}>
            {cam.busy ? '…' : '📷＋'}
          </button>
        </div>
        {cam.error && <div className="error">{t('photo.error')}</div>}

        <h3>{t('finding.category')}</h3>
        <div className="chip-grid">
          {cats?.map((c) => (
            <button key={c.id} type="button" className={`chip ${draft.categoryId === c.id ? 'on' : ''}`} onClick={() => pickCategory(c.id)}>
              {loc(c.label, lang)}
            </button>
          ))}
        </div>

        {draft.type === 'deviation' && (
          <>
            <h3>{t('finding.severity')}</h3>
            <div className="sev-row">
              {sevs?.map((s) => (
                <button key={s.id} type="button" className={`sev ${draft.severityId === s.id ? 'on' : ''}`}
                  style={{ ['--sev' as string]: s.color }} onClick={() => set({ severityId: s.id })}>
                  {loc(s.label, lang)}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="field">
          <span className="field-label">{t('finding.comment')}</span>
          <textarea rows={2} value={draft.comment ?? ''} placeholder={t('finding.commentPlaceholder')}
            onChange={(e) => set({ comment: e.target.value })} />
        </label>

        {draft.id && (
          <button type="button" className="btn btn-danger btn-big" onClick={remove}>🗑 {t('finding.delete')}</button>
        )}
      </div>
      <footer className="sheet-footer">
        {error && <div className="error">{error}</div>}
        <button type="button" className="btn btn-primary btn-big" onClick={save} disabled={cam.busy}>✓ {t('finding.save')}</button>
      </footer>
    </div>
    </>
  );
});
