/**
 * formatHomepageTickerItems
 *
 * Normalises raw ticker strings (from backend payload or live data) into
 * clean, display-ready uppercase strings for the hero ticker.
 *
 * Rules:
 * - Trim whitespace
 * - Skip blank, malformed, or ID-like strings
 * - Truncate strings longer than 55 chars
 * - Deduplicate (case-insensitive)
 * - Cap output to 8 items
 */

const MAX_LEN = 55;
const MAX_ITEMS = 8;
// Looks like a raw DB ID or numeric code — skip it
const ID_PATTERN = /^[a-f0-9-]{20,}$|^\d{6,}$/i;

export function formatHomepageTickerItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const seen = new Set();
  const output = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'string') continue;

    let text = raw.trim();
    if (!text || ID_PATTERN.test(text)) continue;

    // Truncate gracefully at a word boundary
    if (text.length > MAX_LEN) {
      text = text.slice(0, MAX_LEN).replace(/\s+\S*$/, '').trim();
      if (!text) continue;
    }

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    output.push(text.toUpperCase());
    if (output.length >= MAX_ITEMS) break;
  }

  return output;
}

/** Branded fallback when all dynamic sources are unavailable */
export const TICKER_FALLBACK = [
  'EXPLORE DRIVER PROFILES',
  'DISCOVER TRACKS AND SERIES',
  'FOLLOW EVENTS AND RESULTS',
  'READ STORIES FROM THE SPORT',
  'ENTER RACE CORE',
  'SHOP HIJINX APPAREL',
];