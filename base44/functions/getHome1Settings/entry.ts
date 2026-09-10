import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getDefaultHome1Config } from '../../shared/home1Defaults.ts';

/**
 * getHome1Settings
 *
 * Returns the Home1 presentation configuration.
 *
 * - Admins receive the full record: draft, published, timestamps, and
 *   has_unpublished_changes — everything the Management editor needs.
 * - Non-admins / unauthenticated callers receive ONLY the published
 *   configuration (draft is never exposed publicly).
 *
 * If no settings record exists yet, admins receive the default config as
 * the draft (with has_unpublished_changes=true); public callers get null.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const records = await db.Home1Settings.filter({ is_active: true }, '-updated_at', 1);
    const record = records?.[0] || null;

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // unauthenticated — public caller
    }
    const isAdmin = user?.role === 'admin';

    const defaults = getDefaultHome1Config();

    if (!record) {
      if (isAdmin) {
        return Response.json({
          draft: defaults,
          published: null,
          published_at: null,
          updated_at: null,
          has_unpublished_changes: true,
          record_id: null,
        });
      }
      return Response.json({ published: defaults });
    }

    if (isAdmin) {
      return Response.json({
        draft: record.draft || defaults,
        published: record.published || null,
        published_at: record.published_at || null,
        updated_at: record.updated_at || null,
        has_unpublished_changes:
          record.has_unpublished_changes ?? (!!record.draft && !record.published),
        record_id: record.id,
      });
    }

    // Public — published only, fall back to defaults
    return Response.json({ published: record.published || defaults });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}