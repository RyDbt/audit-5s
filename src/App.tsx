import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSeeded, requestPersistentStorage } from './data/db';
import { I18nContext, translate } from './i18n';
import { SettingsContext } from './ui/settingsContext';
import { Layout } from './ui/components/Layout';
import { Home, Placeholder } from './ui/screens/Home';
import { SettingsMenu } from './ui/screens/settings/SettingsMenu';
import { GeneralSettings } from './ui/screens/settings/GeneralSettings';
import { WorkbenchEdit, WorkbenchList } from './ui/screens/settings/Workbenches';
import { Categories } from './ui/screens/settings/Categories';
import { Severities } from './ui/screens/settings/Severities';

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
    requestPersistentStorage().catch(() => undefined);
  }, []);
  const settings = useLiveQuery(() => (ready ? db.settings.get('singleton') : undefined), [ready]);
  const lang = settings?.uiLang ?? 'fr';
  const i18n = useMemo(() => ({ lang, t: (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(lang, k, v) }), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!settings) return <div className="splash">5S</div>;

  return (
    <SettingsContext.Provider value={settings}>
      <I18nContext.Provider value={i18n}>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="actions" element={<Placeholder titleKey="nav.actions" />} />
              <Route path="report" element={<Placeholder titleKey="nav.report" />} />
              <Route path="trends" element={<Placeholder titleKey="nav.trends" />} />
              <Route path="settings" element={<SettingsMenu />} />
              <Route path="settings/general" element={<GeneralSettings />} />
              <Route path="settings/workbenches" element={<WorkbenchList />} />
              <Route path="settings/workbenches/:id" element={<WorkbenchEdit />} />
              <Route path="settings/categories" element={<Categories />} />
              <Route path="settings/severities" element={<Severities />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </HashRouter>
      </I18nContext.Provider>
    </SettingsContext.Provider>
  );
}
