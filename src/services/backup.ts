// Sauvegarde complète dans un seul fichier .zip, et restauration.
// Contenu : manifest.json, data.json (toutes les tables), photos/<id>.jpg et photos/<id>.thumb.jpg
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { db, SCHEMA_VERSION, type AuditDB } from '../data/db';
import type { BackupManifest, Photo } from '../domain/types';

const TABLES = [
  'settings', 'workbenches', 'categories', 'severities', 'audits',
  'workbenchAudits', 'findings', 'actions', 'problemSolvings',
] as const;
type TableName = (typeof TABLES)[number];
type PhotoMeta = Omit<Photo, 'blob' | 'thumb'>;
type BackupData = Record<TableName, unknown[]> & { photos: PhotoMeta[] };

export class BackupError extends Error {
  constructor(public code: 'invalid' | 'tooNew') {
    super(code);
  }
}

async function blobToBytes(b: Blob): Promise<Uint8Array> {
  if (typeof b.arrayBuffer === 'function') return new Uint8Array(await b.arrayBuffer());
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(b);
  });
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `audit-5s-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.zip`;
}

/** Construit le fichier de sauvegarde (zip) de toute la base. */
export async function exportBackup(d: AuditDB = db, now = new Date()): Promise<{ bytes: Uint8Array; manifest: BackupManifest }> {
  const data = {} as BackupData;
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    data[t] = await d.table(t).toArray();
    counts[t] = data[t].length;
  }
  const files: Zippable = {};
  const photos = await d.photos.toArray();
  data.photos = [];
  for (const p of photos) {
    const { blob, thumb, ...meta } = p;
    data.photos.push(meta);
    files[`photos/${p.id}.jpg`] = [await blobToBytes(blob), { level: 0 }];
    files[`photos/${p.id}.thumb.jpg`] = [await blobToBytes(thumb), { level: 0 }];
  }
  counts.photos = photos.length;
  const manifest: BackupManifest = { app: '5s-audit', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), counts };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  files['data.json'] = strToU8(JSON.stringify(data));
  return { bytes: zipSync(files, { level: 6 }), manifest };
}

export interface ParsedBackup {
  manifest: BackupManifest;
  data: BackupData;
  files: Record<string, Uint8Array>;
}

/** Lit et vérifie un fichier de sauvegarde sans rien modifier. */
export async function readBackup(file: Blob): Promise<ParsedBackup> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(await blobToBytes(file));
  } catch {
    throw new BackupError('invalid');
  }
  const m = files['manifest.json'];
  const dj = files['data.json'];
  if (!m || !dj) throw new BackupError('invalid');
  let manifest: BackupManifest;
  let data: BackupData;
  try {
    manifest = JSON.parse(strFromU8(m));
    data = JSON.parse(strFromU8(dj));
  } catch {
    throw new BackupError('invalid');
  }
  if (manifest.app !== '5s-audit' || !Array.isArray(data.settings) || !Array.isArray(data.photos)) {
    throw new BackupError('invalid');
  }
  if (manifest.schemaVersion > SCHEMA_VERSION) throw new BackupError('tooNew');
  for (const p of data.photos) {
    if (!files[`photos/${p.id}.jpg`] || !files[`photos/${p.id}.thumb.jpg`]) throw new BackupError('invalid');
  }
  return { manifest, data, files };
}

/** Remplace toutes les données de la base par celles de la sauvegarde. */
export async function restoreBackup(parsed: ParsedBackup, d: AuditDB = db): Promise<void> {
  const { data, files } = parsed;
  const tables = [...TABLES.map((t) => d.table(t)), d.photos];
  await d.transaction('rw', tables, async () => {
    for (const t of tables) await t.clear();
    for (const t of TABLES) if (Array.isArray(data[t])) await d.table(t).bulkAdd(data[t]);
    const photos: Photo[] = data.photos.map((meta) => ({
      ...meta,
      blob: new Blob([files[`photos/${meta.id}.jpg`] as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
      thumb: new Blob([files[`photos/${meta.id}.thumb.jpg`] as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
    }));
    await d.photos.bulkAdd(photos);
  });
}

/** Partage le fichier (menu Android : e-mail, Drive, Teams…) ou, à défaut, le télécharge. */
export async function shareOrDownload(bytes: Uint8Array, name: string, type: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([bytes as Uint8Array<ArrayBuffer>], name, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
