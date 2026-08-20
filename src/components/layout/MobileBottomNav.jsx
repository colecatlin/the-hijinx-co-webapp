import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Search, LayoutGrid, Menu } from 'lucide-react';
import { clearTabScrollCache } from '@/hooks/useTabKeepAlive';

/**
 * Mobile/tablet bottom tab navigation (lg:hidden).
 *
 * Tabs: Home · Directory · Search (center, emphasized) · Dashboard (auth
 * only) · Menu (rightmost). Search and Menu are action tabs that open an
 * overlay / drawer rather than navigating. A spacer keeps Search visually
 * centered when the Dashboard tab is hidden for logged-out visitors.
 *
 * Double-tap the active content tab: resets the route to its root and
 * scrolls to the top — the familiar mobile "tap to go home" gesture.
 */
const DOUBLE_TAP_MS = 300;

export default function MobileBottomNav({ isAuthenticated, onOpenSearch, onOpenMenu }) {
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
      clearTabScrollCache(to);
      navigate(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  };

  const tabClass = "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors";

  const renderContentTab = (name, to, Icon) => {
    const active = isActive(to);
    return (
      <Link
        key={name}
        to={to}
        onClick={() => handleTap(to)}
        aria-label={name}
        className={tabClass}
        style={{ color: active ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))' }}
      >
        <Icon className="w-5 h-5" style={{ filter: active ? 'drop-shadow(0 0 8px hsl(var(--motion) / 0.5))' : 'none' }} />
        <span className="text-[9px] font-bold tracking-[0.12em] uppercase">{name}</span>
      </Link>
    );
  };

  const renderActionTab = (name, Icon, onClick, emphasized) => (
    <button
      key={name}
      onClick={onClick}
      aria-label={name}
      className={tabClass}
      style={{ color: emphasized ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))' }}
    >
      <span
        className="flex items-center justify-center w-11 h-11 -mt-5 rounded-full"
        style={{
          background: emphasized ? 'hsl(var(--motion))' : 'hsl(var(--surface-elevated))',
          border: emphasized ? 'none' : '1px solid hsl(var(--divider))',
          boxShadow: emphasized
            ? '0 4px 18px hsl(var(--motion) / 0.45)'
            : '0 4px 14px hsl(0 0% 0% / 0.35)',
          color: emphasized ? 'hsl(var(--canvas))' : 'hsl(var(--foreground-secondary))',
        }}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-[9px] font-bold tracking-[0.12em] uppercase mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>{name}</span>
    </button>
  );

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
      }}
    >
      {renderContentTab('Home', '/Home', Home)}
      {renderContentTab('Directory', '/Directory', Compass)}
      {renderActionTab('Search', Search, onOpenSearch, true)}
      {isAuthenticated
        ? renderContentTab('Dashboard', '/MyDashboard', LayoutGrid)
        : <div className="flex-1" aria-hidden="true" />}
      {renderActionTab('Menu', Menu, onOpenMenu, false)}
    </nav>
  );
}