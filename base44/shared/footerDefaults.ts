/**
 * footerDefaults.ts
 *
 * Default Footer configuration — seeded from the CURRENT public Footer
 * implementation (src/components/shared/Footer.jsx). These values guarantee
 * that when the Footer is wired to published settings, the public footer
 * remains visually and content-identical to today.
 *
 * Shared by getFooterSettings, saveFooterDraft, and publishFooter.
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

export function getDefaultFooterConfig() {
  return {
    groups: [
      {
        key: 'PLATFORM',
        title: 'Platform',
        enabled: true,
        sort_order: 0,
        links: [
          { id: 'platform_outlet', label: 'The Outlet', enabled: true, sort_order: 0, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/OutletHome' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'platform_motorsports', label: 'Motorsports', enabled: true, sort_order: 1, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/MotorsportsHome' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'platform_apparel', label: 'Apparel', enabled: true, sort_order: 2, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/ApparelHome' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'platform_creative', label: 'Creative Services', enabled: true, sort_order: 3, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/CreativeServices' }), reusable_link_id: '', open_in_new_tab: false },
        ],
      },
      {
        key: 'GET_STARTED',
        title: 'Get Started',
        enabled: true,
        sort_order: 1,
        links: [
          { id: 'getstarted_join', label: 'Join / Claim Profile', enabled: true, sort_order: 0, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/join' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'getstarted_directory', label: 'Directory', enabled: true, sort_order: 1, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Directory' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'getstarted_racers', label: 'Racers', enabled: true, sort_order: 2, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Directory?cat=drivers' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'getstarted_sponsors', label: 'Sponsors', enabled: true, sort_order: 3, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Directory?cat=sponsors' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'getstarted_vehicles', label: 'Vehicles', enabled: true, sort_order: 4, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Directory?cat=vehicles' }), reusable_link_id: '', open_in_new_tab: false },
        ],
      },
      {
        key: 'VENTURES',
        title: 'Ventures',
        enabled: true,
        sort_order: 2,
        links: [
          { id: 'ventures_tech', label: 'Tech', enabled: true, sort_order: 0, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/TechHome' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'ventures_learning', label: 'Learning', enabled: true, sort_order: 1, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Learning' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'ventures_hospitality', label: 'Hospitality', enabled: true, sort_order: 2, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Hospitality' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'ventures_foodbev', label: 'Food & Beverage', enabled: true, sort_order: 3, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/FoodBeverage' }), reusable_link_id: '', open_in_new_tab: false },
        ],
      },
      {
        key: 'COMPANY',
        title: 'Company',
        enabled: true,
        sort_order: 3,
        links: [
          { id: 'company_about', label: 'About', enabled: true, sort_order: 0, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/About' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'company_contact', label: 'Contact', enabled: true, sort_order: 1, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Contact' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'company_help', label: 'Help', enabled: true, sort_order: 2, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Help' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'company_advertise', label: 'Advertise', enabled: true, sort_order: 3, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/OutletAdvertising' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'company_submit', label: 'Submit a Story', enabled: true, sort_order: 4, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/OutletSubmit' }), reusable_link_id: '', open_in_new_tab: false },
          { id: 'company_hashtag', label: 'Hashtag Library', enabled: true, sort_order: 5, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/hashtag-library' }), reusable_link_id: '', open_in_new_tab: false },
        ],
      },
    ],
    socials: [],
    legal: [
      { id: 'legal_privacy', label: 'Privacy Policy', enabled: true, sort_order: 0, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Privacy' }), reusable_link_id: '', open_in_new_tab: false },
      { id: 'legal_terms', label: 'Terms of Service', enabled: true, sort_order: 1, destination_type: 'internal_page', destination: DEST('internal_page', { internal_page: '/Terms' }), reusable_link_id: '', open_in_new_tab: false },
    ],
    brand: {
      name: 'HIJINX',
      tagline: 'A multi-vertical platform building at the intersection of media, motorsports, and culture.',
      copyright_text: '© {year} The Hijinx Co LLC. All rights reserved.',
      built_on_purpose: 'Built on purpose.',
      show_newsletter: true,
      newsletter_label: 'STAY UPDATED',
    },
    display: {
      show_report_issue: true,
      report_label: 'Report an Issue',
    },
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
}

function validateLink(link: any, path: string, errors: string[], warnings: string[]) {
  if (!link.id) errors.push(`${path}: id required`);
  if (link.enabled) {
    if (!link.label?.trim()) errors.push(`${path}: label required for enabled link`);
    if (!link.destination_type) errors.push(`${path}: destination_type required`);
    if (link.destination_type === 'reusable_link') {
      if (!link.reusable_link_id) errors.push(`${path}: reusable_link_id required`);
    } else if (link.destination_type === 'none') {
      warnings.push(`${path}: link is enabled but has no destination`);
    } else {
      validateDestination(link.destination, path, errors, warnings);
    }
  }
}

export function validateFooterConfig(config: any) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid config', warnings: [] };
  }

  const groupKeys = new Set<string>();
  (config.groups || []).forEach((g: any, i: number) => {
    const path = `groups[${i}]`;
    if (!g.key) errors.push(`${path}: group key required`);
    if (g.key && groupKeys.has(g.key)) errors.push(`${path}: duplicate group key "${g.key}"`);
    if (g.key) groupKeys.add(g.key);
    if (g.enabled && !g.title?.trim()) errors.push(`${path}: title required for enabled group`);
    (g.links || []).forEach((l: any, j: number) => validateLink(l, `${path}.links[${j}]`, errors, warnings));
  });

  (config.legal || []).forEach((l: any, i: number) => validateLink(l, `legal[${i}]`, errors, warnings));

  if (config.brand && !config.brand.name) errors.push('brand.name required');

  return {
    valid: errors.length === 0,
    error: errors.join('; '),
    warnings,
  };
}