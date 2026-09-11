import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validateNavigationConfig } from '../../shared/navigationDefaults.ts';

/**
 * publishNavigation
 *
 * Admin-only. Copies the current draft into the published configuration,
 * sets published_at, clears has_unpublished_changes, and records the
 * publisher. The draft is preserved unchanged.
 *
 * Validates the draft before publishing — rejects invalid configs with 400.
 * Records a NAVIGATION_CONFIG_PUBLISHED audit event via the existing AuditLog
 * entity (action: lifecycle_change) without modifying the AuditLog schema.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const records = await db.NavigationSettings.filter({ is_active: true }, '-updated_at', 1);
    const record = records?.[0] || null;

    if (!record || !record.draft) {
      return Response.json({ error: 'No draft to publish' }, { status: 400 });
    }

    const validation = validateNavigationConfig(record.draft);
    if (!validation.valid) {
      return Response.json({ error: validation.error, warnings: validation.warnings }, { status: 400 });
    }

    const now = new Date().toISOString();

    await db.NavigationSettings.update(record.id, {
      published: record.draft,
      published_at: now,
      has_unpublished_changes: false,
      updated_by_user_id: user.id,
    });

    // Audit log — uses existing AuditLog entity, no schema changes
    try {
      await db.AuditLog.create({
        entity_type: 'NavigationSettings',
        entity_id: record.id,
        entity_name: 'Navigation Configuration',
        action: 'lifecycle_change',
        performed_by: user.id,
        performed_by_name: user.full_name || user.email || user.id,
        timestamp: now,
        notes: 'NAVIGATION_CONFIG_PUBLISHED',
      });
    } catch {
      // Audit logging is best-effort — never block publish on audit failure
    }

    return Response.json({
      ok: true,
      published_at: now,
      warnings: validation.warnings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}