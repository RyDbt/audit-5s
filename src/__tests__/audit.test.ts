import { AuditDB, ensureSeeded } from '../data/db';
import {
  addFinding, answerRemainingYes, closeAudit, completeWorkbenchAudit, deleteFinding, markCompliant,
  openWorkbenchAudit, setAnswer, startAudit, unansweredCount, updateFinding,
} from '../data/auditRepo';
import { updateSettings } from '../data/repo';
import { auditProgress, formatDuration, nextWorkbenchId } from '../domain/audit';
import { defaultWorkbenches } from '../domain/defaults';
import type { WorkbenchAudit } from '../domain/types';

let d: AuditDB;
let n = 0;
beforeEach(async () => {
  d = new AuditDB(`audit-test-${n++}`);
  await ensureSeeded(d);
  await updateSettings({ auditorName: 'Auditeur', defaultParticipants: ['Manager A'], defaultActionDueDays: 7, defaultActionOwner: 'Team leader' }, d);
});
afterEach(() => d.delete());

const FRIDAY = new Date(2026, 10, 13, 9, 0); // vendredi 13/11/2026, semaine 46

describe('startAudit', () => {
  it('creates one audit per ISO week with frozen auditor and participants', async () => {
    const a = await startAudit(FRIDAY, d);
    expect(a).toMatchObject({ isoYear: 2026, isoWeek: 46, date: '2026-11-13', status: 'in_progress', auditorName: 'Auditeur', participants: ['Manager A'] });
    const again = await startAudit(new Date(2026, 10, 12), d); // jeudi, même semaine
    expect(again.id).toBe(a.id);
    expect(await d.audits.count()).toBe(1);
    const next = await startAudit(new Date(2026, 10, 20), d);
    expect(next.isoWeek).toBe(47);
  });
});

describe('checklist and score', () => {
  it('computes the score from answers and freezes question text', async () => {
    const a = await startAudit(FRIDAY, d);
    const wa = await openWorkbenchAudit(a.id, 'wb-1', d);
    expect((await openWorkbenchAudit(a.id, 'wb-1', d)).id).toBe(wa.id);
    expect(await unansweredCount(wa.id, d)).toBe(8);
    await setAnswer(wa.id, 'q-seiri-1', 'no', d);
    await setAnswer(wa.id, 'q-seiri-1', 'yes', d); // changement d'avis
    await setAnswer(wa.id, 'q-seiso-1', 'no', d);
    await answerRemainingYes(wa.id, d);
    const after = (await d.workbenchAudits.get(wa.id))!;
    expect(after.answers).toHaveLength(8);
    expect(after.scorePct).toBe(88); // 7/8
    expect(after.answers.find((x) => x.questionId === 'q-seiso-1')?.text.fr).toContain('propres');
    await completeWorkbenchAudit(wa.id, d);
    expect((await d.workbenchAudits.get(wa.id))?.status).toBe('done');
  });

  it('marks a workbench compliant only without deviations', async () => {
    const a = await startAudit(FRIDAY, d);
    const wa1 = await openWorkbenchAudit(a.id, 'wb-1', d);
    expect(await markCompliant(wa1.id, d)).toBe(true);
    expect(await d.workbenchAudits.get(wa1.id)).toMatchObject({ scorePct: 100, markedCompliant: true, status: 'done' });

    const wa2 = await openWorkbenchAudit(a.id, 'wb-2', d);
    await addFinding(wa2.id, { type: 'improvement', photoIds: [] }, d);
    expect(await markCompliant(wa2.id, d)).toBe(true); // une amélioration n'empêche pas « conforme »
    await addFinding(wa2.id, { type: 'deviation', categoryId: 'cat-ppe', severityId: 'sev-minor', photoIds: [] }, d);
    expect((await d.workbenchAudits.get(wa2.id))?.markedCompliant).toBe(false);
    expect(await markCompliant(wa2.id, d)).toBe(false);
  });
});

