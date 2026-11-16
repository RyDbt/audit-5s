import type { Lang, Localized } from './types';

const FALLBACK: Lang[] = ['en', 'fr', 'de'];

/** Renvoie le libellé dans la langue demandée, sinon le premier disponible. */
export function loc(l: Localized | undefined, lang: Lang): string {
  if (!l) return '';
  const v = l[lang];
  if (v && v.trim()) return v;
  for (const f of FALLBACK) {
    const x = l[f];
    if (x && x.trim()) return x;
  }
  return '';
}
