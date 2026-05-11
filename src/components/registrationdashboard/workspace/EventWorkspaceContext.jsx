/**
 * REVISION R7E PART 3 — EventWorkspaceContext
 * Centralizes all event-workspace-scoped data into a single context.
 * R7E Part 3: Added selectedSessionId for Results panel targeting.
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