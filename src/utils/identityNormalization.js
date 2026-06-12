/**
 * identityNormalization.js
 *
 * Shared identity normalization helpers for driver name matching.
 * Used by resolvePersonIdentity, findDuplicateDriverGroups, and import pipelines.
 *
 * Key behaviors:
 *   - "C.J. Greaves"   → "cj greaves"
 *   - "C J Greaves"    → "cj greaves"      (collapse space-separated initials)
 *   - "Greaves, CJ"    → "cj greaves"      (surname-first inversion)
 *   - 'C.J. "The Kid" Greaves' → "cj greaves"  (strip quoted nicknames)
 */

/**
 * Strip quoted nicknames from a name string.
 * Handles both single and double quotes.
 * Example: C.J. "The Kid" Greaves → C.J. Greaves
 */
export function stripQuotedNicknames(name) {
  if (!name) return name;
  return name
    .replace(/"[^"]*"/g, '')   // "The Kid"
    .replace(/'[^']*'/g, '')   // 'The Kid'
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect if a name is in surname-first format: "Greaves, CJ"
 * Returns true if the name contains a comma (heuristic).
 */
export function detectSurnameFirst(name) {
  if (!name) return false;
  return /^[^,]+,\s*.+$/.test(name.trim());
}

/**
 * Invert a surname-first name to given-surname order.
 * "Greaves, CJ" → "CJ Greaves"
 */
function invertSurnameFirst(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  const surname = parts[0].trim();
  const given   = parts.slice(1).join(',').trim();
  return `${given} ${surname}`;
}

/**
 * Normalize space-separated initials to collapsed form.
 * Matches sequences like "C J" or "C. J." at the start of a name.
 * "C J Greaves"   → "CJ Greaves"
 * "C. J. Greaves" → "CJ Greaves"  (punctuation stripped first)
 */
export function normalizeInitials(name) {
  if (!name) return name;
  // After punctuation is stripped, collapse single-char tokens separated by spaces
  // e.g. "c j greaves" → "cj greaves"
  return name.replace(/\b([a-z])\s+(?=[a-z]\b)/g, '$1');
}

/**
 * Build a consistent alias lookup key from any name string.
 * This is the same value stored in IdentityAlias.alias_normalized.
 */
export function buildIdentityAliasKey(name) {
  return normalizeIdentityName(name);
}

/**
 * Primary normalization function. Converts any driver name format
 * to a canonical lowercase, punctuation-free, space-collapsed string.
 *
 * Resolution order:
 *   1. Null/empty guard
 *   2. Strip quoted nicknames ("The Kid")
 *   3. Detect and invert surname-first (Greaves, CJ → CJ Greaves)
 *   4. Lowercase
 *   5. Remove all punctuation (dots, hyphens, apostrophes, etc.)
 *   6. Collapse whitespace
 *   7. Collapse space-separated single-letter initials (c j → cj)
 *
 * Examples:
 *   "CJ Greaves"              → "cj greaves"
 *   "C.J. Greaves"            → "cj greaves"
 *   "C J Greaves"             → "cj greaves"
 *   "Greaves, CJ"             → "cj greaves"
 *   'C.J. "The Kid" Greaves'  → "cj greaves"
 *   "Christopher Greaves"     → "christopher greaves"
 *   "Jr." suffix              → stripped
 *
 * @param {string} name
 * @returns {string|null}
 */
export function normalizeIdentityName(name) {
  if (!name || typeof name !== 'string') return null;

  let n = name.trim();
  if (!n) return null;

  // Step 1: Strip quoted nicknames
  n = stripQuotedNicknames(n);

  // Step 2: Detect and invert surname-first
  if (detectSurnameFirst(n)) {
    n = invertSurnameFirst(n);
  }

  // Step 3: Lowercase
  n = n.toLowerCase();

  // Step 4: Strip common suffixes (jr, sr, ii, iii, iv, v)
  n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/g, '').trim();

  // Step 5: Remove all non-alphanumeric characters (punctuation, dots, hyphens)
  n = n.replace(/[^a-z0-9\s]/g, ' ');

  // Step 6: Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();

  // Step 7: Collapse space-separated single-letter initials
  // e.g. "c j greaves" → "cj greaves"
  // Repeatedly collapse until stable (handles "c j k name" chains)
  let prev = '';
  while (prev !== n) {
    prev = n;
    n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
  }
  n = n.replace(/\s+/g, ' ').trim();

  return n || null;
}