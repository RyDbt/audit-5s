import type { ISODate } from './types';

/** Semaine ISO 8601 (norme utilisée en Allemagne) d'une date locale. */
export function isoWeek(d: Date): { isoYear: number; isoWeek: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; // lundi = 1 ... dimanche = 7
  t.setUTCDate(t.getUTCDate() + 4 - day); // jeudi de la même semaine
  const isoYear = t.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return { isoYear, isoWeek: week };
}

/** Date locale → 'YYYY-MM-DD' (sans décalage de fuseau). */
export function toISODate(d: Date): ISODate {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Libellé court de semaine, ex. « KW 46 / 2026 » ou « S46 / 2026 » */
export function weekLabel(isoYear: number, week: number, prefix = 'W'): string {
  return `${prefix}${String(week).padStart(2, '0')} / ${isoYear}`;
}
