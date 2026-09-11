import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Search, LayoutGrid, Menu } from 'lucide-react';
import { clearTabScrollCache } from '@/hooks/useTabKeepAlive';
import { useNavigationConfig } from '@/hooks/useNavigationConfig';
import { resolveMobileBottomNav } from '@/lib/navResolver';

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

const ICON_REGISTRY = {
  home: Home,
  directory: Compass,
  search: Search,
  dashboard: LayoutGrid,
  menu: Menu,
};

// Hardcoded fallback — matches the current mobile bottom nav exactly.
// Used when NavigationSettings is unavailable (loading, error, no record).
const FALLBACK_MOBILE_ITEMS = [
  { id: 'fb_home', label: 'Home', type: 'route', _href: '/', icon_key: 'home', auth_only: false, emphasized: false },
  { id: 'fb_directory', label: 'Directory', type: 'route', _href: '/Directory', icon_key: 'directory', auth_only: false, emphasized: false },
  { id: 'fb_search', label: 'Search', type: 'search', icon_key: 'search', auth_only: false, emphasized: true },
  { id: 'fb_dashboard', label: 'Dashboard', type: 'route', _href: '/MyDashboard', icon_key: 'dashboard', auth_only: true, emphasized: false },
  { id: 'fb_menu', label: 'Menu', type: 'menu', icon_key: 'menu', auth_only: false, emphasized: false },
];

export default function MobileBottomNav({ isAuthenticated, onOpenSearch, onOpenMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const lastTap = useRef(0);

  // Managed navigation — falls back to hardcoded if unavailable
  const { config: navConfig } = useNavigationConfig();
  const managedMobile = resolveMobileBottomNav(navConfig);
  const mobileItems = managedMobile || FALLBACK_MOBILE_ITEMS;

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

  const renderContentTab = (name, to, Icon, key) => {
    const active = isActive(to);
    return (
      <Link
        key={key || name}
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

  const renderActionTab = (name, Icon, onClick, emphasized, key) => (
    <button
      key={key || name}
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
      {mobileItems.map((item) => {
        if (item.type === 'route') {
          if (item.auth_only && !isAuthenticated) {
            return <div key={item.id} className="flex-1" aria-hidden="true" />;
          }
          const Icon = ICON_REGISTRY[item.icon_key] || Home;
          return renderContentTab(item.label, item._href, Icon, item.id);
        }
        if (item.type === 'search') {
          const Icon = ICON_REGISTRY[item.icon_key] || Search;
          return renderActionTab(item.label, Icon, onOpenSearch, item.emphasized, item.id);
        }
        if (item.type === 'menu') {
          const Icon = ICON_REGISTRY[item.icon_key] || Menu;
          return renderActionTab(item.label, Icon, onOpenMenu, item.emphasized, item.id);
        }
        return null;
      })}
    </nav>
  );
}