/**
 * Shared Entry helpers for Race Core tabs
 */

export function buildEntryKey(entry) {
  return `${entry.event_id}:${entry.driver_id}`;
}

export const defaultComplianceFlags = {
  missingWaiver: false,
  expiredLicense: false,
  duplicateCarNumber: false,
  missingTransponder: false,
};

export function parseFlags(flagsJson) {
  if (!flagsJson) return { ...defaultComplianceFlags };
  try {
    const parsed = typeof flagsJson === 'string' ? JSON.parse(flagsJson) : flagsJson;
    return { ...defaultComplianceFlags, ...parsed };
  } catch {
    return { ...defaultComplianceFlags };
  }
}

export function writeFlags(flags) {
  return JSON.stringify(flags);
}