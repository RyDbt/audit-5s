import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../../data/db';
import {
  addWorkbench, cloneChecklist, copyChecklistToAll, moveItem, removeWorkbench,
  setReferencePhoto, updateWorkbench,
} from '../../../data/repo';
import { useI18n } from '../../../i18n';
import { Header } from '../../components/Layout';
import { TextField } from '../../components/fields';
import { LocalizedField } from '../../components/LocalizedField';
import { PhotoCaptureButton, PhotoView } from '../../components/photos';
import { S_KEYS, type ChecklistQuestion, type SKey, type Workbench } from '../../../domain/types';
import { newId } from '../../../domain/id';

export function WorkbenchList() {
  const { t } = useI18n();
  const nav = useNavigate();
  const list = useLiveQuery(() => db.workbenches.orderBy('order').toArray(), []);
  if (!list) return null;
  return (
    <>
      <Header title={t('settings.workbenches')} back />
      <ul className="list">
        {list.map((w, i) => (
          <li key={w.id} className={`list-item ${w.active ? '' : 'archived'}`}>
            <Link to={w.id} className="list-main">
              {w.referencePhotoId ? <PhotoView id={w.referencePhotoId} thumb className="thumb" /> : <div className="thumb photo-placeholder">📷</div>}
              <div>
                <div className="strong">{w.name}</div>
                <div className="small muted">
                  {[w.zone, t('wb.checklist', { n: w.checklist.length }), w.active ? '' : t('common.archived')].filter(Boolean).join(' · ')}
                </div>
              </div>
            </Link>
            <div className="reorder">
              <button type="button" className="btn btn-ghost" disabled={i === 0} aria-label={t('common.up')}
                onClick={() => moveItem('workbenches', w.id, -1)}>▲</button>
              <button type="button" className="btn btn-ghost" disabled={i === list.length - 1} aria-label={t('common.down')}
                onClick={() => moveItem('workbenches', w.id, 1)}>▼</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="bottom-actions">
        <button type="button" className="btn btn-primary btn-big"
          onClick={async () => nav((await addWorkbench()).id)}>＋ {t('wb.new')}</button>
      </div>
    </>
  );
}

export function WorkbenchEdit() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const nav = useNavigate();
  const wb = useLiveQuery(() => db.workbenches.get(id), [id]);
  const [info, setInfo] = useState<string>();
  if (!wb) return null;

  const upd = (patch: Partial<Workbench>) => updateWorkbench(wb.id, patch);
  const setQuestions = (checklist: ChecklistQuestion[]) => upd({ checklist });
  const updQ = (qid: string, patch: Partial<ChecklistQuestion>) =>
    setQuestions(wb.checklist.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  const moveQ = (i: number, dir: -1 | 1) => {
    const l = cloneChecklist(wb.checklist);
    const j = i + dir;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    setQuestions(l);
  };

  return (
    <>
      <Header title={wb.name} back />
      {!wb.active && (
        <section className="card notice">
          {t('wb.archivedInfo')}{' '}
          <button type="button" className="btn" onClick={() => upd({ active: true })}>{t('wb.reactivate')}</button>
        </section>
      )}
      <section className="card form">
        <TextField label={t('wb.name')} value={wb.name} onCommit={(v) => upd({ name: v.trim() || wb.name })} />
        <TextField label={t('wb.zone')} value={wb.zone} onCommit={(v) => upd({ zone: v.trim() })} />
      </section>

      <section className="card">
        <h2>{t('wb.referencePhoto')}</h2>
        {wb.referencePhotoId && <PhotoView id={wb.referencePhotoId} className="ref-photo" />}
        <PhotoCaptureButton kind="reference" label={wb.referencePhotoId ? t('wb.replacePhoto') : t('wb.takePhoto')}
          onSaved={(p) => setReferencePhoto(wb.id, p.id)} />
        {wb.referencePhotoId && (
          <button type="button" className="btn btn-ghost" onClick={() => setReferencePhoto(wb.id, undefined)}>
            {t('wb.removePhoto')}
          </button>
        )}
      </section>

      <section className="card">
        <h2>{t('wb.checklist', { n: wb.checklist.length })}</h2>
        <p className="small muted">{t('wb.checklistAdvice')}</p>
        <ol className="questions">
          {wb.checklist.map((q, i) => (
            <li key={q.id} className="question">
              <LocalizedField value={q.text} placeholder={t('wb.questionPlaceholder')} multiline
                onCommit={(text) => updQ(q.id, { text })} />
              <div className="row">
                <select aria-label={t('cat.s')} value={q.s} className="grow"
                  onChange={(e) => updQ(q.id, { s: e.target.value as SKey })}>
                  {S_KEYS.map((s) => <option key={s} value={s}>{t(`s.${s}`)}</option>)}
                </select>
                <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => moveQ(i, -1)} aria-label={t('common.up')}>▲</button>
                <button type="button" className="btn btn-ghost" disabled={i === wb.checklist.length - 1} onClick={() => moveQ(i, 1)} aria-label={t('common.down')}>▼</button>
                <button type="button" className="btn btn-danger" onClick={() => setQuestions(wb.checklist.filter((x) => x.id !== q.id))}
                  aria-label={t('common.delete')}>🗑</button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-big"
          onClick={() => setQuestions([...wb.checklist, { id: newId(), s: 'seiton', text: {} }])}>
          ＋ {t('wb.addQuestion')}
        </button>
        <button type="button" className="btn btn-big"
          onClick={async () => {
            if (!confirm(t('wb.copyConfirm'))) return;
            const n = await copyChecklistToAll(wb.id);
            setInfo(t('wb.copied', { n }));
          }}>
          ⧉ {t('wb.copyChecklist')}
        </button>
        {info && <div className="success">{info}</div>}
      </section>

      <section className="card">
        <button type="button" className="btn btn-danger btn-big"
          onClick={async () => {
            if (!confirm(t('common.confirmDelete'))) return;
            const r = await removeWorkbench(wb.id);
            if (r === 'deleted') nav(-1);
          }}>
          {t('common.delete')}
        </button>
      </section>
    </>
  );
}
