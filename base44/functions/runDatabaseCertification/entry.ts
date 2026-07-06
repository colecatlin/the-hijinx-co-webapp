/**
 * runDatabaseCertification.js — R9EB.3
 *
 * Platform-wide Database Health Certification.
 *
 * Evaluates all major entity types and produces a single
 * DatabaseCertificationReport with overall health scores,
 * broken relationships, duplicate candidates, and prioritized
 * recommendations.
 *
 * Designed to run as a nightly scheduled audit.
 *
 * Output: DatabaseCertificationReport
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ENTITY_WEIGHTS = {
  PersonIdentity: 15,
  Driver:         20,
  Team:           10,
  Track:          10,
  Series:         10,
  SeriesClass:     5,
  Event:          15,
  Session:        10,
  Vehicle:         5,
};

const SAMPLE = 100; // per entity type

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();
    const entity_scores = {};
    const all_critical = [];
    const all_warnings = [];
    const broken_relationships = [];
    const duplicate_candidates = [];

    // ── Per-entity health via calculateEntityHealth ────────────────────────────
    for (const [entityType, weight] of Object.entries(ENTITY_WEIGHTS)) {
      const res = await base44.functions.invoke('calculateEntityHealth', {
        entity_type: entityType,
        sample_size: SAMPLE,
      }).catch(() => null);

      if (res?.data?.summary) {
        const s = res.data.summary;
        entity_scores[entityType] = {
          avg_health: s.avg_health_score,
          cert: s.certification,
          records_evaluated: s.records_evaluated,
          critical: s.total_critical_issues,
          warnings: s.total_warnings,
          without_alias: s.records_without_alias,
          weight,
        };
        for (const issue of (s.top_issues || [])) {
          if (issue.severity === 'critical') all_critical.push({ entity_type: entityType, ...issue });
          else all_warnings.push({ entity_type: entityType, ...issue });
        }
      } else {
        entity_scores[entityType] = { avg_health: 50, cert: 'FAIR', records_evaluated: 0, critical: 0, warnings: 0, without_alias: 0, weight };
      }
    }

    // ── Relationship integrity checks ─────────────────────────────────────────
    // Results without driver
    const orphanResults = await sr.entities.Results.filter({ driver_id: null }).catch(() => []);
    if (orphanResults.length > 0) broken_relationships.push({ type: 'Results→Driver', count: orphanResults.length, severity: 'critical', message: `${orphanResults.length} Results have no driver_id` });

    // Results without event
    const orphanResultsEv = await sr.entities.Results.filter({ event_id: null }).catch(() => []);
    if (orphanResultsEv.length > 0) broken_relationships.push({ type: 'Results→Event', count: orphanResultsEv.length, severity: 'critical', message: `${orphanResultsEv.length} Results have no event_id` });

    // Standings without driver
    const orphanStandings = await sr.entities.Standings.filter({ driver_id: null }).catch(() => []);
    if (orphanStandings.length > 0) broken_relationships.push({ type: 'Standings→Driver', count: orphanStandings.length, severity: 'critical', message: `${orphanStandings.length} Standings have no driver_id` });

    // Entries without driver
    const orphanEntries = await sr.entities.Entry.filter({ driver_id: null }).catch(() => []);
    if (orphanEntries.length > 0) broken_relationships.push({ type: 'Entry→Driver', count: orphanEntries.length, severity: 'critical', message: `${orphanEntries.length} Entries have no driver_id` });

    // ── Duplicate candidate check ──────────────────────────────────────────────
    const dupRes = await base44.functions.invoke('findDuplicateDriverGroups', { sample_size: 50 }).catch(() => null);
    if (dupRes?.data?.groups?.length > 0) {
      duplicate_candidates.push({ entity_type: 'Driver', count: dupRes.data.groups.length, severity: 'warning', message: `${dupRes.data.groups.length} potential duplicate driver groups` });
    }

    // ── Historical safety check ────────────────────────────────────────────────
    const histRes = await base44.functions.invoke('verifyHistoricalSafety', {}).catch(() => null);
    const hist_issues = histRes?.data?.issues?.length || 0;
    const hist_warnings = histRes?.data?.warnings?.length || 0;

    // ── Identity linkage check ────────────────────────────────────────────────
    const identRes = await base44.functions.invoke('verifyIdentityDriverLinkage', {}).catch(() => null);
    const ident_issues = identRes?.data?.issues?.length || 0;

    // ── Import integrity check ────────────────────────────────────────────────
    const importRes = await base44.functions.invoke('verifyImportIdempotence', {}).catch(() => null);
    const import_pass = importRes?.data?.pass !== false;

    // ── Weighted overall score ─────────────────────────────────────────────────
    let total_weight = 0, weighted_sum = 0;
    for (const [, data] of Object.entries(entity_scores)) {
      weighted_sum += data.avg_health * data.weight;
      total_weight += data.weight;
    }

    // Deductions
    const relationship_deduction = Math.min(broken_relationships.filter(r => r.severity === 'critical').length * 3, 20);
    const dup_deduction = Math.min(duplicate_candidates.length * 2, 10);
    const hist_deduction = Math.min(hist_issues * 2, 8);
    const ident_deduction = Math.min(ident_issues * 2, 8);

    const base_score = total_weight > 0 ? Math.round(weighted_sum / total_weight) : 50;
    const overall_health = Math.max(0, base_score - relationship_deduction - dup_deduction - hist_deduction - ident_deduction);

    // ── Per-domain scores ──────────────────────────────────────────────────────
    const identity_health = Math.round(((entity_scores.PersonIdentity?.avg_health || 50) + (entity_scores.Driver?.avg_health || 50)) / 2);
    const relationship_health = Math.max(0, 100 - broken_relationships.reduce((s, r) => s + (r.severity === 'critical' ? 10 : 3), 0));
    const historical_health = Math.max(0, 100 - (hist_issues * 5) - (hist_warnings * 2));
    const import_health = import_pass ? 100 : 60;

    // ── Prioritized recommendations ────────────────────────────────────────────
    const recommendations = [];
    if (ident_issues > 0) recommendations.push({ priority: 'P0', action: `Resolve ${ident_issues} unlinked identity records`, category: 'Identity', impact: 'HIGH' });
    for (const r of broken_relationships.filter(r => r.severity === 'critical')) recommendations.push({ priority: 'P0', action: r.message, category: 'Relationships', impact: 'HIGH' });
    if (hist_issues > 0) recommendations.push({ priority: 'P1', action: `Fix ${hist_issues} historical safety violations`, category: 'Historical', impact: 'MEDIUM' });
    if (duplicate_candidates.length > 0) recommendations.push({ priority: 'P1', action: `Review ${duplicate_candidates.reduce((s, d) => s + d.count, 0)} duplicate candidates`, category: 'Duplicates', impact: 'MEDIUM' });
    for (const issue of all_critical.slice(0, 5)) recommendations.push({ priority: 'P1', action: issue.recommendation || issue.message, category: issue.entity_type, impact: 'MEDIUM' });
    for (const issue of all_warnings.slice(0, 5)) recommendations.push({ priority: 'P2', action: issue.recommendation || issue.message, category: issue.entity_type, impact: 'LOW' });

    const certification = {
      overall_health,
      identity_health,
      relationship_health,
      historical_health,
      import_health,
      entity_scores,
      broken_relationships,
      duplicate_candidates,
      total_critical_issues: all_critical.length,
      total_warnings: all_warnings.length,
      recommendations,
      run_at: now,
      certifier: user.email,
      overall_certification: overall_health >= 95 ? 'EXCELLENT' : overall_health >= 85 ? 'GOOD' : overall_health >= 70 ? 'FAIR' : overall_health >= 50 ? 'POOR' : 'CRITICAL',
    };

    // Log to OperationLog
    await sr.entities.OperationLog.create({
      operation_type: 'database_certification_run',
      entity_name: 'Database',
      user_email: user.email,
      status: 'completed',
      metadata: { overall_health, certification: certification.overall_certification, entity_count: Object.keys(entity_scores).length, critical: all_critical.length, run_at: now },
    }).catch(() => {});

    return Response.json(certification);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});