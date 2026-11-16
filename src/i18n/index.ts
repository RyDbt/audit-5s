import { createContext, useContext } from 'react';
import type { Lang } from '../domain/types';
import { fr, type DictKey } from './fr';
import { en } from './en';
import { de } from './de';

export const DICTS = { fr, en, de } as const;
export type { DictKey };

export function translate(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  let s: string = DICTS[lang][key] ?? fr[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export interface I18n {
  lang: Lang;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18n>({ lang: 'fr', t: (k, v) => translate('fr', k, v) });
export const useI18n = () => useContext(I18nContext);
