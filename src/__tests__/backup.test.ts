// @vitest-environment node
// (Blob natif de Node : jsdom ne sait pas cloner les Blob dans IndexedDB)
import { AuditDB, ensureSeeded } from '../data/db';
import { addFinding, openWorkbenchAudit, startAudit } from '../data/auditRepo';
import { updateSettings } from '../data/repo';
import { BackupError, exportBackup, readBackup, restoreBackup } from '../services/backup';
import { strToU8, zipSync } from 'fflate';

let n = 0;
const fresh = async () => {
  const d = new AuditDB(`backup-test-${n++}`);
  await ensureSeeded(d);
  return d;
};
const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

describe('backup', () => {
  it('round-trips every table and photo into another database', async () => {
    const src = await fresh();
    await updateSettings({ siteName: 'Site X' }, src);
    const a = await startAudit(new Date(2026, 10, 13), src);
    const wa = await openWorkbenchAudit(a.id, 'wb-2', src);
    const jpg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    await src.photos.add({ id: 'ph1', kind: 'finding', blob: new Blob([jpg], { type: 'image/jpeg' }), thumb: new Blob([jpg.slice(0, 3)]), width: 1280, height: 960, takenAt: '2026-11-13T09:00:00.000Z' });
    await addFinding(wa.id, { type: 'deviation', categoryId: 'cat-tool-missing', severityId: 'sev-quality', photoIds: ['ph1'], comment: 'Bit 18 mm' }, src);

    const { bytes, manifest } = await exportBackup(src);
    expect(manifest.counts).toMatchObject({ audits: 1, findings: 1, actions: 1, photos: 1, workbenches: 12 });

    const dst = await fresh();
    await updateSettings({ siteName: 'Autre' }, dst);
    await dst.workbenches.clear();
    await restoreBackup(await readBackup(new Blob([bytes as Uint8Array<ArrayBuffer>])), dst);

    expect((await dst.settings.get('singleton'))?.siteName).toBe('Site X');
    expect(await dst.workbenches.count()).toBe(12);
    expect((await dst.findings.toArray())[0]).toMatchObject({ comment: 'Bit 18 mm', photoIds: ['ph1'] });
    expect(await dst.actions.count()).toBe(1);
    const ph = (await dst.photos.get('ph1'))!;
    expect(ph).toMatchObject({ width: 1280, kind: 'finding' });
    expect(Array.from(await bytesOf(ph.blob))).toEqual(Array.from(jpg));
    expect(Array.from(await bytesOf(ph.thumb))).toEqual([0xff, 0xd8, 1]);
    await src.delete();
    await dst.delete();
  });

  it('rejects files that are not backups, or from a newer version', async () => {
    await expect(readBackup(new Blob(['hello']))).rejects.toBeInstanceOf(BackupError);
    const other = zipSync({ 'manifest.json': strToU8('{"app":"other"}'), 'data.json': strToU8('{"settings":[],"photos":[]}') });
    await expect(readBackup(new Blob([other]))).rejects.toMatchObject({ code: 'invalid' });
    const newer = zipSync({ 'manifest.json': strToU8('{"app":"5s-audit","schemaVersion":999}'), 'data.json': strToU8('{"settings":[],"photos":[]}') });
    await expect(readBackup(new Blob([newer]))).rejects.toMatchObject({ code: 'tooNew' });
  });
});
