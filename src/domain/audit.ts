import type { Workbench, WorkbenchAudit } from './types';

export interface AuditProgress {
  total: number;
  done: number;
  inProgress: number;
  remaining: number;
}

/** Avancement de l'audit sur les établis actifs. */
export function auditProgress(workbenches: Workbench[], wbAudits: WorkbenchAudit[]): AuditProgress {
  const active = workbenches.filter((w) => w.active);
  const byWb = new Map(wbAudits.map((w) => [w.workbenchId, w]));
  let done = 0;
  let inProgress = 0;
  for (const w of active) {
    const s = byWb.get(w.id)?.status;
    if (s === 'done') done++;
    else if (s === 'in_progress') inProgress++;
  }
  return { total: active.length, done, inProgress, remaining: active.length - done };
}

/** Prochain établi actif à auditer après `currentId` (dans l'ordre), en sautant ceux qui sont terminés. */
export function nextWorkbenchId(
  workbenches: Workbench[],
  wbAudits: WorkbenchAudit[],
  currentId?: string,
): string | undefined {
  const active = [...workbenches].filter((w) => w.active).sort((a, b) => a.order - b.order);
  const done = new Set(wbAudits.filter((w) => w.status === 'done').map((w) => w.workbenchId));
  const start = currentId ? active.findIndex((w) => w.id === currentId) + 1 : 0;
  const rotated = [...active.slice(start), ...active.slice(0, start)];
  return rotated.find((w) => w.id !== currentId && !done.has(w.id))?.id;
}

/** Durée lisible : « 45 s », « 12 min », « 1 h 05 ». */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

export function durationMs(start?: string, end?: string, now = Date.now()): number {
  if (!start) return 0;
  return (end ? Date.parse(end) : now) - Date.parse(start);
}
