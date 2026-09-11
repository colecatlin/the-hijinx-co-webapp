import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getDefaultNavigationConfig } from '../../shared/navigationDefaults.ts';

/**
 * getNavigationSettings
 *
 * Returns the public site navigation configuration.
 *
 * - Admins receive the full record: draft, published, timestamps, and
 *   has_unpublished_changes — everything the Management editor needs.
 * - Non-admins / unauthenticated callers receive ONLY the published
 *   configuration (draft is never exposed publicly).
 *
 * Reusable link references (destination.type = 'reusable_link') are resolved
 * to their actual destinations from ManagedLink records before returning,
 * so the public navigation doesn't need extra requests.
 *
 * If no settings record exists yet, admins receive the default config as
 * the draft (with has_unpublished_changes=true); public callers get defaults.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const records = await db.NavigationSettings.filter({ is_active: true }, '-updated_at', 1);
    const record = records?.[0] || null;

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // unauthenticated — public caller
    }
    const isAdmin = user?.role === 'admin';

    const defaults = getDefaultNavigationConfig();

    // Resolve reusable_link references in a config object
    const resolveReusableLinks = async (config: any) => {
      if (!config) return config;
      const linkIds: string[] = [];

      // Collect from desktop_primary items (top-level + children)
      (config.desktop_primary?.items || []).forEach((item: any) => {
        if (item.destination?.type === 'reusable_link' && item.reusable_link_id) {
          linkIds.push(item.reusable_link_id);
        }
        (item.children || []).forEach((child: any) => {
          if (child.destination?.type === 'reusable_link' && child.reusable_link_id) {
            linkIds.push(child.reusable_link_id);
          }
        });
      });

      // Collect from mobile_bottom items
      (config.mobile_bottom?.items || []).forEach((item: any) => {
        if (item.destination?.type === 'reusable_link' && item.reusable_link_id) {
          linkIds.push(item.reusable_link_id);
        }
      });

      if (linkIds.length === 0) return config;

      const managedLinks = await db.ManagedLink.filter({ id: { $in: linkIds } });
      const linkMap = new Map(managedLinks.map((ml: any) => [ml.id, ml]));

      const resolveDest = (dest: any, reusableLinkId: string) => {
        if (!dest || dest.type !== 'reusable_link' || !reusableLinkId) return dest;
        const ml = linkMap.get(reusableLinkId);
        if (!ml || !ml.enabled) return { ...dest, _resolved: false };
        return {
          type: ml.destination_type === 'none' ? 'none' : ml.destination_type,
          internal_page: ml.internal_route || '',
          entity_type: ml.entity_type || '',
          entity_id: ml.entity_id || '',
          entity_slug: ml.entity_slug || '',
          entity_name: ml.entity_name || '',
          external_url: ml.external_url || '',
          open_in_new_tab: ml.open_in_new_tab || false,
          _resolved: true,
        };
      };

      return {
        ...config,
        desktop_primary: {
          ...config.desktop_primary,
          items: (config.desktop_primary?.items || []).map((item: any) => ({
            ...item,
            destination: resolveDest(item.destination, item.reusable_link_id),
            children: (item.children || []).map((child: any) => ({
              ...child,
              destination: resolveDest(child.destination, child.reusable_link_id),
            })),
          })),
        },
        mobile_bottom: {
          ...config.mobile_bottom,
          items: (config.mobile_bottom?.items || []).map((item: any) => ({
            ...item,
            destination: resolveDest(item.destination, item.reusable_link_id),
          })),
        },
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