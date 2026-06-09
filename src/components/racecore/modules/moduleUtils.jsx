/**
 * R9BX — RaceCore Module Utilities
 *
 * Provides the foundation for optional RaceCore modules.
 * All module checks are safe by default — missing enabled_modules
 * falls back to DEFAULT_ENABLED_MODULES for backward compatibility.
 */

/** Default modules enabled when Series.enabled_modules is missing (null/undefined). */
export const DEFAULT_ENABLED_MODULES = ['governance', 'media', 'registration'];

/** All known optional module keys. */
export const ALL_MODULE_KEYS = [
  'governance',
  'media',
  'registration',
  'licensing',
  'membership',
  'commerce',
  'hospitality',
  'crm',
  'analytics',
];

/**
 * Returns the list of enabled modules for a series.
 * - If series.enabled_modules is missing → DEFAULT_ENABLED_MODULES (backward compat)
 * - If series.enabled_modules is an empty array → [] (Core only)
 * - Otherwise → series.enabled_modules
 *
 * @param {object|null} series
 * @returns {string[]}
 */
export function getEnabledModules(series) {
  if (!series) return DEFAULT_ENABLED_MODULES;
  if (!Array.isArray(series.enabled_modules)) return DEFAULT_ENABLED_MODULES;
  return series.enabled_modules;
}

/**
 * Returns true if the given module key is enabled for this series.
 *
 * @param {object|null} series
 * @param {string} moduleKey - lowercase module key e.g. 'governance'
 * @returns {boolean}
 */
export function hasModule(series, moduleKey) {
  const modules = getEnabledModules(series);
  return modules.includes(moduleKey.toLowerCase());
}

/**
 * Shorthand: is the Governance module enabled for this series?
 * Defaults to true when enabled_modules is missing.
 *
 * @param {object|null} series
 * @returns {boolean}
 */
export function isGovernanceEnabled(series) {
  return hasModule(series, 'governance');
}

/**
 * Shorthand: is the Media module enabled for this series?
 * @param {object|null} series
 * @returns {boolean}
 */
export function isMediaEnabled(series) {
  return hasModule(series, 'media');
}

/**
 * Shorthand: is the Registration module enabled for this series?
 * @param {object|null} series
 * @returns {boolean}
 */
export function isRegistrationEnabled(series) {
  return hasModule(series, 'registration');
}