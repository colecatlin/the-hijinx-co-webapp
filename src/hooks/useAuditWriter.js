/**
 * R9CT — useAuditWriter
 * React hook wrapper around the createAuditLog backend function.
 * Provides a writeAudit(params) helper for use in mutation callbacks.
 *
 * Usage:
 *   const { writeAudit } = useAuditWriter(user);
 *   writeAudit({ entity_type: 'Results', entity_id: id, action: 'status_changed', ... });
 *
 * Fires-and-forgets — audit failures never block the primary operation.
 */
import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useAuditWriter(user) {
  const writeAudit = useCallback(async ({
    entity_type,
    entity_id,
    entity_name,
    action,
    before_data,
    after_data,
    notes,
    event_id,
  }) => {
    if (!entity_type || !entity_id || !action) return;
    try {
      await base44.functions.invoke('createAuditLog', {
        entity_type,
        entity_id,
        entity_name: entity_name || '',
        action,
        before_data: before_data || null,
        after_data: after_data || null,
        performed_by: user?.id || 'system',
        performed_by_name: user?.full_name || 'System',
        timestamp: new Date().toISOString(),
        notes: notes || null,
        event_id: event_id || null,
      });
    } catch (_) {
      // Audit failures are non-blocking — swallow silently
    }
  }, [user]);

  return { writeAudit };
}

export default useAuditWriter;