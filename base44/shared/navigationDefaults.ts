/**
 * navigationDefaults.ts
 *
 * Default Navigation configuration — seeded from the CURRENT public navigation
 * implementation (src/Layout.jsx navItems + src/components/layout/MobileBottomNav.jsx).
 * These values guarantee that when the navigation is wired to published settings,
 * the public header, mobile drawer, and mobile bottom nav remain visually and
 * functionally identical to today.
 *
 * Shared by getNavigationSettings, saveNavigationDraft, and publishNavigation.
 */

const DEST = (type: string, extra: Record<string, any> = {}) => ({
  type,
  internal_page: '',
  entity_type: '',
  entity_id: '',
  entity_slug: '',
  entity_name: '',
  external_url: '',
  open_in_new_tab: false,
  ...extra,
});

export function getDefaultNavigationConfig() {
  return {
    desktop_primary: {
      items: [
        {
          id: 'home',
          enabled: true,
          label: 'Home',
          sort_order: 0,
          destination: DEST('internal_page', { internal_page: '/' }),
          reusable_link_id: '',
          is_protected_home: true,
          children: [],
        },
        {
          id: 'outlet',
          enabled: true,
          label: 'The Outlet',
          sort_order: 1,
          destination: DEST('internal_page', { internal_page: '/OutletHome' }),
          reusable_link_id: '',
          is_protected_home: false,
          children: [
            { id: 'outlet_stories', enabled: true, label: 'Stories', sort_order: 0, type: 'link', destination: DEST('internal_page', { internal_page: '/OutletHome' }), reusable_link_id: '' },
            { id: 'outlet_submit', enabled: true, label: 'Submit a Story', sort_order: 1, type: 'link', destination: DEST('internal_page', { internal_page: '/OutletSubmit' }), reusable_link_id: '' },
          ],
        },
        {
          id: 'index46',
          enabled: true,
          label: 'INDEX46',
          sort_order: 2,
          destination: DEST('internal_page', { internal_page: '/MotorsportsHome' }),
          reusable_link_id: '',
          is_protected_home: false,
          children: [
            { id: 'idx_dir_header', enabled: true, label: 'Directory', sort_order: 0, type: 'header', destination: DEST('none'), reusable_link_id: '' },
            { id: 'idx_all_records', enabled: true, label: 'All Records', sort_order: 1, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory' }), reusable_link_id: '' },
            { id: 'idx_racers', enabled: true, label: 'Racers', sort_order: 2, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=drivers' }), reusable_link_id: '' },
            { id: 'idx_teams', enabled: true, label: 'Teams', sort_order: 3, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=teams' }), reusable_link_id: '' },
            { id: 'idx_tracks', enabled: true, label: 'Tracks', sort_order: 4, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=tracks' }), reusable_link_id: '' },
            { id: 'idx_series', enabled: true, label: 'Series', sort_order: 5, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=series' }), reusable_link_id: '' },
            { id: 'idx_vehicles', enabled: true, label: 'Vehicles', sort_order: 6, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=vehicles' }), reusable_link_id: '' },
            { id: 'idx_sponsors', enabled: true, label: 'Sponsors', sort_order: 7, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=sponsors' }), reusable_link_id: '' },
            { id: 'idx_events_header', enabled: true, label: 'Events', sort_order: 8, type: 'header', destination: DEST('none'), reusable_link_id: '' },
            { id: 'idx_events', enabled: true, label: 'Events', sort_order: 9, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=events' }), reusable_link_id: '' },
            { id: 'idx_reg_header', enabled: true, label: 'Registration', sort_order: 10, type: 'header', destination: DEST('none'), reusable_link_id: '' },
            { id: 'idx_register', enabled: true, label: 'Register for Event', sort_order: 11, type: 'link', destination: DEST('internal_page', { internal_page: '/Registration' }), reusable_link_id: '' },
            { id: 'idx_media_header', enabled: true, label: 'Media', sort_order: 12, type: 'header', destination: DEST('none'), reusable_link_id: '' },
            { id: 'idx_media_home', enabled: true, label: 'Media Home', sort_order: 13, type: 'link', destination: DEST('internal_page', { internal_page: '/MediaHome' }), reusable_link_id: '' },
            { id: 'idx_creators', enabled: true, label: 'Creator Directory', sort_order: 14, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=creators' }), reusable_link_id: '' },
            { id: 'idx_outlets', enabled: true, label: 'Media Outlets', sort_order: 15, type: 'link', destination: DEST('internal_page', { internal_page: '/Directory?cat=outlets' }), reusable_link_id: '' },
            { id: 'idx_media_portal', enabled: true, label: 'Media Portal', sort_order: 16, type: 'link', destination: DEST('internal_page', { internal_page: '/MediaPortal' }), reusable_link_id: '' },
          ],
        },
        {
          id: 'apparel',
          enabled: true,
          label: 'Apparel',
          sort_order: 3,
          destination: DEST('internal_page', { internal_page: '/ApparelHome' }),
          reusable_link_id: '',
          is_protected_home: false,
          children: [],
        },
        {
          id: 'marketplace',
          enabled: true,
          label: 'Marketplace',
          sort_order: 4,
          destination: DEST('internal_page', { internal_page: '/MarketplaceHome' }),
          reusable_link_id: '',
          is_protected_home: false,
          children: [],
        },
      ],
    },
    mobile_bottom: {
      items: [
        { id: 'mb_home', enabled: true, label: 'Home', sort_order: 0, type: 'route', destination: DEST('internal_page', { internal_page: '/' }), icon_key: 'home', auth_only: false, emphasized: false },
        { id: 'mb_directory', enabled: true, label: 'Directory', sort_order: 1, type: 'route', destination: DEST('internal_page', { internal_page: '/Directory' }), icon_key: 'directory', auth_only: false, emphasized: false },
        { id: 'mb_search', enabled: true, label: 'Search', sort_order: 2, type: 'search', icon_key: 'search', auth_only: false, emphasized: true },
        { id: 'mb_dashboard', enabled: true, label: 'Dashboard', sort_order: 3, type: 'route', destination: DEST('internal_page', { internal_page: '/MyDashboard' }), icon_key: 'dashboard', auth_only: true, emphasized: false },
        { id: 'mb_menu', enabled: true, label: 'Menu', sort_order: 4, type: 'menu', icon_key: 'menu', auth_only: false, emphasized: false },
      ],
    },
    display: {},
  };
}

// ── Validation ──────────────────────────────────────────────

function validateDestination(d: any, path: string, errors: string[], warnings: string[]) {
  if (!d) { errors.push(`${path}: destination required`); return; }
  if (d.type === 'internal_page' && !d.internal_page) errors.push(`${path}: internal page required`);
  if (d.type === 'external') {
    if (!d.external_url) errors.push(`${path}: external URL required`);
    else try { new URL(d.external_url); } catch { errors.push(`${path}: invalid URL`); }
  }
  if (d.type === 'entity' && !d.entity_id) errors.push(`${path}: entity required`);
  if (d.type === 'reusable_link' && !d.reusable_link_id) errors.push(`${path}: reusable_link_id required`);
}

const VALID_MOBILE_TYPES = ['route', 'search', 'menu'];
const VALID_CHILD_TYPES = ['link', 'header'];
const VALID_ICON_KEYS = ['home', 'directory', 'search', 'dashboard', 'menu'];

export function validateNavigationConfig(config: any) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid config', warnings: [] };
  }

  // Validate desktop_primary items
  const topIds = new Set<string>();
  (config.desktop_primary?.items || []).forEach((item: any, i: number) => {
    const path = `desktop_primary.items[${i}]`;
    if (!item.id) errors.push(`${path}: id required`);
    if (item.id && topIds.has(item.id)) errors.push(`${path}: duplicate id "${item.id}"`);
    if (item.id) topIds.add(item.id);
    if (item.enabled) {
      if (!item.label?.trim()) errors.push(`${path}: label required for enabled item`);
      // Protected home check
      if (item.is_protected_home) {
        if (item.destination?.type !== 'internal_page' || item.destination?.internal_page !== '/') {
          errors.push(`${path}: protected home item must resolve to /`);
        }
      } else {
        validateDestination(item.destination, path, errors, warnings);
      }
    }
    // Validate children
    const childIds = new Set<string>();
    (item.children || []).forEach((child: any, j: number) => {
      const cpath = `${path}.children[${j}]`;
      if (!child.id) errors.push(`${cpath}: id required`);
      if (child.id && childIds.has(child.id)) errors.push(`${cpath}: duplicate id "${child.id}"`);
      if (child.id) childIds.add(child.id);
      if (child.type && !VALID_CHILD_TYPES.includes(child.type)) errors.push(`${cpath}: invalid type "${child.type}"`);
      if (child.enabled && child.type !== 'header') {
        if (!child.label?.trim()) errors.push(`${cpath}: label required for enabled child`);
        validateDestination(child.destination, cpath, errors, warnings);
      }
    });
  });

  // Validate mobile_bottom items
  const mbIds = new Set<string>();
  (config.mobile_bottom?.items || []).forEach((item: any, i: number) => {
    const path = `mobile_bottom.items[${i}]`;
    if (!item.id) errors.push(`${path}: id required`);
    if (item.id && mbIds.has(item.id)) errors.push(`${path}: duplicate id "${item.id}"`);
    if (item.id) mbIds.add(item.id);
    if (item.enabled) {
      if (!item.label?.trim()) errors.push(`${path}: label required for enabled item`);
      if (!item.type) errors.push(`${path}: type required`);
      if (item.type && !VALID_MOBILE_TYPES.includes(item.type)) errors.push(`${path}: invalid type "${item.type}"`);
      if (item.type === 'route') {
        validateDestination(item.destination, path, errors, warnings);
      }
      if (!item.icon_key) errors.push(`${path}: icon_key required`);
      if (item.icon_key && !VALID_ICON_KEYS.includes(item.icon_key)) errors.push(`${path}: invalid icon_key "${item.icon_key}"`);
    }
  });

  return {
    valid: errors.length === 0,
    error: errors.join('; '),
    warnings,
  };
}