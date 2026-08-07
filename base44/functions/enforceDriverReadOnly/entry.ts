/**
 * enforceDriverReadOnly — Phase 8+
 *
 * Backend enforcement endpoint for Driver read-only mode.
 *
 * Checks whether a Driver write operation is allowed based on:
 *   - User role (admin = allowed for repair)
 *   - Source operation (allowlisted compatibility services = allowed)
 *
 * Logs all attempts to ActivityFeed for monitoring.
 *
 * Payload:
 *   { operation: 'create' | 'update', source_operation?: string, driver_id?: string }
 *
 * Returns:
 *   { allowed: boolean, reason: string, auth_source?: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAuth } from '../../shared/identityClaimHelpers.ts';
import {
  isAllowlistedDriverWrite,
  driverWriteBlockedError,
  DRIVER_WRITE_EVENTS,
} from '../../shared/driverWriteEnforcement.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);

    const body = await req.json().catch(() => ({}));
    const { operation, source_operation, driver_id } = body || {};

    if (!operation || (operation !== 'create' && operation !== 'update')) {
      return Response.json({ error: 'operation must be "create" or "update"' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const isAllowlisted = source_operation && isAllowlistedDriverWrite(source_operation);

    let allowed = false;
    let reason = '';
    let authSource = null;
    let eventType;

    if (isAllowlisted) {
      // Allowlisted compatibility service — always allowed
      allowed = true;
      reason = `Allowlisted compatibility service: ${source_operation}`;
      authSource = 'compat_service';
      eventType = operation === 'create'
        ? DRIVER_WRITE_EVENTS.APPROVED_COMPAT_CREATE
        : DRIVER_WRITE_EVENTS.APPROVED_COMPAT_UPDATE;
    } else if (isAdmin) {
      // Admin repair — allowed but logged
      allowed = true;
      reason = 'Admin repair mode';
      authSource = 'admin';
      eventType = DRIVER_WRITE_EVENTS.ADMIN_REPAIR;
    } else {
      // Normal user — blocked
      allowed = false;
      reason = 'Driver is read-only in normal UI workflows. Use RacerProfile or PersonIdentity instead.';
      eventType = operation === 'create'
        ? DRIVER_WRITE_EVENTS.BLOCKED_CREATE
        : DRIVER_WRITE_EVENTS.BLOCKED_UPDATE;
    }

    // Log the attempt for monitoring (do NOT log sensitive data)
    try {
      await base44.asServiceRole.entities.ActivityFeed.create({
        type: 'driver_write_monitor',
        title: `Driver ${operation} ${allowed ? 'approved' : 'blocked'}`,
        description: eventType,
        entity_type: 'Driver',
        entity_id: driver_id || null,
        metadata: {
          event: eventType,
          operation,
          source_operation: source_operation || null,
          allowed,
          auth_source: authSource,
          user_id: user.id,
        },
      });
    } catch (e) {
      // Non-critical — don't fail the check if logging fails
    }

    if (!allowed) {
      return Response.json({
        ...driverWriteBlockedError(operation, reason),
        allowed: false,
      }, { status: 403 });
    }

    return Response.json({
      allowed: true,
      reason,
      auth_source: authSource,
      operation,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}