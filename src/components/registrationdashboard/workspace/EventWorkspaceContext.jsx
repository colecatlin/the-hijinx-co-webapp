/**
 * REVISION 7E — EventWorkspaceContext (R7E Part 1 Expansion)
 * Centralizes all event-workspace-scoped data into a single context.
 * Added R7E fields for session/standings management (minimal, safe expansion).
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