/**
 * driverImportHelpers.ts — Phase 3B shared helpers for bulk driver import.
 *
 * Extracted from importDriversBulk to keep the main function file manageable.
 * These helpers are specific to the identity-first bulk driver import flow.
 */

// ── Normalization helpers ────────────────────────────────────────────────────

export function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  if (!/^\d{4}$/.test(str)) return null;
  return str;
}

export function trimName(value) {
  if (!value) return '';
  return String(value).trim();
}

export function normalizeNumber(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeForMatch(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeClassName(name) {
  if (!name) return '';
  let n = name.trim().toLowerCase();
  n = n.replace(/([a-z])(\d)/g, '$1 $2');
  n = n.replace(/(\d)([a-z])/g, '$1 $2');
  n = n.replace(/[-_]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

// ── Identity name normalization (mirrors resolvePersonIdentity) ───────────────

export function normalizeIdentityName(name) {
  if (!name || typeof name !== 'string') return null;
  let n = name.trim();
  if (!n) return null;
  n = n.toLowerCase();
  n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  let prev = '';
  while (prev !== n) {
    prev = n;
    n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
  }
  return n.replace(/\s+/g, ' ').trim() || null;
}

export function confidenceLevelFromScore(score) {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'unverified';
}

// ── Phase 3B: Source key computation ─────────────────────────────────────────

export function computeSourceKey(sourceType, firstNameNorm, lastNameNorm, seriesId, seasonYear, classId, numberNorm) {
  const esc = (s) => String(s ?? '').replace(/\|/g, '||');
  return [
    esc(sourceType),
    esc(firstNameNorm),
    esc(lastNameNorm),
    esc(seriesId),
    esc(seasonYear),
    esc(classId),
    esc(numberNorm),
  ].join('|');
}

// ── Phase 3B: Trusted identity evidence detection ────────────────────────────

const TRUSTED_SIGNAL_PREFIXES = [
  'external_uid_exact',
  'license_exact',
  'dob_exact',
];

export function hasTrustedEvidence(signals) {
  if (!signals || !Array.isArray(signals)) return false;
  for (const signal of signals) {
    for (const prefix of TRUSTED_SIGNAL_PREFIXES) {
      if (signal.startsWith(prefix)) return true;
    }
  }
  return false;
}

// ── Phase 3B: Controlled fixture exclusion ───────────────────────────────────

export const FIXTURE_PERS_RACECORE_IDS = [
  'PERS000000001',
  'PERS000000002',
  'PERS000000003',
  'PERS000000004',
];

export async function loadFixtureIdentityIds(sr) {
  const ids = new Set();
  for (const racecoreId of FIXTURE_PERS_RACECORE_IDS) {
    const matches = await sr.entities.PersonIdentity
      .filter({ racecore_id: racecoreId }).catch(() => []);
    for (const m of matches) {
      if (m.id) ids.add(m.id);
    }
  }
  try {
    const fixtureRp = await sr.entities.RacerProfile.get('6a72259f243b9b77bff7bab2');
    if (fixtureRp && fixtureRp.person_identity_id) {
      ids.add(fixtureRp.person_identity_id);
    }
  } catch { /* not found */ }
  return ids;
}

// ── Phase 3B: Source link helpers ────────────────────────────────────────────

export async function findSourceLinks(sr, sourceKey) {
  return await sr.entities.DriverImportIdentityLink
    .filter({ source_key: sourceKey, is_archived: false }).catch(() => []);
}

export async function createSourceLink(sr, linkData) {
  return await sr.entities.DriverImportIdentityLink.create(linkData).catch(e => {
    return { id: null, _error: e.message };
  });
}

// ── Read-only identity matching (for dry-run) ────────────────────────────────

export async function readOnlyIdentityMatch(sr, rawDriverName, rawSeriesName, fixtureIds) {
  const normalizedName = normalizeIdentityName(rawDriverName);
  if (!normalizedName) {
    return { action: 'NEW_IDENTITY', identity_id: null, confidence: 0, signals: [] };
  }

  let bestScore = 0;
  let bestCandidate = null;
  const signals = [];

  const allIdentities = await sr.entities.PersonIdentity
    .filter({ status: 'active' }).catch(() => []);

  const allAliases = await sr.entities.IdentityAlias
    .filter({ active: true }).catch(() => []);

  const aliasMap = new Map();
  for (const alias of allAliases) {
    const key = alias.alias_normalized || normalizeIdentityName(alias.alias_name);
    if (!key) continue;
    if (!aliasMap.has(key)) aliasMap.set(key, []);
    aliasMap.get(key).push(alias);
  }

  for (const identity of allIdentities) {
    if (identity.status === 'merged') continue;
    if (fixtureIds && fixtureIds.has(identity.id)) continue;

    let score = 0;
    const candidateSignals = [];

    const identityNorm = normalizeIdentityName(identity.canonical_name);
    if (identityNorm && normalizedName === identityNorm) {
      score += 55;
      candidateSignals.push('canonical_name_match:55');
    }

    if (identity.legal_name) {
      const legalNorm = normalizeIdentityName(identity.legal_name);
      if (legalNorm && normalizedName === legalNorm) {
        score += 85;
        candidateSignals.push('legal_name_exact:85');
      }
    }

    const aliasMatches = aliasMap.get(normalizedName) || [];
    for (const alias of aliasMatches) {
      if (alias.identity_id !== identity.id) continue;
      const typeWeights = {
        legal: 85, abbreviation: 75, informal: 70,
        nickname: 60, surname_first: 55, source_variant: 50,
        manual: 50, maiden_name: 45, married_name: 45,
      };
      const w = typeWeights[alias.alias_type] || 50;
      score += w;
      candidateSignals.push('alias_' + alias.alias_type + ':' + w);
      break;
    }

    if (rawSeriesName && identity.data_source === rawSeriesName) {
      score += 15;
      candidateSignals.push('series_history:15');
    }
    if (identity.confidence_level === 'verified') {
      score += 30;
      candidateSignals.push('manual_verified_bonus:30');
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { identity, signals: candidateSignals };
    }
  }

  if (bestCandidate && bestScore > 0) {
    const confidence = Math.min(bestScore, 100);
    signals.push(...bestCandidate.signals);

    let action;
    if (confidence >= 95) action = 'ATTACHED';
    else if (confidence >= 80) action = 'REVIEW';
    else action = 'NEW_IDENTITY';

    return {
      action,
      identity_id: bestCandidate.identity.id,
      identity: bestCandidate.identity,
      confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      signals,
    };
  }

  return {
    action: 'NEW_IDENTITY',
    identity_id: null,
    confidence: 0,
    confidence_level: 'unverified',
    signals,
  };
}

// ── Series resolution ────────────────────────────────────────────────────────

export async function resolveSeries(sr, seriesValue) {
  if (!seriesValue) return { status: 'blocked', error: 'series_not_found', matches: [] };

  const trimmed = seriesValue.trim();

  try {
    const byId = await sr.entities.Series.get(trimmed);
    if (byId) return { status: 'ok', series: byId, match_method: 'internal_id' };
  } catch (e) { /* not found */ }

  let byName = await sr.entities.Series.filter({}).catch(() => []);
  const nameMatches = byName.filter(s =>
    s.name && s.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (nameMatches.length === 1) return { status: 'ok', series: nameMatches[0], match_method: 'name' };
  if (nameMatches.length > 1) {
    return {
      status: 'review',
      error: 'series_ambiguous',
      matches: nameMatches.map(s => ({ id: s.id, name: s.name })),
    };
  }

  const seriesAliases = await sr.entities.EntityAlias
    .filter({ entity_type: 'Series', active: true }).catch(() => []);
  const aliasNormalized = normalizeForMatch(trimmed);
  const aliasMatches = seriesAliases.filter(a =>
    a.alias_normalized === aliasNormalized
  );

  if (aliasMatches.length === 1) {
    const seriesId = aliasMatches[0].entity_id;
    try {
      const series = await sr.entities.Series.get(seriesId);
      if (series) return { status: 'ok', series, match_method: 'alias' };
    } catch (e) { /* not found */ }
  }
  if (aliasMatches.length > 1) {
    const seriesIds = [...new Set(aliasMatches.map(a => a.entity_id))];
    if (seriesIds.length === 1) {
      try {
        const series = await sr.entities.Series.get(seriesIds[0]);
        if (series) return { status: 'ok', series, match_method: 'alias' };
      } catch (e) { /* not found */ }
    }
    return {
      status: 'review',
      error: 'series_ambiguous',
      matches: aliasMatches.map(a => ({ id: a.entity_id, name: a.alias_name })),
    };
  }

  const normalizedTarget = normalizeForMatch(trimmed);
  const normalizedMatches = byName.filter(s =>
    s.name && normalizeForMatch(s.name) === normalizedTarget
  );

  if (normalizedMatches.length === 1) return { status: 'ok', series: normalizedMatches[0], match_method: 'normalized_name' };
  if (normalizedMatches.length > 1) {
    return {
      status: 'review',
      error: 'series_ambiguous',
      matches: normalizedMatches.map(s => ({ id: s.id, name: s.name })),
    };
  }

  return { status: 'blocked', error: 'series_not_found', matches: [] };
}

// ── Phase 3B: Class resolution with class_not_in_series ──────────────────────

export async function resolveClass(sr, seriesId, classValue) {
  if (!classValue) return { status: 'blocked', error: 'class_not_found', matches: [] };

  const trimmed = classValue.trim();

  const seriesClasses = await sr.entities.SeriesClass
    .filter({ series_id: seriesId }).catch(() => []);

  // 1. Exact internal ID
  try {
    const byId = await sr.entities.SeriesClass.get(trimmed);
    if (byId && byId.series_id === seriesId) {
      return { status: 'ok', classRecord: byId, match_method: 'internal_id' };
    }
    if (byId && byId.series_id !== seriesId) {
      const otherSeries = await sr.entities.Series.get(byId.series_id).catch(() => null);
      return {
        status: 'blocked',
        error: 'class_not_in_series',
        matches: [{
          id: byId.id,
          name: byId.class_name,
          series_id: byId.series_id,
          series_name: otherSeries?.name || null,
        }],
      };
    }
  } catch (e) { /* not found */ }

  // 2. Exact case-insensitive class_name (within this series)
  const nameMatches = seriesClasses.filter(c =>
    c.class_name && c.class_name.toLowerCase() === trimmed.toLowerCase()
  );

  if (nameMatches.length === 1) return { status: 'ok', classRecord: nameMatches[0], match_method: 'class_name' };
  if (nameMatches.length > 1) {
    return {
      status: 'review',
      error: 'class_ambiguous',
      matches: nameMatches.map(c => ({ id: c.id, name: c.class_name })),
    };
  }

  // Phase 3B: If no match in this series, check if class exists in other series
  if (nameMatches.length === 0) {
    const allClasses = await sr.entities.SeriesClass.filter({}).catch(() => []);
    const otherSeriesMatches = allClasses.filter(c =>
      c.class_name && c.class_name.toLowerCase() === trimmed.toLowerCase() && c.series_id !== seriesId
    );

    if (otherSeriesMatches.length > 0) {
      const matchesWithSeries = [];
      for (const c of otherSeriesMatches) {
        const otherSeries = await sr.entities.Series.get(c.series_id).catch(() => null);
        matchesWithSeries.push({
          id: c.id,
          name: c.class_name,
          series_id: c.series_id,
          series_name: otherSeries?.name || null,
        });
      }
      return {
        status: 'blocked',
        error: 'class_not_in_series',
        matches: matchesWithSeries,
      };
    }
  }

  // 3. EntityAlias for SeriesClass
  const classAliases = await sr.entities.EntityAlias
    .filter({ entity_type: 'SeriesClass', active: true }).catch(() => []);
  const aliasNormalized = normalizeForMatch(trimmed);
  const aliasMatches = classAliases.filter(a =>
    a.alias_normalized === aliasNormalized
  );

  const seriesClassIds = new Set(seriesClasses.map(c => c.id));
  const validAliasMatches = aliasMatches.filter(a => seriesClassIds.has(a.entity_id));

  if (validAliasMatches.length === 1) {
    const classId = validAliasMatches[0].entity_id;
    const classRecord = seriesClasses.find(c => c.id === classId);
    if (classRecord) return { status: 'ok', classRecord, match_method: 'alias' };
  }
  if (validAliasMatches.length > 1) {
    return {
      status: 'review',
      error: 'class_ambiguous',
      matches: validAliasMatches.map(a => ({ id: a.entity_id, name: a.alias_name })),
    };
  }

  // Phase 3B: Check if alias matches exist in other series
  if (validAliasMatches.length === 0 && aliasMatches.length > 0) {
    const otherAliasMatches = aliasMatches.filter(a => !seriesClassIds.has(a.entity_id));
    if (otherAliasMatches.length > 0) {
      const matchesWithSeries = [];
      for (const a of otherAliasMatches) {
        const classRecord = await sr.entities.SeriesClass.get(a.entity_id).catch(() => null);
        if (classRecord) {
          const otherSeries = await sr.entities.Series.get(classRecord.series_id).catch(() => null);
          matchesWithSeries.push({
            id: classRecord.id,
            name: classRecord.class_name,
            series_id: classRecord.series_id,
            series_name: otherSeries?.name || null,
          });
        }
      }
      if (matchesWithSeries.length > 0) {
        return {
          status: 'blocked',
          error: 'class_not_in_series',
          matches: matchesWithSeries,
        };
      }
    }
  }

  // 4. Normalized class name
  const normalizedTarget = normalizeClassName(trimmed);
  const normalizedMatches = seriesClasses.filter(c =>
    c.class_name && normalizeClassName(c.class_name) === normalizedTarget
  );

  if (normalizedMatches.length === 1) return { status: 'ok', classRecord: normalizedMatches[0], match_method: 'normalized_name' };
  if (normalizedMatches.length > 1) {
    return {
      status: 'review',
      error: 'class_ambiguous',
      matches: normalizedMatches.map(c => ({ id: c.id, name: c.class_name })),
    };
  }

  // Phase 3B: Check normalized name in other series
  if (normalizedMatches.length === 0) {
    const allClasses = await sr.entities.SeriesClass.filter({}).catch(() => []);
    const otherNormalizedMatches = allClasses.filter(c =>
      c.class_name && normalizeClassName(c.class_name) === normalizedTarget && c.series_id !== seriesId
    );

    if (otherNormalizedMatches.length > 0) {
      const matchesWithSeries = [];
      for (const c of otherNormalizedMatches) {
        const otherSeries = await sr.entities.Series.get(c.series_id).catch(() => null);
        matchesWithSeries.push({
          id: c.id,
          name: c.class_name,
          series_id: c.series_id,
          series_name: otherSeries?.name || null,
        });
      }
      return {
        status: 'blocked',
        error: 'class_not_in_series',
        matches: matchesWithSeries,
      };
    }
  }

  return { status: 'blocked', error: 'class_not_found', matches: [] };
}

// ── Legacy Driver compatibility ──────────────────────────────────────────────

export async function findCompatibleDrivers(sr, racerProfile, identity) {
  const driverIds = new Set();

  if (racerProfile.legacy_driver_id) driverIds.add(racerProfile.legacy_driver_id);
  if (identity.canonical_driver_id) driverIds.add(identity.canonical_driver_id);
  if (identity.merged_driver_ids && Array.isArray(identity.merged_driver_ids)) {
    for (const did of identity.merged_driver_ids) {
      if (did) driverIds.add(did);
    }
  }

  const drivers = [];
  for (const did of driverIds) {
    try {
      const driver = await sr.entities.Driver.get(did);
      if (driver) drivers.push(driver);
    } catch (e) { /* not found */ }
  }

  return drivers;
}

// ── Validate that referenced records still exist ─────────────────────────────

export async function validateSourceLinkRecords(sr, link) {
  const issues = [];

  if (link.person_identity_id) {
    const pi = await sr.entities.PersonIdentity.get(link.person_identity_id).catch(() => null);
    if (!pi) issues.push('person_identity_not_found');
  }
  if (link.racer_profile_id) {
    const rp = await sr.entities.RacerProfile.get(link.racer_profile_id).catch(() => null);
    if (!rp) issues.push('racer_profile_not_found');
  }
  if (link.season_participation_id) {
    const sp = await sr.entities.SeasonParticipation.get(link.season_participation_id).catch(() => null);
    if (!sp) issues.push('season_participation_not_found');
  }
  if (link.legacy_driver_id) {
    const dr = await sr.entities.Driver.get(link.legacy_driver_id).catch(() => null);
    if (!dr) issues.push('driver_not_found');
  }

  return issues;
}