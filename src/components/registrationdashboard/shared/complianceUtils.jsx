/**
 * Compliance state storage and parsing utilities.
 * Compliance data is stored in Entry.notes as:
 * INDEX46_COMPLIANCE_JSON: { waiver: {...}, license: {...} }
 */

const COMPLIANCE_PREFIX = 'INDEX46_COMPLIANCE_JSON:';

/**
 * Parse compliance data from Entry.notes string.
 * Returns the compliance object if found, or a default empty state.
 */
export function parseComplianceFromNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return getDefaultCompliance();
  }

  if (!notes.includes(COMPLIANCE_PREFIX)) {
    return getDefaultCompliance();
  }

  try {
    const jsonStr = notes.split(COMPLIANCE_PREFIX)[1].trim();
    // Extract JSON object (handle case where notes has multiple prefixed blocks)
    const match = jsonStr.match(/^\{[\s\S]*?\}/);
    if (!match) return getDefaultCompliance();
    const parsed = JSON.parse(match[0]);
    return {
      waiver: parsed.waiver || getDefaultWaiver(),
      license: parsed.license || getDefaultLicense(),
    };
  } catch (err) {
    console.warn('[complianceUtils] Failed to parse compliance JSON:', err);
    return getDefaultCompliance();
  }
}

/**
 * Write compliance data to Entry.notes, preserving any other prefixed blocks.
 */
export function writeComplianceToNotes(currentNotes, nextCompliance) {
  if (!currentNotes || typeof currentNotes !== 'string') {
    return `${COMPLIANCE_PREFIX} ${JSON.stringify(nextCompliance)}`;
  }

  // Remove old compliance block if present
  let preserved = currentNotes;
  if (preserved.includes(COMPLIANCE_PREFIX)) {
    const parts = preserved.split(COMPLIANCE_PREFIX);
    const before = parts[0];
    const after = parts[1];
    // Find where the JSON object ends
    const match = after.match(/^\{[\s\S]*?\}([\s\S]*)/);
    preserved = before + (match ? match[1] : '');
  }

  // Append new compliance block
  const newBlock = `${COMPLIANCE_PREFIX} ${JSON.stringify(nextCompliance)}`;
  return (preserved + ' ' + newBlock).trim();
}

/**
 * Compute license status: 'missing', 'verified', or 'expired'
 */
export function computeLicenseStatus(compliance) {
  if (!compliance || !compliance.license) return 'missing';
  const { license } = compliance;

  if (license.status === 'verified' && license.expires_on) {
    const today = new Date().toISOString().split('T')[0];
    if (license.expires_on < today) return 'expired';
  }

  return license.status || 'missing';
}

/**
 * Check if waiver is verified
 */
export function isWaiverVerified(compliance) {
  return compliance?.waiver?.status === 'verified';
}

/**
 * Check if license is in a good state (verified and not expired)
 */
export function isLicenseVerified(compliance) {
  if (!compliance?.license) return false;
  const status = computeLicenseStatus(compliance);
  return status === 'verified';
}

/**
 * Create a new waiver state
 */
export function createWaiverState(verified = false, verifiedByUserId = null) {
  return {
    status: verified ? 'verified' : 'missing',
    verified_at: verified ? new Date().toISOString() : null,
    verified_by_user_id: verified ? verifiedByUserId : null,
  };
}

/**
 * Create a new license state
 */
export function createLicenseState(
  licenseNumber = null,
  expiresOn = null,
  verified = false,
  verifiedByUserId = null
) {
  return {
    status: verified ? 'verified' : licenseNumber ? 'missing' : 'missing',
    license_number: licenseNumber,
    expires_on: expiresOn,
    verified_at: verified ? new Date().toISOString() : null,
    verified_by_user_id: verified ? verifiedByUserId : null,
  };
}

// Defaults
function getDefaultCompliance() {
  return {
    waiver: getDefaultWaiver(),
    license: getDefaultLicense(),
  };
}

function getDefaultWaiver() {
  return {
    status: 'missing',
    verified_at: null,
    verified_by_user_id: null,
  };
}

function getDefaultLicense() {
  return {
    status: 'missing',
    license_number: null,
    expires_on: null,
    verified_at: null,
    verified_by_user_id: null,
  };
}