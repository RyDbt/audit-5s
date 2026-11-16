// Seule couche qui écrit dans IndexedDB pour les réglages.
import { db, type AuditDB } from './db';
import type { Category, ChecklistQuestion, SeverityLevel, Settings, Workbench } from '../domain/types';
import { DEFAULT_CHECKLIST } from '../domain/defaults';
import { newId } from '../domain/id';

export async function getSettings(d: AuditDB = db): Promise<Settings> {
  const s = await d.settings.get('singleton');
  if (!s) throw new Error('Settings not initialised');
  return s;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>, d: AuditDB = db) {
  await d.settings.update('singleton', patch);
}

// ---------- Établis ----------

export async function addWorkbench(d: AuditDB = db): Promise<Workbench> {
  const all = await d.workbenches.toArray();
  const order = all.reduce((m, w) => Math.max(m, w.order), -1) + 1;
  const wb: Workbench = {
    id: newId(),
    name: `Line ${all.length + 1}`,
    zone: '',
    checklist: cloneChecklist(DEFAULT_CHECKLIST),
    active: true,
    order,
  };
  await d.workbenches.add(wb);
  return wb;
}

export async function updateWorkbench(id: string, patch: Partial<Omit<Workbench, 'id'>>, d: AuditDB = db) {
  await d.workbenches.update(id, patch);
}

/** Supprime un établi seulement s'il n'a jamais été audité ; sinon l'archive. */
export async function removeWorkbench(id: string, d: AuditDB = db): Promise<'deleted' | 'archived'> {
  return d.transaction('rw', [d.workbenches, d.workbenchAudits, d.photos], async () => {
    const used = await d.workbenchAudits.where('workbenchId').equals(id).count();
    if (used > 0) {
      await d.workbenches.update(id, { active: false });
      return 'archived';
    }
    const wb = await d.workbenches.get(id);
    if (wb?.referencePhotoId) await d.photos.delete(wb.referencePhotoId);
    await d.workbenches.delete(id);
    return 'deleted';
  });
}

export async function setReferencePhoto(workbenchId: string, photoId: string | undefined, d: AuditDB = db) {
  await d.transaction('rw', [d.workbenches, d.photos], async () => {
    const wb = await d.workbenches.get(workbenchId);
    if (!wb) return;
    if (wb.referencePhotoId && wb.referencePhotoId !== photoId) await d.photos.delete(wb.referencePhotoId);
    await d.workbenches.update(workbenchId, { referencePhotoId: photoId });
  });
}

export function cloneChecklist(list: ChecklistQuestion[]): ChecklistQuestion[] {
  return list.map((q) => ({ ...q, text: { ...q.text } }));
}

/** Copie la checklist d'un établi vers tous les autres. */
export async function copyChecklistToAll(fromId: string, d: AuditDB = db): Promise<number> {
  return d.transaction('rw', d.workbenches, async () => {
    const src = await d.workbenches.get(fromId);
    if (!src) return 0;
    const others = (await d.workbenches.toArray()).filter((w) => w.id !== fromId);
    for (const w of others) await d.workbenches.update(w.id, { checklist: cloneChecklist(src.checklist) });
    return others.length;
  });
}

export async function moveItem(table: 'workbenches' | 'categories', id: string, dir: -1 | 1, d: AuditDB = db) {
  const t = d[table] as unknown as import('dexie').Table<{ id: string; order: number }, string>;
  await d.transaction('rw', t, async () => {
    const list = (await t.toArray()).sort((a, b) => a.order - b.order);
    const i = list.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await Promise.all(list.map((x, k) => t.update(x.id, { order: k })));
  });
}

// ---------- Catégories ----------

export async function addCategory(d: AuditDB = db): Promise<Category> {
  const all = await d.categories.toArray();
  const c: Category = {
    id: newId(),
    label: { fr: 'Nouvelle catégorie', en: 'New category', de: 'Neue Kategorie' },
    s: 'seiton',
    active: true,
    order: all.reduce((m, x) => Math.max(m, x.order), -1) + 1,
  };
  await d.categories.add(c);
  return c;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>, d: AuditDB = db) {
  await d.categories.update(id, patch);
}

/** Supprime une catégorie jamais utilisée ; sinon la désactive (historique conservé). */
export async function removeCategory(id: string, d: AuditDB = db): Promise<'deleted' | 'archived'> {
  return d.transaction('rw', [d.categories, d.findings], async () => {
    const used = await d.findings.where('categoryId').equals(id).count();
    if (used > 0) {
      await d.categories.update(id, { active: false });
      return 'archived';
    }
    await d.categories.delete(id);
    return 'deleted';
  });
}

// ---------- Gravités ----------

export async function addSeverity(d: AuditDB = db): Promise<SeverityLevel> {
  const all = await d.severities.toArray();
  const s: SeverityLevel = {
    id: newId(),
    code: 'custom',
    label: { fr: 'Nouvelle gravité', en: 'New severity', de: 'Neuer Schweregrad' },
    color: '#0ea5e9',
    rank: all.reduce((m, x) => Math.max(m, x.rank), 0) + 1,
  };
  await d.severities.add(s);
  return s;
}

export async function updateSeverity(id: string, patch: Partial<Omit<SeverityLevel, 'id'>>, d: AuditDB = db) {
  await d.severities.update(id, patch);
}

/** Refuse la suppression d'une gravité déjà utilisée. */
export async function removeSeverity(id: string, d: AuditDB = db): Promise<boolean> {
  return d.transaction('rw', [d.severities, d.findings, d.categories], async () => {
    const used = await d.findings.filter((f) => f.severityId === id).count();
    if (used > 0) return false;
    await d.severities.delete(id);
    const cats = await d.categories.filter((c) => c.defaultSeverityId === id).toArray();
    for (const c of cats) await d.categories.update(c.id, { defaultSeverityId: undefined });
    return true;
  });
}
