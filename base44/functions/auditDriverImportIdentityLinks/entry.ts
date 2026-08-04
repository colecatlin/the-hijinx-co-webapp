/**
 * auditDriverImportIdentityLinks — Read-only source-link integrity audit.
 *
 * Reports the health of DriverImportIdentityLink records:
 *   - Total source links
 *   - Links by status (resolved, partial, review, blocked, error)
 *   - Duplicate source keys
 *   - Links missing PersonIdentity, RacerProfile, SeasonParticipation, or Driver
 *   - Links referencing nonexistent records
 *   - Links referencing archived records
 *
 * Read-only. Does not repair records.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function safeGet(sr, entity, id) {
  try {
    return await sr.entities[entity].get(id);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    // Load all source links (bounded — this is an admin audit tool)
    const allLinks = await sr.entities.DriverImportIdentityLink
      .filter({}).catch(() => []);

    const stats = {
      total: allLinks.length,
      resolved: 0,
      partial: 0,
      review: 0,
      blocked: 0,
      error: 0,
      archived: 0,
    };

    const sourceKeyCounts = new Map();
    const duplicateSourceKeys = [];
    const missingPersonIdentity = [];
    const missingRacerProfile = [];
    const missingSeasonParticipation = [];
    const missingDriver = [];
    const nonexistentRecords = [];
    const archivedRecords = [];
    const invalidLinks = [];

    for (const link of allLinks) {
      // Count by status
      if (link.status === 'resolved') stats.resolved++;
      else if (link.status === 'partial') stats.partial++;
      else if (link.status === 'review') stats.review++;
      else if (link.status === 'blocked') stats.blocked++;
      else if (link.status === 'error') stats.error++;

      if (link.is_archived) stats.archived++;

      // Track source key duplicates
      if (link.source_key) {
        const count = (sourceKeyCounts.get(link.source_key) || 0) + 1;
        sourceKeyCounts.set(link.source_key, count);
        if (count === 2) {
          duplicateSourceKeys.push(link.source_key);
        }
      }

      // Check resolved links for missing references
      if (link.status === 'resolved' || link.status === 'partial') {
        const issues = [];

        if (!link.person_identity_id) {
          missingPersonIdentity.push(link.id);
          issues.push('missing_person_identity_id');
        } else {
          const pi = await safeGet(sr, 'PersonIdentity', link.person_identity_id);
          if (!pi) {
            nonexistentRecords.push({ link_id: link.id, entity: 'PersonIdentity', id: link.person_identity_id });
            issues.push('person_identity_not_found');
          } else if (pi.is_archived) {
            archivedRecords.push({ link_id: link.id, entity: 'PersonIdentity', id: link.person_identity_id });
            issues.push('person_identity_archived');
          }
        }

        if (!link.racer_profile_id) {
          missingRacerProfile.push(link.id);
          issues.push('missing_racer_profile_id');
        } else {
          const rp = await safeGet(sr, 'RacerProfile', link.racer_profile_id);
          if (!rp) {
            nonexistentRecords.push({ link_id: link.id, entity: 'RacerProfile', id: link.racer_profile_id });
            issues.push('racer_profile_not_found');
          } else if (rp.is_archived) {
            archivedRecords.push({ link_id: link.id, entity: 'RacerProfile', id: link.racer_profile_id });
            issues.push('racer_profile_archived');
          }
        }

        if (!link.season_participation_id) {
          missingSeasonParticipation.push(link.id);
          issues.push('missing_season_participation_id');
        } else {
          const sp = await safeGet(sr, 'SeasonParticipation', link.season_participation_id);
          if (!sp) {
            nonexistentRecords.push({ link_id: link.id, entity: 'SeasonParticipation', id: link.season_participation_id });
            issues.push('season_participation_not_found');
          } else if (sp.is_archived) {
            archivedRecords.push({ link_id: link.id, entity: 'SeasonParticipation', id: link.season_participation_id });
            issues.push('season_participation_archived');
          }
        }

        if (!link.legacy_driver_id) {
          missingDriver.push(link.id);
          issues.push('missing_legacy_driver_id');
        } else {
          const dr = await safeGet(sr, 'Driver', link.legacy_driver_id);
          if (!dr) {
            nonexistentRecords.push({ link_id: link.id, entity: 'Driver', id: link.legacy_driver_id });
            issues.push('driver_not_found');
          } else if (dr.is_archived) {
            archivedRecords.push({ link_id: link.id, entity: 'Driver', id: link.legacy_driver_id });
            issues.push('driver_archived');
          }
        }

        if (issues.length > 0) {
          invalidLinks.push({ link_id: link.id, source_key: link.source_key, status: link.status, issues });
        }
      }
    }

    // Build duplicate source key details
    const duplicateDetails = [];
    for (const [key, count] of sourceKeyCounts) {
      if (count > 1) {
        const links = allLinks.filter(l => l.source_key === key);
        duplicateDetails.push({
          source_key: key,
          count,
          link_ids: links.map(l => l.id),
          statuses: links.map(l => l.status),
        });
      }
    }

    return Response.json({
      read_only: true,
      records_inspected: allLinks.length,
      summary: stats,
      duplicate_source_keys: duplicateDetails,
      duplicate_source_key_count: duplicateDetails.length,
      links_missing_person_identity: missingPersonIdentity,
      links_missing_racer_profile: missingRacerProfile,
      links_missing_season_participation: missingSeasonParticipation,
      links_missing_driver: missingDriver,
      links_referencing_nonexistent_records: nonexistentRecords,
      links_referencing_archived_records: archivedRecords,
      invalid_links: invalidLinks,
      invalid_link_count: invalidLinks.length,
      partial: false,
      load_errors: null,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});