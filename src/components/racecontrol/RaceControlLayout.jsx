/**
 * REVISION R8G Part 2 — RaceControlLayout
 *
 * Layout wrapper for all /race-control/* routes.
 * Provides RaceControlProvider context to EventFile, RaceControlEvents,
 * and any future race-control route.
 *
 * This is a thin shell — no UI of its own.
 * RegistrationDashboard is NOT wrapped by this layout.
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { RaceControlProvider } from './RaceControlProvider';

export default function RaceControlLayout() {
  return (
    <RaceControlProvider>
      <Outlet />
    </RaceControlProvider>
  );
}