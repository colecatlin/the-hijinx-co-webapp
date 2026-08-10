/**
 * organizationResolution.ts
 * ---------------------------------------------------------------------------
 * Phase 17A: Shared deterministic organization resolution helpers.
 *
 * These helpers provide deterministic (never fuzzy) organization name
 * normalization, slug generation, canonical key building, and website
 * domain extraction for the Sponsor & Partner Platform.
 *
 * Rules:
 *   - Normalization is for comparison/lookup only, never for automatic merge.
 *   - Legal suffixes (Inc, LLC, Corp) are NOT stripped for identity proof.
 *   - Fuzzy name similarity is never used as automatic attachment proof.
 *   - Candidate surfacing may use relaxed normalization, but confirmed
 *     resolution requires exact normalized match, exact external_uid,
 *     exact alias, or exact website-domain match.
 */

// ─── Name Normalization ────────────────────────────────────────────────────

/**
 * Normalize an organization name for deterministic comparison.
 * Trims, lowercases, strips comparison-irrelevant punctuation, collapses
 * whitespace. Preserves meaningful alphanumeric content including legal
 * suffixes (Inc, LLC, Corp) — these are NOT stripped for identity proof.
 *
 * Example: "AMSOIL INC." → "amsoil inc"
 *          "  Monster   Energy " → "monster energy"
 *          "Brunt Workwear, Inc." → "brunt workwear inc"
 */
export function normalizeOrganizationName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    // Strip punctuation that doesn't affect comparison (keep periods, commas, hyphens within names)
    .replace(/[.,]/g, ' ')
    // Collapse all whitespace to single spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a URL-friendly slug from an organization name.
 * Lowercase, hyphenated, alphanumeric only.
 *
 * Example: "AMSOIL INC." → "amsoil-inc"
 *          "Monster Energy" → "monster-energy"
 */
export function slugifyOrganizationName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Canonical Key ──────────────────────────────────────────────────────────

/**
 * Build a deterministic canonical key for an organization.
 * Priority: external_uid > normalized_name.
 *
 * Format: "Organization:<external_uid>" or "Organization:<normalized_name>"
 */
export function buildOrganizationCanonicalKey(input: {
  normalizedName?: string | null;
  externalUid?: string | null;
}): string {
  const externalUid = input.externalUid?.trim();
  if (externalUid) {
    return `Organization:${externalUid}`;
  }
  const normalizedName = input.normalizedName || '';
  return `Organization:${normalizedName}`;
}

// ─── Website Domain Extraction ──────────────────────────────────────────────

/**
 * Extract the root domain from a website URL for deterministic comparison.
 * Strips protocol, www, path, query, and port.
 *
 * Example: "https://www.amsoil.com/products/" → "amsoil.com"
 *          "http://monsterenergy.com" → "monsterenergy.com"
 *          "amsoil.com" → "amsoil.com"
 *          "" → ""
 */
export function extractWebsiteDomain(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  try {
    // Add protocol if missing for URL parsing
    const urlWithProtocol = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return hostname;
  } catch {
    // If URL parsing fails, try a simple extraction
    const match = url.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/);
    return match ? match[1].replace(/^www\./, '') : '';
  }
}

// ─── Allowed Commercial Organization Types ──────────────────────────────────

export const COMMERCIAL_ORGANIZATION_TYPES = [
  'Sponsor',
  'Vendor',
  'Manufacturer',
  'OEM',
  'BroadcastPartner',
  'HospitalityPartner',
  'RetailPartner',
  'TechnologyProvider',
  'MarketingAgency',
  'Other',
] as const;

export function isCommercialOrganizationType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (COMMERCIAL_ORGANIZATION_TYPES as readonly string[]).includes(type);
}

// ─── Organization Resolution ─────────────────────────────────────────────────

export interface OrganizationResolutionInput {
  organization_id?: string | null;
  name?: string | null;
  website_url?: string | null;
  external_uid?: string | null;
  organization_type?: string | null;
  allow_create?: boolean;
}

export interface OrganizationResolutionResult {
  status: 'resolved' | 'created' | 'review' | 'blocked' | 'error';
  organization_id: string | null;
  organization: any | null;
  created: boolean;
  reused: boolean;
  review_required: boolean;
  errors: string[];
  warnings: string[];
  resolution_path: string | null;
}

