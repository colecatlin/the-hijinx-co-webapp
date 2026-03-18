/**
 * runUnsafeWritePathAudit.js
 *
 * Manually maintained audit map of all known source entity write paths.
 * Updated whenever a new write path is added or patched.
 *
 * source_path values align with triggered_from metadata in OperationLog so any
 * future duplicate can be traced back to the originating path.
 *
 * Risk levels:
 *   low    — operational entity writes (Entry, Results, etc.) — never touch source entities
 *   medium — sync flows that use syncSourceAndEntityRecord but were previously risky
 *   high   — any path that still uses raw create/update on a source entity
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const WRITE_PATH_REGISTRY = [
  // ── Management UI save paths ──────────────────────────────────────────────
  {
    source_path: 'manage_driver',
    file: 'components/management/DriverManagement/DriverCoreDetailsSection',
    entity_types: ['driver'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'Routes through syncSourceAndEntityRecord with triggered_from=manage_driver',
  },
  {
    source_path: 'management_ui',
    file: 'components/management/TrackManagement/TrackCoreDetailsSection',
    entity_types: ['track'],
    sync_mode: 'sync_pipeline',
    uses_prepare: true,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'prepareSourcePayloadForSync + syncSourceAndEntityRecord',
  },
  {
    source_path: 'management_ui',
    file: 'components/management/SeriesManagement/SeriesCoreDetailsSection',
    entity_types: ['series'],
    sync_mode: 'sync_pipeline',
    uses_prepare: true,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'prepareSourcePayloadForSync + syncSourceAndEntityRecord',
  },
  {
    source_path: 'driver_form',
    file: 'components/management/DriverForm',
    entity_types: ['driver'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'syncSourceAndEntityRecord with triggered_from=driver_form',
  },
  {
    source_path: 'track_form',
    file: 'components/management/TrackForm',
    entity_types: ['track'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'syncSourceAndEntityRecord with triggered_from=track_form',
  },
  {
    source_path: 'series_form',
    file: 'components/management/SeriesForm',
    entity_types: ['series'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'syncSourceAndEntityRecord with triggered_from=series_form',
  },
  {
    source_path: 'team_form',
    file: 'components/management/TeamForm',
    entity_types: ['team'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'syncSourceAndEntityRecord with triggered_from=team_form',
  },

  // ── EventBuilder (Management) ─────────────────────────────────────────────
  {
    source_path: 'event_builder',
    file: 'components/management/EventBuilder/EventBuilderForm',
    entity_types: ['event'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'syncSourceAndEntityRecord for both create and update. No raw writes.',
  },

  // ── EventCoreDetailsSection inline edit (patched 2026-03-12) ─────────────
  {
    source_path: 'event_core_details',
    file: 'components/management/EventManagement/EventCoreDetailsSection',
    entity_types: ['event'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'PATCHED 2026-03-12: was raw Event.update. Now syncSourceAndEntityRecord.',
  },
  {
    source_path: 'event_core_quick_create_series',
    file: 'components/management/EventManagement/EventCoreDetailsSection',
    entity_types: ['series'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'PATCHED 2026-03-12: was raw Series.create. Now syncSourceAndEntityRecord.',
  },
  {
    source_path: 'event_core_quick_create_track',
    file: 'components/management/EventManagement/EventCoreDetailsSection',
    entity_types: ['track'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'PATCHED 2026-03-12: was raw Track.create. Now syncSourceAndEntityRecord.',
  },

  // ── SmartCSVImport ────────────────────────────────────────────────────────
  {
    source_path: 'smart_csv_import',
    file: 'functions/smartCSVImport.js',
    entity_types: ['driver', 'team', 'track', 'series', 'event'],
    sync_mode: 'sync_pipeline',
    uses_prepare: true,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'prepareSourcePayloadForSync + syncSourceAndEntityRecord for all source entity types. Operational entities use direct create (intentional).',
  },

  // ── NASCAR Schedule Sync ──────────────────────────────────────────────────
  {
    source_path: 'nascar_schedule_sync',
    file: 'functions/syncNascarScheduleToEvents.js',
    entity_types: ['track', 'series', 'event'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'All track, series, and event writes go through syncSourceAndEntityRecord.',
  },

  // ── NASCAR Calendar Sync (ICS) ────────────────────────────────────────────
  {
    source_path: 'nascar_calendar_sync',
    file: 'functions/syncNascarCalendar.js',
    entity_types: ['series', 'event'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'Both series and event writes go through syncSourceAndEntityRecord.',
  },

  // ── NASCAR Driver Import (patched 2026-03-12) ─────────────────────────────
  {
    source_path: 'nascar_driver_import',
    file: 'functions/importNascarDrivers.js',
    entity_types: ['driver', 'team', 'series'],
    sync_mode: 'sync_pipeline',
    uses_prepare: false,
    uses_sync: true,
    uses_upsert: true,
    risk: 'low',
    note: 'PATCHED 2026-03-12: was local raw upsertEntity helper for driver/team/series. Now syncSourceAndEntityRecord.',
  },

  // ── Operational boundary — these paths must NOT create source entities ─────
  {
    source_path: 'registration_entry_create',
    file: 'components/registrationdashboard/EntriesManager (and related)',
    entity_types: ['entry'],
    sync_mode: 'operational_only',
    uses_prepare: false,
    uses_sync: false,
    uses_upsert: false,
    risk: 'low',
    note: 'Operational entity only. Must never create Driver/Track/Series/Event silently.',
  },
  {
    source_path: 'results_import',
    file: 'components/registrationdashboard/ResultsManager (and related)',
    entity_types: ['results'],
    sync_mode: 'operational_only',
    uses_prepare: false,
    uses_sync: false,
    uses_upsert: false,
    risk: 'low',
    note: 'Operational entity only. If driver/event resolution fails, row is surfaced as unresolved — not silently created.',
  },
  {
    source_path: 'standings_calc',
    file: 'components/registrationdashboard/standingsCalculator',
    entity_types: ['standings'],
    sync_mode: 'operational_only',
    uses_prepare: false,
    uses_sync: false,
    uses_upsert: false,
    risk: 'low',
    note: 'Operational entity only. Reads source entities, writes only Standings records.',
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const high_risk_paths   = WRITE_PATH_REGISTRY.filter(p => p.risk === 'high');
    const medium_risk_paths = WRITE_PATH_REGISTRY.filter(p => p.risk === 'medium');
    const safe_paths        = WRITE_PATH_REGISTRY.filter(p => p.risk === 'low');

    // Cross-check with recent OperationLog for any source_entity_created/updated
    // entries that have no source_path — these indicate raw writes that bypassed the pipeline.
    const recentLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_entity_created' },
      '-created_date',
      100
    ).catch(() => []);

    const logsWithoutSourcePath = recentLogs.filter(log => {
      const meta = log.metadata || {};
      return !meta.source_path && !meta.triggered_from;
    });

    const registeredSourcePaths = new Set(WRITE_PATH_REGISTRY.map(p => p.source_path));
    const unknownSourcePaths = recentLogs
      .filter(log => {
        const meta = log.metadata || {};
        const path = meta.source_path || meta.triggered_from;
        return path && !registeredSourcePaths.has(path);
      })
      .map(log => ({
        log_id: log.id,
        entity_type: log.entity_name,
        source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
        created_at: log.created_date,
      }));

    return Response.json({
      high_risk_paths,
      medium_risk_paths,
      safe_paths,
      logs_without_source_path: logsWithoutSourcePath.slice(0, 20),
      unknown_source_paths: unknownSourcePaths.slice(0, 20),
      summary: {
        total_paths_checked: WRITE_PATH_REGISTRY.length,
        unsafe_count: high_risk_paths.length + medium_risk_paths.length,
        safe_count: safe_paths.length,
        recent_logs_without_source_path: logsWithoutSourcePath.length,
        unknown_source_paths_count: unknownSourcePaths.length,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});