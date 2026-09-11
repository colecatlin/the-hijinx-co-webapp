/**
 * navResolver.js
 *
 * Resolves managed NavigationSettings config into the shapes expected by
 * the public rendering components (Layout.jsx desktop nav + MobileMenuDrawer,
 * MobileBottomNav.jsx).
 *
 * Handles all destination types, broken reusable_link references (skipped),
 * and header children (section dividers).
 *
 * Used by Layout.jsx and MobileBottomNav.jsx alongside their hardcoded
 * fallbacks.
 */

function destToPageKey(dest) {
  if (!dest || dest.type !== 'internal_page' || !dest.internal_page) return null;
  const path = dest.internal_page;
  if (path === '/') return 'Home';
  return path.replace(/^\//, '').replace(/[?].*/, '');
}

function resolveDestToHref(dest) {
  if (!dest || dest._resolved === false) return null;
  if (dest.type === 'internal_page' && dest.internal_page) return dest.internal_page;
  if (dest.type === 'external' && dest.external_url) {
    try { new URL(dest.external_url); return dest.external_url; } catch { return null; }
  }
  if (dest.type === 'entity' && dest.entity_id) {
    const id = dest.entity_slug || dest.entity_id;
    if (dest.entity_type === 'Event') return `/events/${id}`;
    if (dest.entity_type === 'OutletStory') return `/story/${id}`;
  }
  return null;
}

/**
 * Resolve managed desktop_primary config → array of rendered nav items.
 * Returns null if config is missing/empty (caller falls back to hardcoded).
 * Each item: { name, page, href, sub?: [{ name, href, disabled? }] }
 */
export function resolveDesktopNav(config) {
  if (!config?.desktop_primary?.items) return null;

  const items = config.desktop_primary.items
    .filter((item) => item.enabled !== false)
    .map((item) => {
      const dest = item.destination;
      if (dest?._resolved === false) return null;

      const href = resolveDestToHref(dest);
      // Skip items with no valid destination (unless protected home — always keep)
      if (!href && !item.is_protected_home) return null;

      const page = destToPageKey(dest);
      const result = { name: item.label, page, href: href || '#' };

      if (item.children && item.children.length > 0) {
        const sub = item.children
          .filter((child) => child.enabled !== false)
          .map((child) => {
            if (child.type === 'header') {
              return { name: `— ${child.label} —`, disabled: true };
            }
            const childHref = resolveDestToHref(child.destination);
            if (!childHref) return null;
            return { name: child.label, href: childHref };
          })
          .filter(Boolean);
        if (sub.length > 0) result.sub = sub;
      }

      return result;
    })
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

/**
 * Resolve managed mobile_bottom config → array of mobile nav items.
 * Returns null if config is missing/empty (caller falls back to hardcoded).
 * Each item: { id, label, type, destination?, icon_key, auth_only, emphasized }
 */
export function resolveMobileBottomNav(config) {
  if (!config?.mobile_bottom?.items) return null;

  const items = config.mobile_bottom.items
    .filter((item) => item.enabled !== false)
    .map((item) => {
      // For route items, check destination validity
      if (item.type === 'route') {
        const href = resolveDestToHref(item.destination);
        if (!href) return null; // skip broken route items
        return { ...item, _href: href };
      }
      return { ...item };
    })
    .filter(Boolean);

  return items.length > 0 ? items : null;
}