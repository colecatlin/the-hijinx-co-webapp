/**
 * workbookSyncHelpers.ts — shared helpers for the daily workbook sync.
 *
 * Two concerns live here:
 *   1. RaceCore ID backfill with a duplicate-name/address guard — a record
 *      that already exists on the platform but has no RaceCore ID may receive
 *      one ONLY when no other record of the same family shares its name or
 *      its address. Anything ambiguous is flagged, never silently minted.
 *   2. Platform → workbook row mapping — turns a platform record into the
 *      input + stamp columns a workbook tab expects, so the outbound sync
 *      can append a row carrying the record's RaceCore ID.
 *
 * Used by:
 *   - workbookImportRunner.ts  (ID backfill for matched rows)
 *   - syncPlatformToWorkbook    (outbound sync)
 */

import { ensureRaceCoreId } from './racecoreId.ts';
import {
  WORKBOOK_DOMAINS, STAMP_COLUMN_NAMES, inputColumnNames,
} from './workbookTemplates.ts';
import { flattenValue } from './sheetsApi.ts';

/** Domains whose record family carries a RaceCore ID — the only ones outbound sync covers. */
export const SYNCABLE_DOMAINS = WORKBOOK_DOMAINS.filter(function (d) { return d.racecoreEntity !== null; });

// ── utilities ──────────────────────────────────────────────────────────

function normalizeName(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Safely extract an array of items from a filter() result (array or page object). */
export function pageItems(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return result.items || [];
}

// ── duplicate name/address check ───────────────────────────────────────

/**
 * Check whether any OTHER record of the same family shares this record's
 * name or its city + country. The record itself is excluded.
 *
 * Returns { hasDuplicate, reason }.
 */
export async function checkDuplicateNameOrAddress(sr, domain, record) {
  const entity = domain.racecoreEntity;
  const recordId = record.id;

  let nameMatches = [];
  let addressMatches = [];

  if (entity === 'Track') {
    const name = normalizeName(record.name || record.normalized_name);
    if (name) {
      try { nameMatches = await sr.entities.Track.filter({ normalized_name: name }); }
      catch (e) { nameMatches = []; }
    }
    // Address line is the real physical-street differentiator — two tracks can
    // share a city and country but not a street address. City+country alone is
    // never a duplicate signal.
    const addressLine = String(record.address_line1 || '').toLowerCase().trim();
    if (addressLine) {
      try { addressMatches = await sr.entities.Track.filter({ address_line1: record.address_line1 }); }
      catch (e) { addressMatches = []; }
    }
  } else if (entity === 'RacerProfile') {
    const name = normalizeName(record.display_name);
    if (name) {
      try {
        nameMatches = await sr.entities.RacerProfile.filter(
          { display_name: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' } }
        );
      } catch (e) { nameMatches = []; }
    }
    const city = record.hometown_city;
    const country = record.hometown_country;
    if (city && country) {
      try { addressMatches = await sr.entities.RacerProfile.filter({ hometown_city: city, hometown_country: country }); }
      catch (e) { addressMatches = []; }
    }
  }

  nameMatches = (pageItems(nameMatches)).filter(function (r) { return r.id !== recordId; });
  addressMatches = (pageItems(addressMatches)).filter(function (r) { return r.id !== recordId; });

  if (nameMatches.length > 0) {
    return {
      hasDuplicate: true,
      reason: 'Duplicate name — another ' + entity + ' has the same name (' +
        (nameMatches[0].name || nameMatches[0].display_name || nameMatches[0].id) + ').',
    };
  }
  if (addressMatches.length > 0) {
    return {
      hasDuplicate: true,
      reason: 'Duplicate address — another ' + entity + ' shares the same street address.',
    };
  }

  return { hasDuplicate: false, reason: '' };
}

/**
 * Ensure a record has a RaceCore ID. If it already has one, return it.
 * If not, check for duplicate name/address; only mint an ID when clear.
 *
 * Returns { ok, racecore_id, skipped, reason }.
 */
export async function ensureIdWithDuplicateCheck(base44, domain, record) {
  if (record.racecore_id) {
    return { ok: true, racecore_id: record.racecore_id, skipped: false, reason: '' };
  }

  if (!domain.racecoreEntity) {
    return { ok: false, racecore_id: null, skipped: true, reason: 'This record family has no RaceCore ID.' };
  }

  const dupCheck = await checkDuplicateNameOrAddress(base44.asServiceRole, domain, record);
  if (dupCheck.hasDuplicate) {
    return { ok: false, racecore_id: null, skipped: true, reason: dupCheck.reason };
  }

  const result = await ensureRaceCoreId(base44, domain.racecoreEntity, record.id);
  if (!result.success) {
    return { ok: false, racecore_id: null, skipped: true, reason: result.error };
  }

  return { ok: true, racecore_id: result.racecore_id, skipped: false, reason: '' };
}

// ── platform record → workbook row mapping ────────────────────────────

/**
 * Build the stamp object (keyed by stamp column name) for a synced record.
 */
export function recordToStampObject(record, action, note) {
  const name = record.name || record.display_name ||
    (record.first_name ? String(record.first_name + ' ' + (record.last_name || '')).trim() : '') || '';
  return {
    platform_name: name,
    platform_id: record.id || '',
    platform_racecore_id: record.racecore_id || '',
    platform_slug: record.slug || record.canonical_slug || '',
    last_action: action || 'synced',
    last_run_at: new Date().toISOString(),
    last_note: note || 'Synced from platform',
  };
}

/**
 * Build a full workbook row (input columns + stamp columns) for an appended record.
 * Fields that don't map directly from the platform record are left blank —
 * the admin can fill them in. The stamp columns are always complete.
 */
export function recordToFullRow(domain, record, action, note) {
  const inputCols = inputColumnNames(domain);
  const inputRow = inputCols.map(function (col) {
    if (record[col] !== undefined && record[col] !== null) {
      return flattenValue(record[col]);
    }
    // RacerProfile stores display_name, not first_name/last_name separately
    if (col === 'first_name' && record.display_name) {
      return String(record.display_name).split(' ')[0] || '';
    }
    if (col === 'last_name' && record.display_name) {
      const parts = String(record.display_name).split(' ');
      return parts.slice(1).join(' ') || '';
    }
    return '';
  });
  const stampObj = recordToStampObject(record, action, note);
  const stampRow = STAMP_COLUMN_NAMES.map(function (name) { return stampObj[name]; });
  return inputRow.concat(stampRow);
}