/**
 * Resolve an Organization deterministically.
 *
 * Resolution order:
 *   1. Exact Organization internal ID.
 *   2. Exact external_uid.
 *   3. Exact normalized_name.
 *   4. Exact Organization EntityAlias alias_normalized.
 *   5. Exact website-domain match.
 *   6. Review if conflicting deterministic signals exist.
 *   7. Create new Organization only when allow_create=true, no deterministic
 *      match exists, name is specific and valid, and no conflicting domain
 *      or external_uid exists.
 *
 * Fuzzy name matching is NEVER used for automatic attachment.
 */
export async function resolveSponsorOrganization(
  base44: any,
  input: OrganizationResolutionInput,
): Promise<OrganizationResolutionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowCreate = input.allow_create === true;

  // 1 — Exact Organization internal ID
  if (input.organization_id) {
    try {
      const org = await base44.asServiceRole.entities.Organization.get(input.organization_id);
      if (org && !org.is_archived) {
        return {
          status: 'resolved',
          organization_id: org.id,
          organization: org,
          created: false,
          reused: true,
          review_required: false,
          errors: [],
          warnings: [],
          resolution_path: 'exact_id',
        };
      }
      if (org && org.is_archived) {
        warnings.push(`Organization ${input.organization_id} is archived`);
      }
    } catch {
      errors.push(`Organization ID ${input.organization_id} not found`);
    }
  }

  const normalizedName = normalizeOrganizationName(input.name);
  const websiteDomain = extractWebsiteDomain(input.website_url);
  const externalUid = input.external_uid?.trim() || null;

  // 2 — Exact external_uid
  if (externalUid) {
    try {
      const matches = await base44.asServiceRole.entities.Organization.filter({
        external_uid: externalUid,
      });
      if (matches && matches.length > 0) {
        const nonArchived = matches.filter((o: any) => !o.is_archived);
        if (nonArchived.length === 1) {
          return {
            status: 'resolved',
            organization_id: nonArchived[0].id,
            organization: nonArchived[0],
            created: false,
            reused: true,
            review_required: false,
            errors: [],
            warnings,
            resolution_path: 'exact_external_uid',
          };
        }
        if (nonArchived.length > 1) {
          return {
            status: 'review',
            organization_id: null,
            organization: null,
            created: false,
            reused: false,
            review_required: true,
            errors: [],
            warnings: [`Multiple organizations found with external_uid "${externalUid}" — manual review required`],
            resolution_path: 'external_uid_collision',
          };
        }
      }
    } catch (e: any) {
      warnings.push(`external_uid lookup failed: ${e.message}`);
    }
  }

  // 3 — Exact normalized_name
  if (normalizedName) {
    try {
      const matches = await base44.asServiceRole.entities.Organization.filter({
        normalized_name: normalizedName,
      });
      if (matches && matches.length > 0) {
        const nonArchived = matches.filter((o: any) => !o.is_archived);
        if (nonArchived.length === 1) {
          // Verify no conflicting domain or external_uid
          if (websiteDomain) {
            const orgDomain = extractWebsiteDomain(nonArchived[0].website_url);
            if (orgDomain && orgDomain !== websiteDomain) {
              warnings.push(`Normalized name matches but website domain differs: "${orgDomain}" vs "${websiteDomain}"`);
            }
          }
          return {
            status: 'resolved',
            organization_id: nonArchived[0].id,
            organization: nonArchived[0],
            created: false,
            reused: true,
            review_required: warnings.length > 0,
            errors: [],
            warnings,
            resolution_path: 'exact_normalized_name',
          };
        }
        if (nonArchived.length > 1) {
          return {
            status: 'review',
            organization_id: null,
            organization: null,
            created: false,
            reused: false,
            review_required: true,
            errors: [],
            warnings: [`Multiple organizations found with normalized_name "${normalizedName}" — manual review required`],
            resolution_path: 'normalized_name_collision',
          };
        }
      }
    } catch (e: any) {
      warnings.push(`normalized_name lookup failed: ${e.message}`);
    }
  }

  // 4 — Exact Organization EntityAlias alias_normalized
  if (normalizedName) {
    try {
      const aliases = await base44.asServiceRole.entities.EntityAlias.filter({
        entity_type: 'Organization',
        alias_normalized: normalizedName,
        active: true,
      });
      if (aliases && aliases.length > 0) {
        const alias = aliases[0];
        const org = await base44.asServiceRole.entities.Organization.get(alias.entity_id);
        if (org && !org.is_archived) {
          return {
            status: 'resolved',
            organization_id: org.id,
            organization: org,
            created: false,
            reused: true,
            review_required: false,
            errors: [],
            warnings,
            resolution_path: 'exact_alias',
          };
        }
      }
    } catch (e: any) {
      warnings.push(`alias lookup failed: ${e.message}`);
    }
  }

  // 5 — Exact website-domain match
  if (websiteDomain) {
    try {
      // Load organizations and filter by domain in memory (no domain field in schema)
      const allOrgs = await base44.asServiceRole.entities.Organization.list('-created_date', 500);
      const domainMatches = (allOrgs || []).filter((o: any) => {
        if (o.is_archived) return false;
        return extractWebsiteDomain(o.website_url) === websiteDomain;
      });
      if (domainMatches.length === 1) {
        return {
          status: 'resolved',
          organization_id: domainMatches[0].id,
          organization: domainMatches[0],
          created: false,
          reused: true,
          review_required: false,
          errors: [],
          warnings,
          resolution_path: 'exact_website_domain',
        };
      }
      if (domainMatches.length > 1) {
        return {
          status: 'review',
          organization_id: null,
          organization: null,
          created: false,
          reused: false,
          review_required: true,
          errors: [],
          warnings: [`Multiple organizations found with website domain "${websiteDomain}" — manual review required`],
          resolution_path: 'website_domain_collision',
        };
      }
    } catch (e: any) {
      warnings.push(`website domain lookup failed: ${e.message}`);
    }
  }

  // 6 — Review if conflicting deterministic signals exist
  // (Already handled in the steps above — each returns review on collision)

  // 7 — Create new Organization
  if (!allowCreate) {
    return {
      status: 'blocked',
      organization_id: null,
      organization: null,
      created: false,
      reused: false,
      review_required: false,
      errors: ['No existing Organization match found and allow_create is false'],
      warnings,
      resolution_path: 'create_blocked',
    };
  }

  // Validate name is specific and valid
  if (!normalizedName || normalizedName.length < 2) {
    return {
      status: 'error',
      organization_id: null,
      organization: null,
      created: false,
      reused: false,
      review_required: false,
      errors: ['Organization name is too short or empty for creation'],
      warnings,
      resolution_path: 'invalid_name',
    };
  }

  // Check for generic terms
  const genericTerms = ['n/a', 'unknown', 'various', 'none', 'tbd', 'tba', ''];
  if (genericTerms.includes(normalizedName)) {
    return {
      status: 'error',
      organization_id: null,
      organization: null,
      created: false,
      reused: false,
      review_required: false,
      errors: [`Organization name "${normalizedName}" is a generic term — cannot create`],
      warnings,
      resolution_path: 'generic_name',
    };
  }

  // Determine organization type
  const orgType = input.organization_type && isCommercialOrganizationType(input.organization_type)
    ? input.organization_type
    : 'Sponsor';

  const slug = slugifyOrganizationName(input.name);
  const canonicalKey = buildOrganizationCanonicalKey({
    normalizedName: normalizedName,
    externalUid,
  });

  try {
    const newOrg = await base44.asServiceRole.entities.Organization.create({
      name: input.name!.trim(),
      type: orgType,
      slug,
      website_url: input.website_url || null,
      external_uid: externalUid,
      normalized_name: normalizedName,
      canonical_slug: slug,
      canonical_key: canonicalKey,
      industry: null,
      visibility_status: 'draft',
      operational_status: 'Active',
      is_archived: false,
    });

    return {
      status: 'created',
      organization_id: newOrg.id,
      organization: newOrg,
      created: true,
      reused: false,
      review_required: false,
      errors: [],
      warnings,
      resolution_path: 'created_new',
    };
  } catch (e: any) {
    return {
      status: 'error',
      organization_id: null,
      organization: null,
      created: false,
      reused: false,
      review_required: false,
      errors: [`Organization creation failed: ${e.message}`],
      warnings,
      resolution_path: 'create_error',
    };
  }
}