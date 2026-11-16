import { createContext, useContext } from 'react';
import type { Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/defaults';

export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);
export const useSettings = () => useContext(SettingsContext);
