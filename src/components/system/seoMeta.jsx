import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSeoConfig } from '@/hooks/useSeoConfig';

// ── Brand constants (HARDCODED FALLBACK — never removed) ─────────────────────
// These remain the ultimate fallback when SeoSettings has no published record.
// Classification: FALLBACK (active when SeoSettings is unavailable).
export const SITE_NAME = 'HIJINX';
export const SITE_DESCRIPTION = 'Motorsports, culture, and competition — all in one place. Drivers, teams, tracks, series, and verified results on the HIJINX platform.';
export const SITE_FALLBACK_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png';
export const SITE_TWITTER_HANDLE = '@hijinxco';
export const SITE_CANONICAL_BASE = 'https://hijinx.com';

// ── Management / admin route prefixes — always noindex ───────────────────────
const NOINDEX_PREFIXES = [
  '/management',
  '/admin',
  '/racecore',
  '/race-core',
  '/race-control',
  '/Manage',
  '/Diagnostics',
  '/AnalyticsDashboard',
  '/MyDashboard',
  '/MediaPortal',
  '/ProfileSetup',
  '/ClaimUsername',
  '/Profile',
  '/checkout',
  '/cart',
  '/order-confirmation',
];

function isNoindexRoute(pathname) {
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

// ── Internal helpers ─────────────────────────────────────────────────────────
function setMetaTag(nameOrProp, value, useProperty = false) {
  if (!value) return;
  const attr = useProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, nameOrProp);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function removeMetaTag(nameOrProp, useProperty = false) {
  const attr = useProperty ? 'property' : 'name';
  const tag = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
  if (tag) tag.remove();
}

function setCanonical(url) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', url);
}

function setRobots(content) {
  setMetaTag('robots', content);
}

/**
 * SeoMeta — injects SEO meta tags into document.head.
 *
 * Props:
 *   title         – page-specific title (suffixed with "| <title_suffix>" unless noSuffix)
 *   description   – page meta description
 *   image         – OG/Twitter image URL
 *   url           – explicit canonical URL (overrides computed canonical)
 *   canonicalPath – canonical path (e.g. "/story/my-slug") — combined with canonical_base_url
 *   pageKey       – static page key in SeoSettings.pages (e.g. "home", "outlet")
 *   type          – OG type (default: 'website')
 *   noSuffix      – if true, title is used as-is (no suffix)
 *   noindex       – if true, adds robots noindex (also auto-applied on management routes)
 *
 * Resolution hierarchy (highest priority first):
 *   1. Explicit props passed to SeoMeta
 *   2. SeoSettings.pages[pageKey] (if pageKey is passed)
 *   3. SeoSettings.site defaults (if published config exists)
 *   4. Hardcoded constants (SITE_NAME, SITE_DESCRIPTION, SITE_FALLBACK_IMAGE)
 *
 * Canonical URL:
 *   1. Explicit `url` prop (query strings stripped)
 *   2. canonical_base_url + canonicalPath prop
 *   3. canonical_base_url + pages[pageKey].canonical_path
 *   4. canonical_base_url + current pathname (query strings stripped)
 *   5. window.location.href (last resort — only if no canonical_base_url)
 *
 * Admin preview URLs (?preview=...) are never canonical — query strings are
 * always stripped from computed canonicals.
 */
export default function SeoMeta({
  title,
  description,
  image,
  url,
  canonicalPath,
  pageKey,
  type,
  noSuffix = false,
  noindex = false,
}) {
  const location = useLocation();
  const { config } = useSeoConfig();

  // ── Resolve from SeoSettings ──────────────────────────────────────────────
  const site = config?.site || {};
  const defaults = config?.defaults || {};
  const pageConfig = pageKey ? (config?.pages?.[pageKey] || {}) : {};

  const siteName = site.name || SITE_NAME;
  const titleSuffix = site.title_suffix || SITE_NAME;
  const defaultDesc = site.default_description || SITE_DESCRIPTION;
  const defaultOgImage = site.default_og_image || SITE_FALLBACK_IMAGE;
  const twitterHandle = site.twitter_handle || SITE_TWITTER_HANDLE;
  const canonicalBase = site.canonical_base_url || SITE_CANONICAL_BASE;

  // ── Title ─────────────────────────────────────────────────────────────────
  const resolvedTitle = title || pageConfig.title || '';
  const fullTitle = resolvedTitle
    ? (noSuffix ? resolvedTitle : `${resolvedTitle} | ${titleSuffix}`)
    : siteName;

  // ── Description ───────────────────────────────────────────────────────────
  const desc = description || pageConfig.description || defaultDesc;

  // ── Image ──────────────────────────────────────────────────────────────────
  const ogImg = image || pageConfig.og_image || defaultOgImage;

  // ── OG type ────────────────────────────────────────────────────────────────
  const ogType = type || defaults.og_type || 'website';

  // ── Canonical URL (strip query strings — never canonicalize preview URLs) ─
  let canonical;
  if (url) {
    canonical = url.split('?')[0];
  } else if (canonicalPath) {
    canonical = canonicalBase.replace(/\/$/, '') + canonicalPath;
  } else if (pageConfig.canonical_path) {
    canonical = canonicalBase.replace(/\/$/, '') + pageConfig.canonical_path;
  } else {
    // Use current pathname (stripped of query strings) with canonical base
    const path = location.pathname || '/';
    canonical = canonicalBase.replace(/\/$/, '') + path;
  }

  // ── noindex (auto-detect management routes) ───────────────────────────────
  const autoNoindex = isNoindexRoute(location.pathname || '');
  const shouldNoindex = noindex || autoNoindex || pageConfig.noindex;
  const robotsContent = shouldNoindex ? 'noindex, nofollow' : (defaults.robots || 'index, follow');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Page title
    document.title = fullTitle;

    // Standard meta
    setMetaTag('description', desc);
    setMetaTag('application-name', siteName);

    // Robots
    setRobots(robotsContent);

    // Open Graph
    setMetaTag('og:site_name',   siteName,    true);
    setMetaTag('og:title',       fullTitle,   true);
    setMetaTag('og:description', desc,        true);
    setMetaTag('og:image',       ogImg,       true);
    setMetaTag('og:url',         canonical,   true);
    setMetaTag('og:type',        ogType,      true);
    setMetaTag('og:locale',      site.locale || 'en_US', true);

    // Twitter card
    setMetaTag('twitter:card',        defaults.twitter_card || 'summary_large_image');
    setMetaTag('twitter:site',       twitterHandle);
    setMetaTag('twitter:title',      fullTitle);
    setMetaTag('twitter:description', desc);
    setMetaTag('twitter:image',      ogImg);

    // Canonical link
    setCanonical(canonical);

    return () => {
      // Clean up robots tag on unmount so noindex doesn't leak to public pages
      // when navigating from management to public. Other tags are overwritten
      // by the next SeoMeta instance, so they don't need cleanup.
      if (autoNoindex) {
        removeMetaTag('robots');
      }
    };
  }, [fullTitle, desc, ogImg, canonical, ogType, siteName, twitterHandle, robotsContent, site.locale, defaults.twitter_card, autoNoindex]);

  return null;
}

// ── Convenience builder for entity-page titles ───────────────────────────────
export function buildEntityTitle(name, entityLabel) {
  if (!name) return null;
  return entityLabel ? `${name} | ${entityLabel}` : name;
}