import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Transitional backfill: promote EntityCollaborator legacy `role` (owner/editor)
 * to the canonical `permission_level` (admin/staff/viewer) and `role_key` where
 * the mapping is safe and unambiguous. Only fills EMPTY canonical fields — never
 * overwrites. Admin-only. Supports { dry_run: true } to preview counts.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;

    const counts = {
      scanned: 0,
      migrated: 0,          // had a patch applied (or would-be, in dry run)
      alreadyCanonical: 0,  // permission_level already set (nothing to do)
      ambiguous: 0,         // no legacy role AND no canonical fields — cannot infer
      failed: 0,
      samples: [] as any[],
    };

    const batch = await base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500);
    counts.scanned = batch.length;

    for (const c of batch) {
      const patch: any = {};

      // permission_level — infer from legacy role
      if (!c.permission_level && (c.role === 'owner' || c.role === 'editor')) {
        patch.permission_level = c.role === 'owner' ? 'admin' : 'staff';
      }

      // role_key — only safe inference: owner → 'owner'. editor is ambiguous (could be
      // staff/editor/viewer across org types) so we do NOT guess.
      if (!c.role_key && c.role === 'owner') {
        patch.role_key = 'owner';
      }

      const hasPatch = Object.keys(patch).length > 0;

      if (!hasPatch) {
        if (c.permission_level) counts.alreadyCanonical++;
        else counts.ambiguous++;
        continue;
      }

      if (dryRun) {
        counts.migrated++;
        if (counts.samples.length < 5) counts.samples.push({ id: c.id, role: c.role, wouldApply: patch });
      } else {
        try {
          await base44.asServiceRole.entities.EntityCollaborator.update(c.id, patch);
          counts.migrated++;
          if (counts.samples.length < 5) counts.samples.push({ id: c.id, role: c.role, applied: patch });
        } catch (e) {
          counts.failed++;
        }
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      counts,
      hasMore: batch.length === 500,
      note: 'Only permission_level is inferred from role. role_key is set only for owner; editor→role_key is ambiguous and left for manual review.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});