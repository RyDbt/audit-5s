import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';

export function Layout() {
  const { t } = useI18n();
  const items = [
    { to: '/', icon: '🏠', label: t('nav.home'), end: true },
    { to: '/actions', icon: '✅', label: t('nav.actions') },
    { to: '/report', icon: '📄', label: t('nav.report') },
    { to: '/trends', icon: '📈', label: t('nav.trends') },
    { to: '/settings', icon: '⚙️', label: t('nav.settings') },
  ];
  return (
    <div className="app">
      <main className="content"><Outlet /></main>
      <nav className="bottom-nav">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon" aria-hidden>{i.icon}</span>
            <span className="nav-label">{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Header({ title, back }: { title: ReactNode; back?: boolean }) {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <header className="header">
      {back && (
        <button type="button" className="btn btn-ghost header-back" onClick={() => nav(-1)} aria-label={t('common.back')}>
          ‹
        </button>
      )}
      <h1>{title}</h1>
    </header>
  );
}
