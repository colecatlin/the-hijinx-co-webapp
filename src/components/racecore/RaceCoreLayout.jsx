/**
 * RaceCoreLayout — Unified operational shell for all /racecore/* routes.
 * R8AO Recovery: dark full-viewport shell, persistent sidebar, mobile drawer.
 * Auth gate is kept page-level (RaceCoreDashboard owns its own auth logic).
 */
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import RaceCoreSidebar from '@/components/registrationdashboard/RaceCoreSidebar';
import { getPermissionsForRole } from '@/components/access/accessControl';

export default function RaceCoreLayout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Minimal auth for sidebar permission context only
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = user?.role === 'admin';
  const dashboardPermissions = getPermissionsForRole(user?.role || 'public');

  // RaceCoreSidebar in layout mode: href-based navigation only (no tab callbacks needed)
  const sidebarProps = {
    activeTab: null,
    onTabChange: () => {},
    dashboardPermissions,
    isAdmin,
    user,
    selectedEvent: null,
    onQuickCreate: () => {},
    onCreateEvent: () => {},
    onMediaPortal: () => {},
    announcerMode: false,
    onAnnouncerModeToggle: () => {},
    onImportEntries: () => {},
    onSyncTiming: () => {},
    onPublish: () => {},
    onExport: () => {},
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <RaceCoreSidebar {...sidebarProps} />
      </div>

      {/* Mobile hamburger header strip */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 h-11 border-b border-gray-800/70"
        style={{ background: '#0d0d0d' }}>
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
              style={{ width: 176 }}
            >
              <div className="flex items-center justify-between px-3 h-11 border-b border-gray-800/60"
                style={{ background: '#0d0d0d' }}>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">RACECORE</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ background: '#0d0d0d' }}>
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
    </div>
  );
}