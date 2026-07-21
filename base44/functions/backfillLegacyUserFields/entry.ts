import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Transitional backfill: migrate legacy top-level User fields into their
 * canonical destinations, ONLY when the canonical destination is empty.
 *   role_interest_category → primary_profile_type / profile_types
 *   portfolio_url           → website_url
 *   instagram_url           → social_links[{platform:'instagram'}]
 * Never overwrites existing canonical values. Admin-only. { dry_run: true } previews.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;

    const ROLE_MAP: Record<string, string> = {
      'Competitor': 'driver',
      'Team / Organization': 'team',
      'Venue / Series Operator': 'track',
      'Media / Creator': 'media',
      'Crew / Industry': 'crew',
      'Fan / Supporter': 'fan',
    };

    const counts = {
      scanned: 0,
      migrated: 0,
      alreadyCanonical: 0, // no legacy field needed migrating
      ambiguous: 0,         // legacy present but unmappable / no canonical target empty
      failed: 0,
      samples: [] as any[],
    };

    const batch = await base44.asServiceRole.entities.User.list('-created_date', 500);
    counts.scanned = batch.length;

    for (const u of batch) {
      const patch: any = {};

      // ── roles ──
      const types: string[] = Array.isArray(u.profile_types) ? u.profile_types : [];
      const hasTypes = types.length > 0;
      const mapped = u.role_interest_category ? ROLE_MAP[u.role_interest_category] : null;

      if (!hasTypes) {
        if (mapped) {
          patch.profile_types = mapped === 'fan' ? ['fan'] : ['fan', mapped];
          if (!u.primary_profile_type) patch.primary_profile_type = mapped;
        } else {
          // No mappable legacy role — cannot infer primary identity. Leave for manual review.
          counts.ambiguous++;
          continue;
        }
      }

      // ── website ──
      if (!u.website_url && u.portfolio_url) {
        patch.website_url = u.portfolio_url;
      }

      // ── instagram → social_links ──
      const socials: any[] = Array.isArray(u.social_links) ? [...u.social_links] : [];
      const hasInstagram = socials.some((l: any) => l && l.platform === 'instagram');
      if (!hasInstagram && u.instagram_url) {
        socials.push({ platform: 'instagram', url: u.instagram_url, handle: '', public_enabled: true });
        patch.social_links = socials;
      }

      const hasPatch = Object.keys(patch).length > 0;
      if (!hasPatch) {
        counts.alreadyCanonical++;
        continue;
      }

      if (dryRun) {
        counts.migrated++;
        if (counts.samples.length < 5) counts.samples.push({ id: u.id, wouldApply: patch });
      } else {
        try {
          await base44.asServiceRole.entities.User.update(u.id, patch);
          counts.migrated++;
          if (counts.samples.length < 5) counts.samples.push({ id: u.id, applied: patch });
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
      note: 'Legacy fields are NOT removed — only their canonical destinations are populated when empty.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});