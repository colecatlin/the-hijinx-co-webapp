/**
 * pasteDriverUtils.js
 * Utilities for driver quick-create in historical results paste workflow.
 * Handles name splitting, normalization, dedup, and driver payload building.
 */

/**
 * Normalize a name: trim, lowercase, collapse spaces
 */
export function normalizeName(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Convert name to URL slug: lowercase, replace spaces with dash, remove special chars
 */
export function toSlug(str) {
  return normalizeName(str)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

/**
 * Split a driver name into first_name and last_name
 * Handles:
 *   "John Smith" → {first: "John", last: "Smith"}
 *   "Bob Van Der Berg" → {first: "Bob", last: "Van Der Berg"}
 *   "Smith, John" → {first: "John", last: "Smith"} (detected as reversed)
 *   "Smith" → {first: "Smith", last: ""} (single-word, warns)
 */
export function splitDriverName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { first_name: '', last_name: '' };

  // Check for comma (surname-first format)
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map(s => s.trim());
    return { first_name: first || last, last_name: last };
  }

  const parts = trimmed.replace(/\s+/g, ' ').split(' ');
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

/**
 * Build the full normalized name from split parts
 */
export function buildNormalizedName(firstName, lastName) {
  const parts = [firstName, lastName].filter(Boolean);
  return normalizeName(parts.join(' '));
}

/**
 * Resolve a driver from the existing drivers list by normalized full name
 * Returns:
 *   { status: "matched", driver: DriverRecord }
 *   { status: "unmatched", driver: null }
 *   { status: "ambiguous", driver: null, count: 2+ }
 */
export function resolveDriverMatch(firstName, lastName, drivers = []) {
  const targetName = buildNormalizedName(firstName, lastName);
  if (!targetName) return { status: 'unmatched', driver: null };

  const matches = drivers.filter(d =>
    buildNormalizedName(d.first_name, d.last_name) === targetName
  );

  if (matches.length === 0) return { status: 'unmatched', driver: null };
  if (matches.length === 1) return { status: 'matched', driver: matches[0] };
  return { status: 'ambiguous', driver: null, count: matches.length };
}

/**
 * Build minimal driver creation payload
 */
export function buildMinimalDriverPayload(firstName, lastName) {
  const normalized = buildNormalizedName(firstName, lastName);
  const slug = toSlug(normalized);
  const canonicalKey = `driver:${slug}`;

  return {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    visibility_status: 'draft',
    racing_status: 'Active',
    data_source: 'historical_paste_import',
    normalized_name: normalized,
    canonical_slug: slug,
    canonical_key: canonicalKey,
  };
}

/**
 * Check if a name is a single-word (no space, no comma)
 */
export function isSingleWordName(fullName) {
  const trimmed = (fullName || '').trim();
  return !trimmed.includes(' ') && !trimmed.includes(',');
}