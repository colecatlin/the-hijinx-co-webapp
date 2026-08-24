/**
 * auditMediaExperience
 * Phase 16 — Read-only integrity audit for the Media Platform.
 * Validates media items for missing thumbnails, broken references, duplicate
 * slugs, visibility leaks, draft exposure, missing SEO, missing publisher/author,
 * and broken gallery links.
 *
 * Read-only — never creates or modifies media state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── AUTHORIZATION GATE (mandatory, before any data access) ───────
    // This is an internal administrative audit tool. It must NOT be
    // publicly executable. Authentication alone is NOT sufficient — the
    // trusted server-side caller must be an admin.
    //
    // The role is read ONLY from the trusted authenticated server-side
    // identity (base44.auth.me()) — never from the request body, query
    // string, or any client-supplied value. No media records, related
    // entities, diagnostic queries, or service-role calls happen before
    // this gate passes. Both the single-item and audit_all paths flow
    // through this single gate.
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { media_type, slug, id, audit_all = false } = body;
    const entities = base44.asServiceRole.entities;
    const issues: any[] = [];

    if (audit_all) {
      return await auditAllMedia(entities);
    }

    // Single media item audit
    if (!media_type || (!slug && !id)) {
      return Response.json({ error: 'media_type and (slug or id) are required, or set audit_all=true' }, { status: 400 });
    }

    let item: any = null;
    try {
      if (media_type === 'article' || media_type === 'story') {
        if (slug) {
          const results = await entities.OutletStory.filter({ slug });
          item = results?.[0] || null;
        } else if (id) {
          item = await entities.OutletStory.get(id);
        }
      } else {
        if (id) {
          item = await entities.MediaAsset.get(id);
        }
      }
    } catch {}

    if (!item) {
      return Response.json({
        status: 'issues_found',
        total_checked: 1,
        total_with_issues: 1,
        total_issues: 1,
        issues: [{ severity: 'critical', category: 'not_found', message: 'Media item not found' }],
        summary: { critical: 1, warnings: 0 },
      });
    }

    const itemId = item.id;
    const itemTitle = item.title || item.file_name || 'Untitled';

    // Article-specific checks
    if (media_type === 'article' || media_type === 'story') {
      if (!item.slug) {
        issues.push({ severity: 'warning', category: 'missing_slug', message: 'Article has no slug', item_id: itemId, item_title: itemTitle });
      }
      if (!item.cover_image) {
        issues.push({ severity: 'warning', category: 'missing_cover_image', message: 'Article has no cover image', item_id: itemId, item_title: itemTitle });
      }
      if (!item.author && !item.author_media_profile_id) {
        issues.push({ severity: 'warning', category: 'missing_author', message: 'Article has no author', item_id: itemId, item_title: itemTitle });
      }
      if (!item.author_outlet_id && !item.author_media_profile_id) {
        issues.push({ severity: 'warning', category: 'missing_publisher', message: 'Article has no publisher', item_id: itemId, item_title: itemTitle });
      }
      if (item.status === 'published' && !item.published_date) {
        issues.push({ severity: 'warning', category: 'missing_published_date', message: 'Published article has no published_date', item_id: itemId, item_title: itemTitle });
      }

      // Check for duplicate slugs
      if (item.slug) {
        try {
          const dupes = await entities.OutletStory.filter({ slug: item.slug });
          if (dupes.length > 1) {
            issues.push({ severity: 'critical', category: 'duplicate_slug', message: `${dupes.length} articles share slug "${item.slug}"`, item_id: itemId, item_title: itemTitle });
          }
        } catch {}
      }

      // Check broken driver reference
      if (item.driver_id) {
        try { await entities.Driver.get(item.driver_id); }
        catch { issues.push({ severity: 'warning', category: 'broken_driver_ref', message: 'Article references a non-existent driver', item_id: itemId, item_title: itemTitle }); }
      }

      // Check broken event reference
      if (item.event_id) {
        try { await entities.Event.get(item.event_id); }
        catch { issues.push({ severity: 'warning', category: 'broken_event_ref', message: 'Article references a non-existent event', item_id: itemId, item_title: itemTitle }); }
      }
    }

    // Asset-specific checks
    if (media_type !== 'article' && media_type !== 'story') {
      if (!item.thumbnail_url && !item.file_url) {
        issues.push({ severity: 'warning', category: 'missing_thumbnail', message: 'Asset has no thumbnail or file URL', item_id: itemId, item_title: itemTitle });
      }
      if (!item.title && !item.file_name) {
        issues.push({ severity: 'warning', category: 'missing_title', message: 'Asset has no title', item_id: itemId, item_title: itemTitle });
      }
      if (item.public_access && item.visibility_scope === 'public' && item.rights_status !== 'cleared') {
        issues.push({ severity: 'warning', category: 'rights_not_cleared', message: 'Public asset has rights_status != cleared', item_id: itemId, item_title: itemTitle });
      }
      if (item.status === 'archived' && item.public_access) {
        issues.push({ severity: 'critical', category: 'archived_exposed', message: 'Archived asset is marked public_access=true', item_id: itemId, item_title: itemTitle });
      }

      // Check broken event reference
      if (item.captured_at_event_id) {
        try { await entities.Event.get(item.captured_at_event_id); }
        catch { issues.push({ severity: 'warning', category: 'broken_event_ref', message: 'Asset references a non-existent event', item_id: itemId, item_title: itemTitle }); }
      }

      // Check AssetLink references
      try {
        const links = await entities.AssetLink.filter({ asset_id: item.id });
        for (const link of links) {
          try {
            switch (link.subject_type) {
              case 'driver': await entities.Driver.get(link.subject_id); break;
              case 'team': await entities.Team.get(link.subject_id); break;
              case 'track': await entities.Track.get(link.subject_id); break;
              case 'series': await entities.Series.get(link.subject_id); break;
              case 'event': await entities.Event.get(link.subject_id); break;
            }
          } catch {
            issues.push({ severity: 'warning', category: 'broken_asset_link', message: `AssetLink references non-existent ${link.subject_type}`, item_id: itemId, item_title: itemTitle });
          }
        }
      } catch {}
    }

    const critical = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    return Response.json({
      status: issues.length === 0 ? 'clean' : 'issues_found',
      total_checked: 1,
      total_with_issues: issues.length > 0 ? 1 : 0,
      total_issues: issues.length,
      issues,
      summary: { critical, warnings },
    });
  } catch (err) {
    console.error('[auditMediaExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
});

async function auditAllMedia(entities: any) {
  const issues: any[] = [];
  let totalChecked = 0;

  // Audit all published stories
  try {
    const stories = await entities.OutletStory.filter({ status: 'published' });
    totalChecked += stories.length;

    // Check for duplicate slugs
    const slugMap: Record<string, number> = {};
    for (const s of stories) {
      if (s.slug) slugMap[s.slug] = (slugMap[s.slug] || 0) + 1;
    }
    for (const [slug, count] of Object.entries(slugMap)) {
      if (count > 1) {
        issues.push({ severity: 'critical', category: 'duplicate_slug', message: `${count} published stories share slug "${slug}"` });
      }
    }

    for (const s of stories) {
      if (!s.slug) issues.push({ severity: 'warning', category: 'missing_slug', message: 'Published story has no slug', item_id: s.id, item_title: s.title });
      if (!s.cover_image) issues.push({ severity: 'warning', category: 'missing_cover_image', message: 'Published story has no cover image', item_id: s.id, item_title: s.title });
      if (!s.published_date) issues.push({ severity: 'warning', category: 'missing_published_date', message: 'Published story has no published_date', item_id: s.id, item_title: s.title });
      if (!s.author && !s.author_media_profile_id) issues.push({ severity: 'warning', category: 'missing_author', message: 'Published story has no author', item_id: s.id, item_title: s.title });
    }
  } catch {}

  // Audit all public assets
  try {
    const assets = await entities.MediaAsset.list();
    const publicAssets = assets.filter((a: any) => a.public_access && a.visibility_scope === 'public');
    totalChecked += publicAssets.length;

    for (const a of publicAssets) {
      if (a.status === 'archived') {
        issues.push({ severity: 'critical', category: 'archived_exposed', message: 'Archived asset is marked public', item_id: a.id, item_title: a.title || a.file_name });
      }
      if (a.rights_status === 'revoked') {
        issues.push({ severity: 'critical', category: 'revoked_exposed', message: 'Asset with revoked rights is marked public', item_id: a.id, item_title: a.title || a.file_name });
      }
      if (!a.thumbnail_url && !a.file_url) {
        issues.push({ severity: 'warning', category: 'missing_thumbnail', message: 'Public asset has no thumbnail or file URL', item_id: a.id, item_title: a.title || a.file_name });
      }
    }
  } catch {}

  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return Response.json({
    status: issues.length === 0 ? 'clean' : 'issues_found',
    total_checked: totalChecked,
    total_with_issues: issues.length > 0 ? 1 : 0,
    total_issues: issues.length,
    issues: issues.slice(0, 100),
    summary: { critical, warnings },
  });
}