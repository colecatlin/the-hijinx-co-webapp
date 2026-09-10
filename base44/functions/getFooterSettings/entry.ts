import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getDefaultFooterConfig } from '../../shared/footerDefaults.ts';

/**
 * getFooterSettings
 *
 * Returns the Footer presentation configuration.
 *
 * - Admins receive the full record: draft, published, timestamps, and
 *   has_unpublished_changes — everything the Management editor needs.
 * - Non-admins / unauthenticated callers receive ONLY the published
 *   configuration (draft is never exposed publicly).
 *
 * Reusable link references (destination_type = 'reusable_link') are resolved
 * to their actual destinations from ManagedLink records before returning,
 * so the public Footer doesn't need extra requests.
 *
 * If no settings record exists yet, public callers get the default config;
 * admins get the default config as the draft.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const records = await db.FooterSettings.filter({ is_active: true }, '-updated_at', 1);
    const record = records?.[0] || null;

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // unauthenticated — public caller
    }
    const isAdmin = user?.role === 'admin';

    const defaults = getDefaultFooterConfig();

    // Resolve reusable_link references in a config object
    const resolveReusableLinks = async (config: any) => {
      if (!config) return config;
      const linkIds: string[] = [];
      const collect = (links: any[]) => {
        (links || []).forEach((l: any) => {
          if (l.destination_type === 'reusable_link' && l.reusable_link_id) {
            linkIds.push(l.reusable_link_id);
          }
        });
      };
      (config.groups || []).forEach((g: any) => collect(g.links));
      collect(config.legal);

      if (linkIds.length === 0) return config;

      const managedLinks = await db.ManagedLink.filter({ id: { $in: linkIds } });
      const linkMap = new Map(managedLinks.map((ml: any) => [ml.id, ml]));

      const resolveLink = (l: any) => {
        if (l.destination_type !== 'reusable_link' || !l.reusable_link_id) return l;
        const ml = linkMap.get(l.reusable_link_id);
        if (!ml || !ml.enabled) return { ...l, _resolved: false };
        return {
          ...l,
          destination: {
            type: ml.destination_type === 'none' ? 'none' : ml.destination_type,
            internal_page: ml.internal_route || '',
            entity_type: ml.entity_type || '',
            entity_id: ml.entity_id || '',
            entity_slug: ml.entity_slug || '',
            entity_name: ml.entity_name || '',
            external_url: ml.external_url || '',
            open_in_new_tab: ml.open_in_new_tab || false,
          },
          label: l.label || ml.label,
          open_in_new_tab: l.open_in_new_tab || ml.open_in_new_tab || false,
          _resolved: true,
        };
      };

      return {
        ...config,
        groups: (config.groups || []).map((g: any) => ({
          ...g,
          links: (g.links || []).map(resolveLink),
        })),
        legal: (config.legal || []).map(resolveLink),
      };
    };

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
      // Admin gets full record — resolve reusable links in both draft and published
      const draftResolved = await resolveReusableLinks(record.draft || defaults);
      const publishedResolved = await resolveReusableLinks(record.published || null);
      return Response.json({
        draft: draftResolved,
        published: publishedResolved,
        published_at: record.published_at || null,
        updated_at: record.updated_at || null,
        has_unpublished_changes:
          record.has_unpublished_changes ?? (!!record.draft && !record.published),
        record_id: record.id,
      });
    }

    // Public — published only, resolved, fall back to defaults
    const published = record.published ? await resolveReusableLinks(record.published) : defaults;
    return Response.json({ published });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}