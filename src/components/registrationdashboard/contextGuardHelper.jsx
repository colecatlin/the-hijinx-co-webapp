/**
 * Context Guard Helper
 * Enforces event context integrity across mutations.
 * Prevents any operation outside the selectedEvent scope.
 */

/**
 * Verify entry belongs to selectedEvent before mutation.
 * Logs block attempt if mismatch.
 */
export async function verifyEntryEventIntegrity(entry, selectedEvent, base44) {
  if (!selectedEvent) {
    console.warn('No selectedEvent for entry mutation guard');
    return false;
  }

  if (entry.event_id !== selectedEvent.id) {
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'context_block',
        source_type: 'RegistrationDashboard',
        entity_name: 'Entry',
        entity_id: entry.id,
        event_id: selectedEvent.id,
        status: 'blocked',
        message: `Entry event_id ${entry.event_id} does not match selectedEvent ${selectedEvent.id}`,
      });
    } catch (_) {}
    return false;
  }

  return true;
}

/**
 * Verify session belongs to selectedEvent before mutation.
 */
export async function verifySessionEventIntegrity(session, selectedEvent, base44) {
  if (!selectedEvent) {
    console.warn('No selectedEvent for session mutation guard');
    return false;
  }

  if (session.event_id !== selectedEvent.id) {
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'context_block',
        source_type: 'RegistrationDashboard',
        entity_name: 'Session',
        entity_id: session.id,
        event_id: selectedEvent.id,
        status: 'blocked',
        message: `Session event_id ${session.event_id} does not match selectedEvent ${selectedEvent.id}`,
      });
    } catch (_) {}
    return false;
  }

  return true;
}

/**
 * Block operation with inline error message.
 */
export const GUARD_ERROR_MESSAGE = 'Operation blocked: Event context mismatch. Please refresh and try again.';