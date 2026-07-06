/**
 * calculateEntityHealth.js — R9EB.3
 *
 * Entity Health Score Engine.
 *
 * Computes a multi-dimensional health score for any supported entity.
 * Returns a rich HealthProfile object usable in dashboards, audits, and
 * nightly certification runs.
 *
 * Supported entity types:
 *   PersonIdentity, Driver, Team, Track, Series, SeriesClass,
 *   Event, Session, Vehicle
 *
 * Health dimensions (each 0–100):
 *   - completeness_score:    Required + recommended fields present
 *   - confidence_score:      Source authority & verification signals
 *   - relationship_score:    All linked entities resolve correctly
 *   - verification_score:    How officially verified the record is
 *   - source_authority_score: Provenance chain quality
 *
 * Overall health_score = weighted average of all dimensions.
 *
 * Input:  { entity_type, entity_id?, sample_size? }
 *   entity_id absent → batch evaluate all records of that type (up to sample_size)
 *
 * Output: { entity_type, health_profiles[], summary, certification }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Field definitions per entity type ─────────────────────────────────────────
const FIELD_RULES = {
  Driver: {
    required:    ['first_name', 'last_name'],
    recommended: ['primary_number', 'primary_discipline', 'hometown_city', 'hometown_country', 'normalized_name', 'canonical_key'],
    identity_fields: ['date_of_birth', 'contact_email'],
    governance_fields: ['external_uid', 'data_source'],
  },
  PersonIdentity: {
    required:    ['canonical_name'],
    recommended: ['date_of_birth', 'nationality', 'canonical_driver_id', 'confidence_score'],
    identity_fields: ['legal_name', 'license_number', 'external_uid'],
    governance_fields: ['verified_by', 'verification_source'],
  },
  Team: {
    required:    ['name'],
    recommended: ['headquarters_city', 'country', 'primary_discipline', 'normalized_name', 'canonical_key'],
    identity_fields: ['founded_year', 'description_summary'],
    governance_fields: ['external_uid', 'data_source'],
  },
  Track: {
    required:    ['name', 'location_city', 'location_country'],
    recommended: ['location_state', 'track_type', 'surface_type', 'normalized_name', 'canonical_key'],
    identity_fields: ['latitude', 'longitude', 'length'],
    governance_fields: ['external_uid', 'data_source', 'website_url'],
  },
  Series: {
    required:    ['name', 'discipline'],
    recommended: ['full_name', 'sanctioning_body', 'geographic_scope', 'normalized_name', 'canonical_key'],
    identity_fields: ['season_year', 'description'],
    governance_fields: ['external_uid', 'data_source'],
  },
  SeriesClass: {
    required:    ['series_id', 'class_name'],
    recommended: ['competition_level', 'geographic_scope', 'vehicle_type'],
    identity_fields: ['description_summary'],
    governance_fields: [],
  },
  Event: {
    required:    ['name', 'event_date'],
    recommended: ['series_id', 'track_id', 'season', 'normalized_name', 'canonical_key'],
    identity_fields: ['round_number', 'end_date'],
    governance_fields: ['external_uid', 'data_source'],
  },
  Session: {
    required:    ['event_id', 'session_type', 'name'],
    recommended: ['series_class_id', 'event_day_id', 'normalized_name', 'canonical_key'],
    identity_fields: ['round_number', 'points_enabled', 'scheduled_time'],
    governance_fields: ['external_uid', 'data_source'],
  },
  Vehicle: {
    required:    [],
    recommended: ['manufacturer', 'model', 'year', 'vehicle_type'],
    identity_fields: ['transponder_default_id', 'number_default'],
    governance_fields: [],
  },
};

// Source authority weights
const SOURCE_AUTHORITY = {
  official_verification: 100,
  official_roster:       95,
  timing_sheet:          90,
  series_roster:         88,
  api_feed:              85,
  historical_archive:    80,
  csv_import:            70,
  website_scrape:        65,
  manual_entry:          60,
  driver_self_report:    50,
  unknown:               30,
};

function scoreCompleteness(record, rules) {
  if (!rules) return 50;
  let score = 0;
  let total = 0;

  // Required: 50% weight
  const reqWeight = 50 / Math.max(rules.required.length, 1);
  for (const f of rules.required) {
    total += reqWeight;
    if (record[f] !== null && record[f] !== undefined && record[f] !== '') score += reqWeight;
  }

  // Recommended: 30% weight
  const recWeight = 30 / Math.max(rules.recommended.length, 1);
  for (const f of rules.recommended) {
    total += recWeight;
    if (record[f] !== null && record[f] !== undefined && record[f] !== '') score += recWeight;
  }

  // Identity: 15% weight
  const idWeight = 15 / Math.max(rules.identity_fields.length, 1);
  for (const f of rules.identity_fields) {
    total += idWeight;
    if (record[f] !== null && record[f] !== undefined && record[f] !== '') score += idWeight;
  }

  // Governance: 5% weight
  const govWeight = 5 / Math.max(rules.governance_fields.length, 1);
  for (const f of rules.governance_fields) {
    total += govWeight;
    if (record[f] !== null && record[f] !== undefined && record[f] !== '') score += govWeight;
  }

  return Math.round(Math.min((score / Math.max(total, 1)) * 100, 100));
}

function scoreSourceAuthority(record) {
  const src = record.source_type || record.data_source || 'unknown';
  for (const [key, weight] of Object.entries(SOURCE_AUTHORITY)) {
    if (src.toLowerCase().includes(key)) return weight;
  }
  return 40;
}

function scoreVerification(record, entityType) {
  let score = 0;
  if (record.confidence_level === 'verified') score = 100;
  else if (record.confidence_level === 'high') score = 80;
  else if (record.confidence_level === 'medium') score = 60;
  else if (record.confidence_level === 'low') score = 35;
  else if (record.verified || record.visibility_status === 'live') score = 70;
  else if (record.external_uid) score = 65;
  else if (record.canonical_key) score = 50;
  else score = 20;

  // Bonus for specific verifications
  if (record.verified_by) score = Math.min(score + 10, 100);
  if (record.license_number) score = Math.min(score + 10, 100);
  return score;
}

function buildIssues(record, entityType, rules, relationships = {}) {
  const issues = [];

  // Missing required fields
  for (const f of (rules?.required || [])) {
    if (!record[f] || record[f] === '') {
      issues.push({ severity: 'critical', field: f, message: `Required field "${f}" is missing`, category: 'completeness', recommendation: `Add ${f} to complete this record` });
    }
  }

  // Missing recommended fields
  for (const f of (rules?.recommended || [])) {
    if (!record[f] || record[f] === '') {
      issues.push({ severity: 'warning', field: f, message: `Recommended field "${f}" is missing`, category: 'completeness', recommendation: `Add ${f} for better record quality` });
    }
  }

  // Missing canonical key
  if (!record.canonical_key && entityType !== 'PersonIdentity' && entityType !== 'SeriesClass' && entityType !== 'Vehicle') {
    issues.push({ severity: 'warning', field: 'canonical_key', message: 'Missing canonical_key — deduplication may fail', category: 'identity', recommendation: 'Run backfill normalization for this entity type' });
  }

  // Missing EntityAlias
  if (!relationships.has_alias) {
    issues.push({ severity: 'warning', field: 'alias', message: 'No EntityAlias registered', category: 'identity', recommendation: 'Register at least one canonical alias for reliable import resolution' });
  }

  // Driver-specific
  if (entityType === 'Driver') {
    if (!relationships.has_identity) {
      issues.push({ severity: 'critical', field: 'identity', message: 'No PersonIdentity linked', category: 'relationship', recommendation: 'Run createPersonIdentityFromDriver or resolvePersonIdentity to link this driver' });
    }
    if (!relationships.has_program) {
      issues.push({ severity: 'info', field: 'program', message: 'No DriverProgram recorded', category: 'completeness', recommendation: 'Add at least one DriverProgram to establish series history' });
    }
  }

  // Track-specific
  if (entityType === 'Track') {
    if (!record.latitude || !record.longitude) {
      issues.push({ severity: 'info', field: 'coordinates', message: 'Missing GPS coordinates', category: 'completeness', recommendation: 'Add latitude/longitude via Google Places or manual entry' });
    }
    if (!record.track_type) {
      issues.push({ severity: 'warning', field: 'track_type', message: 'Track type not classified', category: 'completeness', recommendation: 'Set track_type (Oval, Road Course, Off-Road, etc.)' });
    }
  }

  // Event-specific
  if (entityType === 'Event') {
    if (!record.series_id) {
      issues.push({ severity: 'warning', field: 'series_id', message: 'Event not linked to a Series', category: 'relationship', recommendation: 'Link this event to a Series for standings and classification' });
    }
    if (!record.track_id) {
      issues.push({ severity: 'warning', field: 'track_id', message: 'Event not linked to a Track', category: 'relationship', recommendation: 'Link this event to a Track for venue context' });
    }
    if (!relationships.has_sessions) {
      issues.push({ severity: 'warning', field: 'sessions', message: 'No sessions found for this event', category: 'relationship', recommendation: 'Create at least one Session to enable results tracking' });
    }
  }

  // Session-specific
  if (entityType === 'Session') {
    if (!record.series_class_id) {
      issues.push({ severity: 'warning', field: 'series_class_id', message: 'Session not linked to a SeriesClass', category: 'relationship', recommendation: 'Link session to a SeriesClass for standings accuracy' });
    }
    if (record.points_enabled && !record.round_number) {
      issues.push({ severity: 'critical', field: 'round_number', message: 'Points-enabled session missing round_number', category: 'completeness', recommendation: 'Set round_number for this session — standings calculations depend on it' });
    }
  }

  // PersonIdentity-specific
  if (entityType === 'PersonIdentity') {
    if (!record.canonical_driver_id) {
      issues.push({ severity: 'critical', field: 'canonical_driver_id', message: 'No canonical Driver linked', category: 'relationship', recommendation: 'Link to a Driver record to complete the identity chain' });
    }
    if (!record.date_of_birth && !record.external_uid) {
      issues.push({ severity: 'warning', field: 'disambiguators', message: 'No DOB or external_uid — identity disambiguation weak', category: 'identity', recommendation: 'Add date_of_birth or external_uid to strengthen identity confidence' });
    }
  }

  return issues;
}

function computeHealthScore(completeness, confidence, relationship, verification, sourceAuthority) {
  // Weighted composite
  return Math.round(
    completeness      * 0.25 +
    (confidence || 0) * 0.20 +
    relationship      * 0.25 +
    verification      * 0.15 +
    sourceAuthority   * 0.15
  );
}

async function evaluateEntity(sr, entityType, record) {
  const rules = FIELD_RULES[entityType];

  // Completeness
  const completeness_score = scoreCompleteness(record, rules);

  // Confidence (use stored score if available, else derive)
  const confidence_score = record.confidence_score || (record.confidence_level === 'verified' ? 100 : record.confidence_level === 'high' ? 80 : record.external_uid ? 65 : 40);

  // Source authority
  const source_authority_score = scoreSourceAuthority(record);

  // Verification
  const verification_score = scoreVerification(record, entityType);

  // Relationships — check key links
  let relationship_score = 100;
  const relationships = {};

  // Alias check (all entity types)
  const aliases = await sr.entities.EntityAlias.filter({ entity_type: entityType, entity_id: record.id, active: true }).catch(() => []);
  relationships.has_alias = aliases.length > 0;
  if (!relationships.has_alias) relationship_score -= 15;

  // Type-specific relationship checks
  if (entityType === 'Driver') {
    const identity = await sr.entities.PersonIdentity.filter({ canonical_driver_id: record.id }).catch(() => []);
    relationships.has_identity = identity.length > 0;
    if (!relationships.has_identity) relationship_score -= 25;
    const programs = await sr.entities.DriverProgram.filter({ driver_id: record.id }).catch(() => []);
    relationships.has_program = programs.length > 0;
    if (!relationships.has_program) relationship_score -= 10;
  }

  if (entityType === 'Event') {
    const sessions = await sr.entities.Session.filter({ event_id: record.id }).catch(() => []);
    relationships.has_sessions = sessions.length > 0;
    if (!relationships.has_sessions) relationship_score -= 20;
    if (!record.series_id) relationship_score -= 15;
    if (!record.track_id) relationship_score -= 10;
  }

  if (entityType === 'Session') {
    if (!record.event_id) relationship_score -= 30;
    if (!record.series_class_id) relationship_score -= 15;
    if (record.points_enabled && !record.round_number) relationship_score -= 20;
  }

  if (entityType === 'PersonIdentity') {
    const hasDriver = !!record.canonical_driver_id;
    relationships.has_driver = hasDriver;
    if (!hasDriver) relationship_score -= 30;
  }

  if (entityType === 'SeriesClass') {
    if (!record.series_id) relationship_score -= 40;
  }

  relationship_score = Math.max(0, relationship_score);

  // Build issues
  const issues = buildIssues(record, entityType, rules, relationships);
  const critical_count = issues.filter(i => i.severity === 'critical').length;
  const warning_count  = issues.filter(i => i.severity === 'warning').length;

  // Penalize for critical issues
  const criticalPenalty = critical_count * 10;

  const health_score = Math.max(0, computeHealthScore(completeness_score, confidence_score, relationship_score, verification_score, source_authority_score) - criticalPenalty);

  const name = record.canonical_name || record.name || record.class_name || (record.first_name ? `${record.first_name} ${record.last_name}` : null) || record.id;

  return {
    entity_id: record.id,
    entity_type: entityType,
    entity_name: name,
    health_score,
    completeness_score,
    confidence_score: Math.round(confidence_score),
    relationship_score,
    verification_score,
    source_authority_score,
    issues,
    critical_count,
    warning_count,
    issue_count: issues.length,
    certification: health_score >= 90 ? 'EXCELLENT' : health_score >= 75 ? 'GOOD' : health_score >= 55 ? 'FAIR' : health_score >= 35 ? 'POOR' : 'CRITICAL',
    recommendations: issues.filter(i => i.severity === 'critical').map(i => i.recommendation),
    aliases_count: aliases.length,
    relationships,
    evaluated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, entity_id = null, sample_size = 50 } = body;

    const SUPPORTED = ['PersonIdentity', 'Driver', 'Team', 'Track', 'Series', 'SeriesClass', 'Event', 'Session', 'Vehicle'];
    if (!entity_type || !SUPPORTED.includes(entity_type)) {
      return Response.json({ error: `Unsupported entity_type. Supported: ${SUPPORTED.join(', ')}` }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Single entity or batch
    let records = [];
    if (entity_id) {
      const record = await sr.entities[entity_type].get(entity_id).catch(() => null);
      if (!record) return Response.json({ error: `${entity_type} not found: ${entity_id}` }, { status: 404 });
      records = [record];
    } else {
      records = await sr.entities[entity_type].list('-created_date', Math.min(sample_size, 200)).catch(() => []);
    }

    // Evaluate each record
    const health_profiles = [];
    for (const record of records) {
      const profile = await evaluateEntity(sr, entity_type, record);
      health_profiles.push(profile);
    }

    // Summary
    const avg_health = health_profiles.length > 0 ? Math.round(health_profiles.reduce((s, p) => s + p.health_score, 0) / health_profiles.length) : 0;
    const cert_breakdown = { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0, CRITICAL: 0 };
    for (const p of health_profiles) cert_breakdown[p.certification]++;

    const total_critical = health_profiles.reduce((s, p) => s + p.critical_count, 0);
    const total_warnings = health_profiles.reduce((s, p) => s + p.warning_count, 0);
    const without_alias  = health_profiles.filter(p => !p.relationships.has_alias).length;

    const summary = {
      entity_type,
      records_evaluated: health_profiles.length,
      avg_health_score: avg_health,
      certification: avg_health >= 90 ? 'EXCELLENT' : avg_health >= 75 ? 'GOOD' : avg_health >= 55 ? 'FAIR' : 'POOR',
      cert_breakdown,
      total_critical_issues: total_critical,
      total_warnings,
      records_without_alias: without_alias,
      top_issues: health_profiles
        .flatMap(p => p.issues.filter(i => i.severity === 'critical').map(i => ({ entity_name: p.entity_name, ...i })))
        .slice(0, 10),
      evaluated_at: new Date().toISOString(),
    };

    return Response.json({ entity_type, health_profiles, summary });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});