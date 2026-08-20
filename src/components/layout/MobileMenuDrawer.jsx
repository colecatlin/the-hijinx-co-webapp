import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { LogOut, LayoutGrid, Shield } from 'lucide-react';

/**
 * Consolidated Menu bottom sheet for the mobile/tablet shell.
 * Holds the main site sections (from navItems), the user's Profile /
 * onboarding entry, the theme toggle, and auth actions (Login / Join /
 * Dashboard / Sign Out) plus Admin Tools for admins.
 */
export default function MobileMenuDrawer({
  open,
  onOpenChange,
  navItems,
  user,
  isAuthenticated,
  currentPageName,
}) {
  const navigate = useNavigate();

  const isActive = (page) => currentPageName === page;
  const close = () => onOpenChange(false);

  const handleLogout = () => {
    close();
    base44.auth.logout(createPageUrl('Home'));
  };

  const handleLogin = () => {
    close();
    base44.auth.redirectToLogin();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="lg:hidden" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))', maxHeight: '85vh' }}>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-xs font-bold tracking-[0.3em] uppercase text-center" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Menu
          </DrawerTitle>
          <DrawerDescription className="sr-only">Site navigation, profile, and account actions</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}>
          {/* Auth actions */}
          <div className="mb-4">
            {!isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleLogin}
                  className="py-3 text-sm font-bold rounded-lg transition-colors"
                  style={{ color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-interactive) / 0.4)' }}
                >
                  Login
                </button>
                <Link
                  to="/join"
                  onClick={close}
                  className="py-3 text-sm font-bold rounded-lg transition-colors text-center"
                  style={{ color: '#fff', background: 'hsl(var(--motion))' }}
                >
                  Join
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to={createPageUrl('MyDashboard')}
                  onClick={close}
                  className="flex items-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                  style={{ color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-interactive) / 0.4)' }}
                >
                  <LayoutGrid className="w-4 h-4" /> Dashboard
                </Link>
                <Link
                  to={createPageUrl('Profile')}
                  onClick={close}
                  className="block py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                  style={{ color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-interactive) / 0.4)' }}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-left py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                  style={{ color: 'hsl(var(--danger) / 0.85)', border: '1px solid hsl(var(--danger) / 0.2)', background: 'hsl(var(--danger) / 0.08)' }}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Site sections */}
          <nav>
            {navItems.map((item) => (
              <div key={item.name} style={{ borderBottom: '1px solid hsl(var(--divider) / 0.6)' }}>
                <Link
                  to={item.href || (item.page ? createPageUrl(item.page) : '#')}
                  onClick={close}
                  className="block py-3.5 text-base font-bold tracking-[0.1em] uppercase transition-colors"
                  style={{ color: isActive(item.page) ? 'hsl(var(--motion))' : 'hsl(var(--foreground-secondary))' }}
                >
                  {item.name}
                </Link>
                {item.sub && (
                  <div className="pl-3 pb-2">
                    {item.sub.map((sub) =>
                      sub.disabled ? (
                        <div key={sub.name} className="pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-[0.4em]" style={{ color: 'hsl(var(--foreground-quiet) / 0.5)' }}>
                          {sub.name.replace(/^— | —$/g, '')}
                        </div>
                      ) : (
                        <Link
                          key={sub.name}
                          to={sub.href || (sub.page ? createPageUrl(sub.page) : '#')}
                          onClick={close}
                          className="block py-2 text-sm transition-colors"
                          style={{ color: 'hsl(var(--foreground-quiet))' }}
                        >
                          {sub.name}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Admin tools */}
          {user?.role === 'admin' && (
            <Link
              to={createPageUrl('Management')}
              onClick={close}
              className="mt-4 flex items-center gap-2 py-3 px-4 text-sm font-bold rounded-lg transition-colors"
              style={{ color: 'hsl(var(--motion))', border: '1px solid hsl(var(--motion) / 0.3)', background: 'hsl(var(--motion) / 0.1)' }}
            >
              <Shield className="w-4 h-4" /> Admin Tools
            </Link>
          )}

          {/* Theme toggle */}
          <div className="mt-4 flex items-center justify-between py-3" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}>
            <span className="text-sm font-semibold tracking-[0.1em] uppercase" style={{ color: 'hsl(var(--foreground-secondary))' }}>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}