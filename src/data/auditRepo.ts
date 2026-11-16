// Écritures liées à l'audit : démarrage, checklist, constats et actions.
import { db, type AuditDB } from './db';
import type {
  Action, Audit, ChecklistAnswer, Finding, FindingType, WorkbenchAudit,
} from '../domain/types';
import { addDays, isoWeek, toISODate } from '../domain/dates';
import { checklistScore } from '../domain/score';
import { newId } from '../domain/id';
import { getSettings } from './repo';

/** Audit de la semaine de `date`, s'il existe. */
export async function findAuditForWeek(date: Date, d: AuditDB = db): Promise<Audit | undefined> {
  const { isoYear, isoWeek: w } = isoWeek(date);
  return d.audits.where('[isoYear+isoWeek]').equals([isoYear, w]).first();
}

/** Démarre l'audit de la semaine, ou renvoie celui qui existe déjà (un seul audit par semaine). */
export async function startAudit(date: Date = new Date(), d: AuditDB = db): Promise<Audit> {
  return d.transaction('rw', [d.audits, d.settings], async () => {
    const existing = await findAuditForWeek(date, d);
    if (existing) return existing;
    const s = await getSettings(d);
    const { isoYear, isoWeek: w } = isoWeek(date);
    const audit: Audit = {
      id: newId(),
      isoYear,
      isoWeek: w,
      date: toISODate(date),
      startedAt: date.toISOString(),
      status: 'in_progress',
      auditorName: s.auditorName,
      participants: [...s.defaultParticipants],
    };
    await d.audits.add(audit);
    return audit;
  });
}

export async function updateAudit(id: string, patch: Partial<Omit<Audit, 'id'>>, d: AuditDB = db) {
  await d.audits.update(id, patch);
}

export async function closeAudit(id: string, d: AuditDB = db, now = new Date()) {
  await d.audits.update(id, { status: 'closed', closedAt: now.toISOString() });
}

export async function reopenAudit(id: string, d: AuditDB = db) {
  await d.audits.update(id, { status: 'in_progress', closedAt: undefined });
}

/** Fiche d'audit d'un établi, créée à la première ouverture. */
export async function openWorkbenchAudit(auditId: string, workbenchId: string, d: AuditDB = db): Promise<WorkbenchAudit> {
  return d.transaction('rw', d.workbenchAudits, async () => {
    const existing = await d.workbenchAudits.where('[auditId+workbenchId]').equals([auditId, workbenchId]).first();
    if (existing) return existing;
    const wa: WorkbenchAudit = {
      id: newId(),
      auditId,
      workbenchId,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      markedCompliant: false,
      answers: [],
    };
    await d.workbenchAudits.add(wa);
    return wa;
  });
}

async function questionsOf(workbenchId: string, d: AuditDB) {
  const wb = await d.workbenches.get(workbenchId);
  if (!wb) throw new Error('Workbench not found');
  return wb.checklist;
}

/** Enregistre la réponse à une question (copie figée du texte) et recalcule le score. */
export async function setAnswer(waId: string, questionId: string, answer: 'yes' | 'no', d: AuditDB = db) {
  await d.transaction('rw', [d.workbenchAudits, d.workbenches], async () => {
    const wa = await d.workbenchAudits.get(waId);
    if (!wa) return;
    const q = (await questionsOf(wa.workbenchId, d)).find((x) => x.id === questionId);
    if (!q) return;
    const others = wa.answers.filter((a) => a.questionId !== questionId);
    const answers: ChecklistAnswer[] = [...others, { questionId, text: { ...q.text }, s: q.s, answer }];
    await d.workbenchAudits.update(waId, { answers, scorePct: checklistScore(answers), markedCompliant: false });
  });
}

/** Répond « oui » à toutes les questions encore sans réponse. */
export async function answerRemainingYes(waId: string, d: AuditDB = db) {
  await d.transaction('rw', [d.workbenchAudits, d.workbenches], async () => {
    const wa = await d.workbenchAudits.get(waId);
    if (!wa) return;
    const answered = new Set(wa.answers.map((a) => a.questionId));
    const added: ChecklistAnswer[] = (await questionsOf(wa.workbenchId, d))
      .filter((q) => !answered.has(q.id))
      .map((q) => ({ questionId: q.id, text: { ...q.text }, s: q.s, answer: 'yes' }));
    const answers = [...wa.answers, ...added];
    await d.workbenchAudits.update(waId, { answers, scorePct: checklistScore(answers) });
  });
}

/** Questions de la checklist actuelle de l'établi sans réponse. */
export async function unansweredCount(waId: string, d: AuditDB = db): Promise<number> {
  const wa = await d.workbenchAudits.get(waId);
  if (!wa) return 0;
  const answered = new Set(wa.answers.map((a) => a.questionId));
  return (await questionsOf(wa.workbenchId, d)).filter((q) => !answered.has(q.id)).length;
}

/**
 * « Conforme, rien à signaler » : toutes les réponses à oui, 100 %, établi terminé.
 * Refusé s'il existe déjà un écart sur l'établi pendant cet audit.
 */
