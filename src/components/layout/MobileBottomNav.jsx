import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, LayoutGrid, User } from 'lucide-react';

/**
 * Mobile-only bottom tab navigation.
 * Visible only on viewports < 1024px (`lg:hidden`).
 * Padded with env(safe-area-inset-bottom) to clear iOS notches / home indicators.
 */
const TABS = [
  { name: 'Home', to: '/Home', icon: Home },
  { name: 'Directory', to: '/DriverDirectory', icon: Compass },
  { name: 'Dashboard', to: '/MyDashboard', icon: LayoutGrid },
  { name: 'Profile', to: '/Profile', icon: User },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  const isActive = (to) => {
    const path = to.replace(/^\//, '');
    return pathname === to || pathname === `/${path}`;
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] flex items-stretch justify-around"
      style={{
        background: 'rgba(5, 8, 10, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {TABS.map(({ name, to, icon: Icon }) => {
        const active = isActive(to);
        return (
          <Link
            key={name}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
            style={{ color: active ? '#1DA1A1' : 'rgba(255,255,255,0.45)' }}
          >
            <Icon
              className="w-5 h-5"
              style={{ filter: active ? 'drop-shadow(0 0 8px rgba(29,161,161,0.5))' : 'none' }}
            />
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase">{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}