describe('findings and actions', () => {
  it('creates an action with default owner and due date for each finding', async () => {
    const a = await startAudit(FRIDAY, d);
    const wa = await openWorkbenchAudit(a.id, 'wb-6', d);
    const { finding, action } = await addFinding(wa.id, {
      type: 'deviation', categoryId: 'cat-unprotected', severityId: 'sev-quality', comment: '  Écran ouvert  ', photoIds: ['p1', 'p2', 'p3'],
    }, d);
    expect(finding).toMatchObject({ workbenchId: 'wb-6', auditId: a.id, comment: 'Écran ouvert', photoIds: ['p1', 'p2', 'p3'] });
    expect(action).toMatchObject({ findingId: finding.id, owner: 'Team leader', dueDate: '2026-11-20', status: 'open', categoryId: 'cat-unprotected', recurrenceCount: 0 });
  });

  it('rejects a deviation without category or severity', async () => {
    const a = await startAudit(FRIDAY, d);
    const wa = await openWorkbenchAudit(a.id, 'wb-1', d);
    await expect(addFinding(wa.id, { type: 'deviation', severityId: 'sev-minor', photoIds: [] }, d)).rejects.toThrow('missingCategory');
    await expect(addFinding(wa.id, { type: 'deviation', categoryId: 'cat-ppe', photoIds: [] }, d)).rejects.toThrow('missingSeverity');
  });

  it('updates a finding, removing dropped photos, and deletes it with its action and photos', async () => {
    const a = await startAudit(FRIDAY, d);
    const wa = await openWorkbenchAudit(a.id, 'wb-1', d);
    const blob = new Blob(['x']);
    for (const id of ['p1', 'p2']) await d.photos.add({ id, kind: 'finding', blob, thumb: blob, width: 1, height: 1, takenAt: '' });
    const { finding } = await addFinding(wa.id, { type: 'deviation', categoryId: 'cat-ppe', severityId: 'sev-minor', photoIds: ['p1', 'p2'] }, d);
    await updateFinding(finding.id, { type: 'deviation', categoryId: 'cat-dirt', severityId: 'sev-minor', photoIds: ['p2'] }, d);
    expect(await d.photos.get('p1')).toBeUndefined();
    expect((await d.actions.where('findingId').equals(finding.id).first())?.categoryId).toBe('cat-dirt');
    await deleteFinding(finding.id, d);
    expect(await d.findings.count()).toBe(0);
    expect(await d.actions.count()).toBe(0);
    expect(await d.photos.count()).toBe(0);
  });
});

describe('progress helpers', () => {
  const wbs = defaultWorkbenches(4);
  const wa = (workbenchId: string, status: WorkbenchAudit['status']): WorkbenchAudit =>
    ({ id: workbenchId, auditId: 'a', workbenchId, status, markedCompliant: false, answers: [] });

  it('counts done and remaining active workbenches', () => {
    const list = [{ ...wbs[3], active: false }, ...wbs.slice(0, 3)];
    expect(auditProgress(list, [wa('wb-1', 'done'), wa('wb-2', 'in_progress'), wa('wb-4', 'done')]))
      .toEqual({ total: 3, done: 1, inProgress: 1, remaining: 2 });
  });

  it('finds the next workbench to audit, wrapping around', () => {
    const done = [wa('wb-2', 'done'), wa('wb-3', 'done')];
    expect(nextWorkbenchId(wbs, done, 'wb-1')).toBe('wb-4');
    expect(nextWorkbenchId(wbs, done, 'wb-4')).toBe('wb-1');
    expect(nextWorkbenchId(wbs, [...done, wa('wb-1', 'done'), wa('wb-4', 'done')], 'wb-4')).toBeUndefined();
  });

  it('formats durations', () => {
    expect(formatDuration(45_000)).toBe('45 s');
    expect(formatDuration(12 * 60_000)).toBe('12 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05');
  });

  it('closes an audit', async () => {
    const a = await startAudit(FRIDAY, d);
    await closeAudit(a.id, d, new Date(2026, 10, 13, 10, 30));
    expect((await d.audits.get(a.id))?.status).toBe('closed');
  });
});
