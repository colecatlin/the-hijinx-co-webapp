import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getDefaultNavigationConfig, validateNavigationConfig } from '../../shared/navigationDefaults.ts';

/**
 * saveNavigationDraft
 *
 * Admin-only. Saves the draft navigation configuration without making it public.
 * Sets updated_at, updated_by_user_id, and has_unpublished_changes
 * (true when draft differs from the current published configuration).
 *
 * Validates the draft before saving — rejects invalid configs with 400.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const draft = body.draft;
    if (!draft || typeof draft !== 'object') {
      return Response.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    const validation = validateNavigationConfig(draft);
    if (!validation.valid) {
      return Response.json({ error: validation.error, warnings: validation.warnings }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const records = await db.NavigationSettings.filter({ is_active: true }, '-updated_at', 1);
    const record = records?.[0] || null;

    const now = new Date().toISOString();
    const hasUnpublished = !record?.published
      ? true
      : JSON.stringify(draft) !== JSON.stringify(record.published);

    if (record) {
      await db.NavigationSettings.update(record.id, {
        draft,
        updated_at: now,
        updated_by_user_id: user.id,
        has_unpublished_changes: hasUnpublished,
      });
    } else {
      await db.NavigationSettings.create({
        is_active: true,
        draft,
        published: null,
        updated_at: now,
        updated_by_user_id: user.id,
        has_unpublished_changes: true,
      });
    }

    return Response.json({
      ok: true,
      updated_at: now,
      has_unpublished_changes: hasUnpublished,
      warnings: validation.warnings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}