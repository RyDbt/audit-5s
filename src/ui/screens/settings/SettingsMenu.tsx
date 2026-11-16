import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { Header } from '../../components/Layout';

export function SettingsMenu() {
  const { t } = useI18n();
  const items = [
    { to: 'general', icon: '🏭', label: t('settings.general') },
    { to: 'workbenches', icon: '🛠️', label: t('settings.workbenches') },
    { to: 'categories', icon: '🏷️', label: t('settings.categories') },
    { to: 'severities', icon: '⚠️', label: t('settings.severities') },
    { to: 'backup', icon: '💾', label: t('settings.backup') },
  ];
  return (
    <>
      <Header title={t('nav.settings')} />
      <nav className="menu">
        {items.map((i) => (
          <Link key={i.to} to={i.to} className="menu-item">
            <span aria-hidden>{i.icon}</span> {i.label} <span className="chevron">›</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
