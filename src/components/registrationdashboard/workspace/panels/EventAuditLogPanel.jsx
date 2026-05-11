/**
 * REVISION 7A Part 4 — EventAuditLogPanel
 * Thin adapter: pulls required props from EventWorkspaceContext and passes
 * them into AuditLogManager as a black box.
 *
 * AuditLogManager internals are NOT modified.
 * No mutations, no lifecycle logic, no schema changes.
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import AuditLogManager from '../../AuditLogManager';

export default function EventAuditLogPanel() {
  const { isAdmin, dashboardContext } = useEventWorkspace();

  // AuditLogManager fetches its own logs internally.
  // We do NOT pass operationLogs here so it uses its own query,
  // which gives it the full filtered/paginated dataset rather than
  // the limited pre-fetched slice from context.
  return (
    <AuditLogManager
      isAdmin={isAdmin}
      dashboardContext={dashboardContext}
    />
  );
}