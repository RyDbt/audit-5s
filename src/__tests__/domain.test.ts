import { addDays, isoWeek, toISODate, weekLabel } from '../domain/dates';
import { checklistScore } from '../domain/score';
import { loc } from '../domain/localize';
import { fitWithin } from '../services/photo';
import { DEFAULT_CATEGORIES, DEFAULT_CHECKLIST, DEFAULT_SEVERITIES, defaultWorkbenches } from '../domain/defaults';
import { DICTS } from '../i18n';
import { S_KEYS, type ChecklistAnswer } from '../domain/types';

describe('isoWeek', () => {
  it.each([
    ['2026-11-13', 2026, 46], // le 5S walk du rapport existant
    ['2026-11-16', 2026, 47],
    ['2021-01-03', 2020, 53], // dimanche → dernière semaine de l'année précédente
    ['2024-12-30', 2025, 1], // lundi → semaine 1 de l'année suivante
    ['2026-01-01', 2026, 1],
  ])('%s → %i-W%i', (d, y, w) => {
    const [yy, mm, dd] = d.split('-').map(Number);
    expect(isoWeek(new Date(yy, mm - 1, dd))).toEqual({ isoYear: y, isoWeek: w });
  });

  it('formats dates and labels', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(weekLabel(2026, 6, 'KW')).toBe('KW06 / 2026');
  });
});

describe('checklistScore', () => {
  const a = (answer: 'yes' | 'no'): ChecklistAnswer => ({ questionId: 'q', text: {}, s: 'seiri', answer });
  it('computes the share of yes answers', () => {
    expect(checklistScore([a('yes'), a('yes'), a('no')])).toBe(67);
    expect(checklistScore([a('yes')])).toBe(100);
    expect(checklistScore([a('no'), a('no')])).toBe(0);
  });
  it('returns undefined without answers', () => expect(checklistScore([])).toBeUndefined());
});

describe('loc', () => {
  it('falls back to another language', () => {
    expect(loc({ fr: 'Bonjour', en: 'Hello' }, 'de')).toBe('Hello');
    expect(loc({ fr: 'Bonjour' }, 'de')).toBe('Bonjour');
    expect(loc({ de: 'Hallo', en: ' ' }, 'en')).toBe('Hallo');
    expect(loc(undefined, 'fr')).toBe('');
  });
});

describe('fitWithin', () => {
  it('keeps aspect ratio and never upscales', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});

describe('defaults', () => {
  it('provides consistent categories and severities', () => {
    const sevIds = new Set(DEFAULT_SEVERITIES.map((s) => s.id));
    expect(new Set(DEFAULT_CATEGORIES.map((c) => c.id)).size).toBe(DEFAULT_CATEGORIES.length);
    for (const c of DEFAULT_CATEGORIES) {
      expect(S_KEYS).toContain(c.s);
      expect(sevIds.has(c.defaultSeverityId!)).toBe(true);
      expect(c.label.fr && c.label.en && c.label.de).toBeTruthy();
    }
    expect(DEFAULT_SEVERITIES.map((s) => s.code)).toEqual(['minor', 'quality', 'esd', 'safety']);
  });
  it('provides 12 lines with a 5–10 question checklist covering every S', () => {
    const wbs = defaultWorkbenches();
    expect(wbs).toHaveLength(12);
    expect(wbs[0].name).toBe('Line 1');
    expect(DEFAULT_CHECKLIST.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_CHECKLIST.length).toBeLessThanOrEqual(10);
    expect(new Set(DEFAULT_CHECKLIST.map((q) => q.s))).toEqual(new Set(S_KEYS));
    // chaque établi a sa propre copie
    wbs[0].checklist[0].text.fr = 'modifié';
    expect(wbs[1].checklist[0].text.fr).not.toBe('modifié');
  });
});

describe('i18n', () => {
  it('has the same non-empty keys in fr, en and de', () => {
    const keys = Object.keys(DICTS.fr).sort();
    for (const d of [DICTS.en, DICTS.de]) {
      expect(Object.keys(d).sort()).toEqual(keys);
      for (const v of Object.values(d)) expect(v.trim()).not.toBe('');
    }
  });
});
