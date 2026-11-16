import Dexie, { type Table } from 'dexie';
import type {
  Action, Audit, Category, Finding, Photo, ProblemSolving,
  SeverityLevel, Settings, Workbench, WorkbenchAudit,
} from '../domain/types';
import {
  DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_SEVERITIES, defaultWorkbenches,
} from '../domain/defaults';

export const SCHEMA_VERSION = 1;

export class AuditDB extends Dexie {
  settings!: Table<Settings, string>;
  workbenches!: Table<Workbench, string>;
  categories!: Table<Category, string>;
  severities!: Table<SeverityLevel, string>;
  audits!: Table<Audit, string>;
  workbenchAudits!: Table<WorkbenchAudit, string>;
  findings!: Table<Finding, string>;
  actions!: Table<Action, string>;
  problemSolvings!: Table<ProblemSolving, string>;
  photos!: Table<Photo, string>;

  constructor(name = 'audit-5s') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      settings: 'id',
      workbenches: 'id, order',
      categories: 'id, order',
      severities: 'id, rank',
      audits: 'id, [isoYear+isoWeek], date, status',
      workbenchAudits: 'id, auditId, workbenchId, [auditId+workbenchId]',
      findings: 'id, auditId, workbenchAuditId, workbenchId, categoryId, type',
      actions: 'id, findingId, workbenchId, status, categoryId',
      problemSolvings: 'id, [workbenchId+categoryId], status',
      photos: 'id, kind',
    });
  }
}

export const db = new AuditDB();

/** Remplit la base avec les valeurs par défaut au premier lancement. */
export async function ensureSeeded(d: AuditDB = db): Promise<void> {
  await d.transaction('rw', [d.settings, d.workbenches, d.categories, d.severities], async () => {
    if (await d.settings.get('singleton')) return;
    await d.settings.put({ ...DEFAULT_SETTINGS, uiLang: guessLang() });
    await d.severities.bulkPut(DEFAULT_SEVERITIES);
    await d.categories.bulkPut(DEFAULT_CATEGORIES);
    await d.workbenches.bulkPut(defaultWorkbenches());
  });
}

function guessLang(): Settings['uiLang'] {
  const l = (typeof navigator !== 'undefined' ? navigator.language : 'fr').slice(0, 2);
  return l === 'de' || l === 'en' ? l : 'fr';
}

/** Demande au navigateur de ne pas effacer les données en cas de manque de place. */
export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return undefined;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
