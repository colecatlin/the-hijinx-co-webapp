import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, LayoutGrid, User } from 'lucide-react';
import { clearTabScrollCache } from '@/hooks/useTabKeepAlive';

/**
 * Mobile-only bottom tab navigation.
 * Visible only on viewports < 1024px (`lg:hidden`).
 * Padded with env(safe-area-inset-bottom) to clear iOS notches / home indicators.
 *
 * Double-tap the active tab: resets the active route to its root (stripping
 * query/hash) and scrolls to the top — the familiar mobile "tap to go home"
 * gesture.
 */
const TABS = [
  { name: 'Home', to: '/Home', icon: Home },
  { name: 'Directory', to: '/DriverDirectory', icon: Compass },
  { name: 'Dashboard', to: '/MyDashboard', icon: LayoutGrid },
  { name: 'Profile', to: '/Profile', icon: User },
];

const DOUBLE_TAP_MS = 300;

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const lastTap = useRef(0);

  const isActive = (to) => {
    const path = to.replace(/^\//, '');
    return pathname === to || pathname === `/${path}`;
  };

  const handleTap = (to) => {
    const now = Date.now();
    if (isActive(to) && now - lastTap.current < DOUBLE_TAP_MS) {
      // Double-tap on the active tab: reset to root (clearing the cached
      // scroll offset for that tab) + scroll top.
      clearTabScrollCache(to);
      navigate(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    // Let the <Link> handle the single-tap navigation.
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] flex items-stretch justify-around"
      style={{
        background: 'hsl(var(--surface) / 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(var(--divider))',
        boxShadow: '0 -8px 32px hsl(0 0% 0% / 0.5)',
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
            onClick={() => handleTap(to)}
            aria-label={name}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
            style={{ color: active ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))' }}
          >
            <Icon
              className="w-5 h-5"
              style={{ filter: active ? 'drop-shadow(0 0 8px hsl(var(--motion) / 0.5))' : 'none' }}
            />
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase">{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}