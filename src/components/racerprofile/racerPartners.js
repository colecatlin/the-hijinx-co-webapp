/**
 * racerPartners.js — presentation mapping for the Partners surfaces.
 *
 * Two server-computed, already-public lists reach the page:
 *   • sponsorships        — the deduped modern + legacy read for RacerProfile
 *                           (the experience function builds it with the public
 *                           active-status visibility filter already applied)
 *   • sponsor_presentation — the legacy presentation split (current vs past)
 *
 * This module only RESHAPES what is already public into one display shape. It
 * performs no deduplication logic, no status interpretation beyond choosing
 * which already-split list to read, and no backend call. Internal sponsorship
 * status wording is never carried into the display shape.
 */

function yearOf(value) {
  if (!value) return null;
  const text = String(value);
  return text.length >= 4 ? text.slice(0, 4) : null;
}

function yearRange(start, end) {
  const from = yearOf(start);
  const to = yearOf(end);
  if (from && to && from !== to) return `${from}–${to}`;
  if (from) return `${from}–`;
  if (to) return to;
  return null;
}

/** From the deduped modern + legacy sponsorship read. */
function fromSponsorships(list) {
  return (list || [])
    .map((item) => ({
      name: item?.organization_name || null,
      logo: item?.organization_logo_url || null,
      url: item?.organization_website_url || null,
      tier: item?.tier || null,
      primary: false,
      season: item?.season_year || yearRange(item?.start_date, item?.end_date),
    }))
    .filter((partner) => partner.name);
}

/** From the legacy presentation split. */
function fromPresentation(list) {
  return (list || [])
    .map((item) => ({
      name: item?.sponsor_name || null,
      logo: item?.sponsor_logo_url || null,
      url: item?.sponsor_url || null,
      tier: item?.tier || null,
      primary: item?.is_primary === true,
      season: yearRange(item?.start_date, item?.end_date),
    }))
    .filter((partner) => partner.name);
}

/** Current partner relationships. */
export function resolveCurrentPartners(sponsorships = [], sponsorPresentation = null) {
  const fromModern = fromSponsorships(sponsorships);
  if (fromModern.length > 0) return fromModern;
  return fromPresentation(sponsorPresentation?.current_sponsors);
}

/** Previous partner relationships, where the archived presentation exists. */
export function resolvePreviousPartners(sponsorPresentation = null) {
  return fromPresentation(sponsorPresentation?.historical_sponsors);
}

/** Tier is a relationship level, not a status — rendered as a readable label. */
export function formatPartnerTier(tier) {
  if (!tier) return null;
  return String(tier)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}