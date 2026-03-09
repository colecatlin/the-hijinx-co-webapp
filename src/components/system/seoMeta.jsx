import { useEffect } from 'react';

// ── Brand constants ──────────────────────────────────────────────────────────
export const SITE_NAME = 'HIJINX';
export const SITE_DESCRIPTION = 'Motorsports, culture, and competition — all in one place. Drivers, teams, tracks, series, and verified results on the HIJINX platform.';
export const SITE_FALLBACK_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png';

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

function setCanonical(url) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', url);
}

// ── SeoMeta component ────────────────────────────────────────────────────────
/**
 * SeoMeta — injects SEO meta tags into document.head.
 *
 * Props:
 *   title       – page-specific title (will be suffixed with "| HIJINX")
 *   description – page meta description
 *   image       – OG/Twitter image URL (falls back to site default)
 *   url         – canonical URL (falls back to window.location.href)
 *   type        – OG type (default: 'website')
 *   noSuffix    – if true, title is used as-is (no "| HIJINX" suffix)
 */
export default function SeoMeta({ title, description, image, url, type = 'website', noSuffix = false }) {
  const fullTitle = title
    ? (noSuffix ? title : `${title} | ${SITE_NAME}`)
    : SITE_NAME;
  const desc   = description || SITE_DESCRIPTION;
  const ogImg  = image       || SITE_FALLBACK_IMAGE;
  const canonical = url || (typeof window !== 'undefined' ? window.location.href : '');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Page title
    document.title = fullTitle;

    // Standard meta
    setMetaTag('description', desc);
    setMetaTag('application-name', SITE_NAME);

    // Open Graph
    setMetaTag('og:site_name',   SITE_NAME,   true);
    setMetaTag('og:title',       fullTitle,   true);
    setMetaTag('og:description', desc,        true);
    setMetaTag('og:image',       ogImg,       true);
    setMetaTag('og:url',         canonical,   true);
    setMetaTag('og:type',        type,        true);

    // Twitter card
    setMetaTag('twitter:card',        'summary_large_image');
    setMetaTag('twitter:site',        '@hijinxco');
    setMetaTag('twitter:title',       fullTitle);
    setMetaTag('twitter:description', desc);
    setMetaTag('twitter:image',       ogImg);

    // Canonical link
    setCanonical(canonical);
  }, [fullTitle, desc, ogImg, canonical, type]);

  return null;
}

// ── Convenience builder for entity-page titles ───────────────────────────────
export function buildEntityTitle(name, entityLabel) {
  if (!name) return null;
  return entityLabel ? `${name} | ${entityLabel}` : name;
}