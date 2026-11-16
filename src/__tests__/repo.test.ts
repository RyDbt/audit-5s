import { AuditDB, ensureSeeded } from '../data/db';
import {
  addCategory, addWorkbench, copyChecklistToAll, getSettings, moveItem, removeCategory,
  removeSeverity, removeWorkbench, updateSettings, updateWorkbench,
} from '../data/repo';
import type { Finding, WorkbenchAudit } from '../domain/types';

let d: AuditDB;
let n = 0;
beforeEach(async () => {
  d = new AuditDB(`test-${n++}`);
  await ensureSeeded(d);
});
afterEach(async () => {
  await d.delete();
});

const wa = (workbenchId: string): WorkbenchAudit => ({
  id: 'wa1', auditId: 'a1', workbenchId, status: 'done', markedCompliant: false, answers: [],
});
const finding = (categoryId: string, severityId: string): Finding => ({
  id: 'f1', type: 'deviation', auditId: 'a1', workbenchAuditId: 'wa1', workbenchId: 'wb-1',
  categoryId, severityId, photoIds: [], createdAt: new Date().toISOString(),
});

describe('seed', () => {
  it('creates defaults once and keeps user changes', async () => {
    expect(await d.workbenches.count()).toBe(12);
    expect(await d.categories.count()).toBe(14);
    expect(await d.severities.count()).toBe(4);
    await updateSettings({ siteName: 'Site A' }, d);
    await d.workbenches.delete('wb-12');
    await ensureSeeded(d);
    expect((await getSettings(d)).siteName).toBe('Site A');
    expect(await d.workbenches.count()).toBe(11);
  });
});

describe('workbenches', () => {
  it('adds a workbench at the end with the default checklist', async () => {
    const wb = await addWorkbench(d);
    expect(wb.order).toBe(12);
    expect(wb.checklist.length).toBe(8);
  });

  it('deletes an unused workbench but archives an audited one', async () => {
    expect(await removeWorkbench('wb-1', d)).toBe('deleted');
    await d.workbenchAudits.add(wa('wb-2'));
    expect(await removeWorkbench('wb-2', d)).toBe('archived');
    expect((await d.workbenches.get('wb-2'))?.active).toBe(false);
  });

  it('copies a checklist to every other workbench', async () => {
    await updateWorkbench('wb-3', { checklist: [{ id: 'x', s: 'seiso', text: { fr: 'Propre ?' } }] }, d);
    expect(await copyChecklistToAll('wb-3', d)).toBe(11);
    const wb7 = await d.workbenches.get('wb-7');
    expect(wb7?.checklist).toEqual([{ id: 'x', s: 'seiso', text: { fr: 'Propre ?' } }]);
  });

  it('reorders workbenches', async () => {
    await moveItem('workbenches', 'wb-2', -1, d);
    const order = (await d.workbenches.orderBy('order').toArray()).map((w) => w.id);
    expect(order.slice(0, 3)).toEqual(['wb-2', 'wb-1', 'wb-3']);
    await moveItem('workbenches', 'wb-2', -1, d); // déjà en tête : rien ne change
    expect((await d.workbenches.orderBy('order').first())?.id).toBe('wb-2');
  });
});

describe('categories and severities', () => {
  it('archives a category in use, deletes an unused one', async () => {
    const c = await addCategory(d);
    expect(await removeCategory(c.id, d)).toBe('deleted');
    await d.findings.add(finding('cat-ppe', 'sev-minor'));
    expect(await removeCategory('cat-ppe', d)).toBe('archived');
    expect((await d.categories.get('cat-ppe'))?.active).toBe(false);
  });

  it('refuses to delete a severity in use and clears category defaults otherwise', async () => {
    await d.findings.add(finding('cat-ppe', 'sev-minor'));
    expect(await removeSeverity('sev-minor', d)).toBe(false);
    expect(await removeSeverity('sev-safety', d)).toBe(true);
    expect((await d.categories.get('cat-chemical'))?.defaultSeverityId).toBeUndefined();
  });
});
