import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../lib/auth';

import { Icon, type IconName } from './Icon';
import { Button, cx } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  superOnly?: boolean;
}

const NAV: (NavItem | { heading: string })[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
  { heading: 'Content' },
  { to: '/admin/stars', label: '14 Stars', icon: 'star' },
  { to: '/admin/stories', label: 'Stories', icon: 'book' },
  { to: '/admin/audio', label: 'Audio', icon: 'music' },
  { to: '/admin/duas', label: 'Du’as', icon: 'heart' },
  { to: '/admin/games', label: 'Games', icon: 'game' },
  { to: '/admin/daily-star', label: 'Daily Star', icon: 'sparkles' },
  { to: '/admin/quizzes', label: 'Quizzes', icon: 'help' },
  { to: '/admin/good-deeds', label: 'Good Deeds', icon: 'ribbon' },
  { to: '/admin/reflections', label: 'Reflections', icon: 'chat' },
  { to: '/admin/wisdom', label: 'Wisdom', icon: 'bulb' },
  { to: '/admin/characters', label: 'Characters', icon: 'happy' },
  { heading: 'Library & setup' },
  { to: '/admin/media', label: 'Media Library', icon: 'image' },
  { to: '/admin/categories', label: 'Categories', icon: 'tags' },
  { to: '/admin/languages', label: 'Languages', icon: 'language' },
  { to: '/admin/users', label: 'Users', icon: 'people', superOnly: true },
  { to: '/admin/activity', label: 'Activity Log', icon: 'pulse' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export function AdminLayout() {
  const { admin, isSuperAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="shell">
      <aside className={cx('sidebar', open && 'sidebar-open')}>
        <div className="brand">
          <img className="brand-mark" src="/favicon.png" alt="" />
          <div>
            <strong>14 Stars</strong>
            <span>Content Studio</span>
          </div>
        </div>
        <nav aria-label="Main">
          {NAV.map((item) =>
            'heading' in item ? (
              <div key={item.heading} className="nav-heading">
                {item.heading}
              </div>
            ) : item.superOnly && !isSuperAdmin ? null : (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('nav-item', isActive && 'nav-active')}>
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>
      {open ? <div className="scrim" onClick={() => setOpen(false)} /> : null}

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <div className="topbar-spacer" />
          <div className="topbar-user">
            <div className="avatar" aria-hidden="true">
              {(admin?.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="topbar-user-info">
              <strong>{admin?.email}</strong>
              <span>{isSuperAdmin ? 'Super admin' : 'Content admin'}</span>
            </div>
            <Button size="sm" icon="logout" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="content" id="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
