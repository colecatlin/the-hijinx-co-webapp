/**
 * RaceCoreLayout — Unified operational shell for all /racecore/* routes.
 * R8AO Recovery: dark full-viewport shell, persistent sidebar, mobile drawer.
 * Auth gate is kept page-level (RaceCoreDashboard owns its own auth logic).
 */
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import RaceCoreSidebar from '@/components/registrationdashboard/RaceCoreSidebar';
import RaceCoreQuickCreate from '@/components/registrationdashboard/RaceCoreQuickCreate';
import { getPermissionsForRole } from '@/components/access/accessControl';

export default function RaceCoreLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [announcerMode, setAnnouncerMode] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem('racecore:nav-collapsed-main') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('racecore:nav-collapsed-main', navCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [navCollapsed]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  // Minimal auth for sidebar permission context only
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    enabled: !!isAuthenticated,
  });

  const isAdmin = user?.role === 'admin';
  const dashboardPermissions = getPermissionsForRole(user?.role || 'public');

  // Layout-level auth guard — redirect unauthenticated users before any child route renders
  useEffect(() => {
    if (!authLoading && isAuthenticated === false) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [authLoading, isAuthenticated]);

  // Navigate to announcer pack when announcer mode toggled on
  useEffect(() => {
    if (announcerMode) {
      navigate('/racecore?tab=announcer_pack');
    }
  }, [announcerMode]);

  if (authLoading || isAuthenticated === false) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarProps = {
    dashboardPermissions,
    isAdmin,
    user,
    selectedEvent: null,
    onQuickCreate: () => setQuickCreateOpen(true),
    onCreateEvent: () => navigate('/racecore?tab=eventBuilder'),
    onMediaPortal: () => navigate('/racecore/media/applications'),
    announcerMode,
    onAnnouncerModeToggle: (val) => setAnnouncerMode(val),
    navCollapsed,
    onToggleNavCollapsed: () => setNavCollapsed(v => !v),
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0D0D' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <RaceCoreSidebar {...sidebarProps} />
      </div>

      {/* Mobile hamburger header strip */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 h-11 border-b"
        style={{ background: '#0F1212', borderColor: 'rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800/40 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="ml-3 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">
          RACECORE
        </span>
      </div>

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed top-0 left-0 bottom-0 z-50 lg:hidden flex flex-col"
              style={{ width: 224 }}
            >
              <div className="flex items-center justify-between px-3 h-11 border-b"
                style={{ background: '#0F1212', borderColor: 'rgba(255,255,255,0.07)' }}>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">RACECORE</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ background: '#0F1212' }}>
                <RaceCoreSidebar {...sidebarProps} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top offset spacer */}
        <div className="lg:hidden h-11 flex-shrink-0" />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>

      {/* Quick Create modal — available from any /racecore page */}
      {isAdmin && (
        <RaceCoreQuickCreate
          open={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          initialEntityType="Driver"
          onCreated={(type) => {
            queryClient.invalidateQueries({ queryKey: [type.toLowerCase() + 's'] });
          }}
        />
      )}
    </div>
  );
}