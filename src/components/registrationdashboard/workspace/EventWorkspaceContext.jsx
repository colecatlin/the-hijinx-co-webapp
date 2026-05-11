/**
 * REVISION 7A — EventWorkspaceContext
 * Centralizes all event-workspace-scoped data into a single context.
 * This does NOT introduce new permission logic — it simply re-exposes
 * existing data that RegistrationDashboard already resolves.
 */
import React, { createContext, useContext } from 'react';

const EventWorkspaceContext = createContext(null);

export function EventWorkspaceProvider({ children, value }) {
  return (
    <EventWorkspaceContext.Provider value={value}>
      {children}
    </EventWorkspaceContext.Provider>
  );
}

export function useEventWorkspace() {
  const ctx = useContext(EventWorkspaceContext);
  if (!ctx) throw new Error('useEventWorkspace must be used inside EventWorkspaceProvider');
  return ctx;
}

export default EventWorkspaceContext;