export async function markCompliant(waId: string, d: AuditDB = db): Promise<boolean> {
  return d.transaction('rw', [d.workbenchAudits, d.workbenches, d.findings], async () => {
    const wa = await d.workbenchAudits.get(waId);
    if (!wa) return false;
    const deviations = await d.findings.where('workbenchAuditId').equals(waId).filter((f) => f.type === 'deviation').count();
    if (deviations > 0) return false;
    const answers: ChecklistAnswer[] = (await questionsOf(wa.workbenchId, d))
      .map((q) => ({ questionId: q.id, text: { ...q.text }, s: q.s, answer: 'yes' }));
    await d.workbenchAudits.update(waId, {
      answers, scorePct: checklistScore(answers) ?? 100, markedCompliant: true,
      status: 'done', completedAt: new Date().toISOString(),
    });
    return true;
  });
}

export async function completeWorkbenchAudit(waId: string, d: AuditDB = db) {
  const wa = await d.workbenchAudits.get(waId);
  await d.workbenchAudits.update(waId, {
    status: 'done',
    completedAt: wa?.completedAt ?? new Date().toISOString(),
    scorePct: wa ? checklistScore(wa.answers) : undefined,
  });
}

export async function reopenWorkbenchAudit(waId: string, d: AuditDB = db) {
  await d.workbenchAudits.update(waId, { status: 'in_progress', completedAt: undefined });
}

// ---------- Constats et actions ----------

export interface FindingInput {
  type: FindingType;
  categoryId?: string;
  severityId?: string;
  comment?: string;
  photoIds: string[];
}

export function validateFinding(f: FindingInput): 'missingCategory' | 'missingSeverity' | undefined {
  if (f.type === 'deviation' && !f.categoryId) return 'missingCategory';
  if (f.type === 'deviation' && !f.severityId) return 'missingSeverity';
  return undefined;
}

/** Ajoute un constat et crée automatiquement l'action associée. */
export async function addFinding(waId: string, input: FindingInput, d: AuditDB = db): Promise<{ finding: Finding; action: Action }> {
  const err = validateFinding(input);
  if (err) throw new Error(err);
  return d.transaction('rw', [d.workbenchAudits, d.findings, d.actions, d.audits, d.settings], async () => {
    const wa = await d.workbenchAudits.get(waId);
    if (!wa) throw new Error('WorkbenchAudit not found');
    const audit = await d.audits.get(wa.auditId);
    const s = await getSettings(d);
    const now = new Date().toISOString();
    const finding: Finding = {
      id: newId(),
      type: input.type,
      auditId: wa.auditId,
      workbenchAuditId: wa.id,
      workbenchId: wa.workbenchId,
      categoryId: input.categoryId,
      severityId: input.type === 'deviation' ? input.severityId : undefined,
      comment: input.comment?.trim() || undefined,
      photoIds: [...input.photoIds],
      createdAt: now,
    };
    const action: Action = {
      id: newId(),
      findingId: finding.id,
      workbenchId: wa.workbenchId,
      categoryId: input.categoryId,
      owner: s.defaultActionOwner,
      dueDate: addDays(audit?.date ?? now.slice(0, 10), s.defaultActionDueDays),
      status: 'open',
      createdAt: now,
      afterPhotoIds: [],
      recurrenceCount: 0,
    };
    await d.findings.add(finding);
    await d.actions.add(action);
    // Un écart annule le « conforme »
    if (wa.markedCompliant && input.type === 'deviation') {
      await d.workbenchAudits.update(wa.id, { markedCompliant: false });
    }
    return { finding, action };
  });
}

export async function updateFinding(id: string, input: FindingInput, d: AuditDB = db) {
  const err = validateFinding(input);
  if (err) throw new Error(err);
  await d.transaction('rw', [d.findings, d.actions, d.photos], async () => {
    const old = await d.findings.get(id);
    if (!old) return;
    const removed = old.photoIds.filter((p) => !input.photoIds.includes(p));
    await d.photos.bulkDelete(removed);
    await d.findings.update(id, {
      type: input.type,
      categoryId: input.categoryId,
      severityId: input.type === 'deviation' ? input.severityId : undefined,
      comment: input.comment?.trim() || undefined,
      photoIds: [...input.photoIds],
    });
    const actions = await d.actions.where('findingId').equals(id).toArray();
    for (const a of actions) await d.actions.update(a.id, { categoryId: input.categoryId });
  });
}

/** Supprime un constat, ses photos et son action. */
export async function deleteFinding(id: string, d: AuditDB = db) {
  await d.transaction('rw', [d.findings, d.actions, d.photos], async () => {
    const f = await d.findings.get(id);
    if (!f) return;
    const actions = await d.actions.where('findingId').equals(id).toArray();
    await d.photos.bulkDelete([...f.photoIds, ...actions.flatMap((a) => a.afterPhotoIds)]);
    await d.actions.bulkDelete(actions.map((a) => a.id));
    await d.findings.delete(id);
  });
}

/** Supprime des photos prises pour un constat finalement abandonné. */
export async function discardPhotos(ids: string[], d: AuditDB = db) {
  await d.photos.bulkDelete(ids);
}
