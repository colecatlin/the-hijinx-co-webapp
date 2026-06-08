/**
 * detectOperationalDrift.js
 *
 * READ-ONLY diagnostics function that detects operational consistency failures.
 * Never mutates any data.
 *
 * Checks:
 *   1. Event lifecycle divergence (status vs public_status vs published_flag)
 *   2. Result lifecycle divergence (Session.status vs Result.status_state)
 *   3. Stale standings (Results newer than latest standings last_calculated)
 *   4. Import staging age (records older than retention_days)
 *
 * Input:  { retention_days?: number, limit?: number }
 * Output: { ok, checks, drift_count, report }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Expected mappings: Event.status → { public_status, published_flag }
const EVENT_STATUS_MAP = {
  'Draft':           { public_status: 'draft',      published_flag: false },
  'PendingApproval': { public_status: 'pending',    published_flag: false },
  'Published':       { public_status: 'published',  published_flag: true  },
  'Live':            { public_status: 'live',        published_flag: true  },
  'Completed':       { public_status: 'completed',  published_flag: true  },
  'Cancelled':       { public_status: 'cancelled',  published_flag: false },
  'Archived':        { public_status: 'archived',   published_flag: false },
};

// Session.status → expected Result.status_state
const SESSION_TO_STATUS_STATE = {
  'Draft':       'Draft',
  'Provisional': 'Provisional',
  'Official':    'Official',
  'Locked':      'Locked',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const retention_days = body.retention_days || 30;
    const limit = body.limit || 300;

    const db = base44.asServiceRole;
    const report = {};
    let total_drift = 0;

    // ── CHECK 1: Event Lifecycle Divergence ──────────────────────────────────
    try {
      const events = await db.entities.Event.list('-created_date', limit);
      const drifted = [];

      for (const event of events) {
        const expected = EVENT_STATUS_MAP[event.status];
        if (!expected) continue; // unknown status — skip

        const pubFlagMismatch = event.published_flag !== expected.published_flag;
        const pubStatusMismatch = event.public_status !== expected.public_status;

        if (pubFlagMismatch || pubStatusMismatch) {
          drifted.push({
            event_id: event.id,
            event_name: event.name,
            status: event.status,
            actual_public_status: event.public_status,
            expected_public_status: expected.public_status,
            actual_published_flag: event.published_flag,
            expected_published_flag: expected.published_flag,
            drift_fields: [
              ...(pubStatusMismatch ? ['public_status'] : []),
              ...(pubFlagMismatch ? ['published_flag'] : []),
            ],
          });
        }
      }

      report.event_lifecycle_divergence = {
        total_checked: events.length,
        drifted_count: drifted.length,
        drifted: drifted.slice(0, 50),
        status: drifted.length === 0 ? 'clean' : 'drift_detected',
      };
      total_drift += drifted.length;
    } catch (err) {
      report.event_lifecycle_divergence = { status: 'error', error: err.message };
    }

    // ── CHECK 2: Result Lifecycle Divergence ─────────────────────────────────
    try {
      const sessions = await db.entities.Session.list('-created_date', 500);
      const sessionMap = {};
      sessions.forEach(s => { sessionMap[s.id] = s; });

      const results = await db.entities.Results.list('-created_date', limit);
      const drifted = [];

      for (const result of results) {
        if (!result.session_id) continue;
        const session = sessionMap[result.session_id];
        if (!session) continue;

        const expectedStatusState = SESSION_TO_STATUS_STATE[session.status];
        if (!expectedStatusState) continue;

        if (result.status_state && result.status_state !== expectedStatusState) {
          drifted.push({
            result_id: result.id,
            session_id: result.session_id,
            session_name: session.name,
            session_status: session.status,
            expected_status_state: expectedStatusState,
            actual_status_state: result.status_state,
          });
        }
      }

      report.result_lifecycle_divergence = {
        total_checked: results.filter(r => r.session_id).length,
        drifted_count: drifted.length,
        drifted: drifted.slice(0, 50),
        status: drifted.length === 0 ? 'clean' : 'drift_detected',
      };
      total_drift += drifted.length;
    } catch (err) {
      report.result_lifecycle_divergence = { status: 'error', error: err.message };
    }

    // ── CHECK 3: Stale Standings ─────────────────────────────────────────────
    try {
      const standings = await db.entities.Standings.list('-last_calculated', 200);
      const results = await db.entities.Results.list('-updated_date', 200);

      // Find latest result per series+season
      const latestResultBySeries = {};
      for (const result of results) {
        if (!result.series_id || !result.updated_date) continue;
        const key = `${result.series_id}:${result.series_class_id || 'all'}`;
        const existing = latestResultBySeries[key];
        if (!existing || new Date(result.updated_date) > new Date(existing.updated_date)) {
          latestResultBySeries[key] = result;
        }
      }

      // Find latest standings calc per series+season
      const latestStandingsBySeries = {};
      for (const standing of standings) {
        if (!standing.series_id || !standing.last_calculated) continue;
        const key = `${standing.series_id}:${standing.series_class_id || 'all'}`;
        const existing = latestStandingsBySeries[key];
        if (!existing || new Date(standing.last_calculated) > new Date(existing.last_calculated)) {
          latestStandingsBySeries[key] = standing;
        }
      }

      const stale = [];
      for (const [key, result] of Object.entries(latestResultBySeries)) {
        const standing = latestStandingsBySeries[key];
        if (!standing) {
          stale.push({
            series_key: key,
            series_id: result.series_id,
            latest_result_updated: result.updated_date,
            last_standings_calculated: null,
            reason: 'no_standings_record',
          });
        } else if (new Date(result.updated_date) > new Date(standing.last_calculated)) {
          stale.push({
            series_key: key,
            series_id: result.series_id,
            latest_result_updated: result.updated_date,
            last_standings_calculated: standing.last_calculated,
            reason: 'results_newer_than_standings',
          });
        }
      }

      report.stale_standings = {
        series_checked: Object.keys(latestResultBySeries).length,
        stale_count: stale.length,
        stale: stale.slice(0, 30),
        status: stale.length === 0 ? 'clean' : 'drift_detected',
      };
      total_drift += stale.length;
    } catch (err) {
      report.stale_standings = { status: 'error', error: err.message };
    }

    // ── CHECK 4: Import Staging Age ──────────────────────────────────────────
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retention_days);

      const COMPLETED_STATUSES = new Set(['created', 'completed', 'applied', 'skipped', 'rejected', 'conflict']);
      const STAGING_ENTITIES = [
        'ImportedResultStaging',
        'ImportedStandingStaging',
        'ImportedEventStaging',
        'ImportedClassStaging',
      ];

      const aged = {};
      let total_aged = 0;

      for (const entityName of STAGING_ENTITIES) {
        const entity = db.entities[entityName];
        if (!entity) continue;

        let records = [];
        try { records = await entity.list('-created_date', 300); } catch { continue; }

        const expired = records.filter(r => {
          const isCompleted = COMPLETED_STATUSES.has(r.import_status || r.status || '');
          const createdDate = r.created_date ? new Date(r.created_date) : null;
          return isCompleted && createdDate && createdDate < cutoff;
        });

        aged[entityName] = { total: records.length, expired: expired.length };
        total_aged += expired.length;
      }

      report.import_staging_age = {
        retention_days,
        cutoff_date: cutoff.toISOString(),
        total_expired: total_aged,
        by_entity: aged,
        status: total_aged === 0 ? 'clean' : 'cleanup_recommended',
      };
      if (total_aged > 0) total_drift += 1; // count as 1 issue category
    } catch (err) {
      report.import_staging_age = { status: 'error', error: err.message };
    }

    return Response.json({
      ok: true,
      drift_count: total_drift,
      overall_status: total_drift === 0 ? 'clean' : 'drift_detected',
      checks: Object.keys(report),
      report,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});