/**
 * seoDefaults.ts
 *
 * Default SEO configuration — seeded from the CURRENT visible site metadata.
 * These values guarantee that when SeoSettings is wired to the public
 * SeoMeta component, the site remains visually and meta-identical to today.
 *
 * Shared by getSeoSettings, saveSeoDraft, and publishSeo.
 *
 * Config structure:
 *   site:     — site-wide identity (name, title suffix, default description, canonical base URL, default OG image, twitter handle)
 *   defaults: — fallback OG type, twitter card type, default robots directive
 *   pages:    — static page SEO records keyed by page key (home, outlet, index46, apparel, marketplace, directory)
 *   indexing: — indexing controls (management/admin always noindex — hardcoded, not configurable here)
 *   sitemap:  — sitemap configuration (enabled flag)
 */

const SITE_FALLBACK_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png';

export function getDefaultSeoConfig() {
  return {
    site: {
      name: 'HIJINX',
      title_suffix: 'HIJINX',
      default_description: 'Motorsports, culture, and competition — all in one place. Drivers, teams, tracks, series, and verified results on the HIJINX platform.',
      canonical_base_url: 'https://hijinx.com',
      default_og_image: SITE_FALLBACK_IMAGE,
      twitter_handle: '@hijinxco',
      locale: 'en_US',
    },
    defaults: {
      og_type: 'website',
      twitter_card: 'summary_large_image',
      robots: 'index, follow',
    },
    pages: {
      home: {
        title: 'Motorsports, Culture, and Competition',
        description: 'HIJINX — where motorsports, media, and culture collide.',
        og_image: '',
        canonical_path: '/',
        noindex: false,
      },
      outlet: {
        title: 'The Outlet',
        description: 'Short course off-road media — race reports, culture stories, and editorial from the HIJINX team.',
        og_image: '',
        canonical_path: '/OutletHome',
        noindex: false,
      },
      index46: {
        title: 'INDEX46 — Motorsports Directory',
        description: 'The complete motorsports directory — drivers, teams, tracks, series, events, and vehicles on the HIJINX platform.',
        og_image: '',
        canonical_path: '/MotorsportsHome',
        noindex: false,
      },
      apparel: {
        title: 'Apparel',
        description: 'HIJINX apparel and merchandise — motorsports culture, on and off the track.',
        og_image: '',
        canonical_path: '/ApparelHome',
        noindex: false,
      },
      marketplace: {
        title: 'Marketplace',
        description: 'The HIJINX marketplace — motorsports gear, parts, and vehicles.',
        og_image: '',
        canonical_path: '/MarketplaceHome',
        noindex: false,
      },
      directory: {
        title: 'Directory',
        description: 'Browse the full HIJINX motorsports directory — racers, teams, tracks, series, events, vehicles, and sponsors.',
        og_image: '',
        canonical_path: '/Directory',
        noindex: false,
      },
    },
    indexing: {
      // Management/admin routes are ALWAYS noindex — hardcoded in SeoMeta and robots.txt.
      // This field is reserved for future safe indexing controls.
      management_noindex: true,
      legacy_noindex: true,
    },
    sitemap: {
      enabled: true,
    },
  };
}

/**
 * Validate a SeoSettings draft. Returns { valid, error, warnings }.
 * Only structural errors block save/publish. Content quality issues are warnings.
 */
export function validateSeoConfig(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid configuration', warnings: [] };
  }

  const warnings = [];

  const site = config.site || {};
  if (!site.name || typeof site.name !== 'string') {
    return { valid: false, error: 'site.name is required', warnings };
  }
  if (!site.title_suffix || typeof site.title_suffix !== 'string') {
    return { valid: false, error: 'site.title_suffix is required', warnings };
  }
  if (site.canonical_base_url) {
    try {
      new URL(site.canonical_base_url);
    } catch {
      return { valid: false, error: 'site.canonical_base_url must be a valid URL', warnings };
    }
  }

  // Content quality warnings (non-blocking)
  if (site.default_description && site.default_description.length > 200) {
    warnings.push('Default description is potentially long (over 200 characters).');
  }
  if (site.default_description && site.default_description.length < 50) {
    warnings.push('Default description is potentially short (under 50 characters).');
  }

  const pages = config.pages || {};
  const seenTitles = {};
  for (const [key, page] of Object.entries(pages)) {
    if (!page || typeof page !== 'object') continue;
    if (page.title && page.title.length > 70) {
      warnings.push(`Page "${key}" title is potentially long (over 70 characters).`);
    }
    if (page.title && page.title.length < 10) {
      warnings.push(`Page "${key}" title is potentially short (under 10 characters).`);
    }
    if (page.description && page.description.length > 200) {
      warnings.push(`Page "${key}" description is potentially long (over 200 characters).`);
    }
    if (page.description && page.description.length < 50) {
      warnings.push(`Page "${key}" description is potentially short (under 50 characters).`);
    }
    if (page.canonical_path && !page.canonical_path.startsWith('/')) {
      warnings.push(`Page "${key}" canonical_path should start with "/".`);
    }
    if (page.title) {
      if (seenTitles[page.title]) {
        warnings.push(`Duplicate title across pages "${seenTitles[page.title]}" and "${key}".`);
      } else {
        seenTitles[page.title] = key;
      }
    }
  }

  return { valid: true, warnings };
}