/**
 * Resolve Source References for Operational Row
 * 
 * Core helper for operational imports (Entry, Results, Standings).
 * Resolves all required source entity references SAFELY without creating missing source entities.
 * 
 * Rules:
 * - source entities define identity
 * - operational rows must attach to existing source entities
 * - missing source references are unresolved, not silently created
 * - weak matches are surfaced as unresolved
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { row, context, row_type } = body;

    if (!row || !context || !row_type) {
      return Response.json(
        { error: 'Missing row, context, or row_type' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const resolved = {};
    const unresolved = [];
    const warnings = [];

    // ── Resolve driver ──
    if (row.driver_id || row.driver_name) {
      const driverId = row.driver_id;
      if (driverId) {
        const driver = await base44.asServiceRole.entities.Driver.get(driverId).catch(() => null);
        if (driver) {
          resolved.driver_id = driverId;
        } else {
          unresolved.push({
            field: 'driver_id',
            reason: `Driver ID "${driverId}" not found in database`,
            value: driverId
          });
        }
      } else if (row.driver_name) {
        // Try normalized name lookup only as fallback - don't create
        const candidates = await base44.asServiceRole.entities.Driver.filter({
          normalized_name: row.driver_name.toLowerCase().trim()
        }, '-created_date', 5).catch(() => []);
        
        if (candidates.length === 1) {
          resolved.driver_id = candidates[0].id;
        } else if (candidates.length > 1) {
          unresolved.push({
            field: 'driver_id',
            reason: `Multiple driver candidates match "${row.driver_name}" - ambiguous`,
            count: candidates.length
          });
        } else {
          unresolved.push({
            field: 'driver_id',
            reason: `No driver found matching "${row.driver_name}"`,
            value: row.driver_name
          });
        }
      }
    }

    // ── Resolve team ──
    if (row.team_id || row.team_name) {
      const teamId = row.team_id;
      if (teamId) {
        const team = await base44.asServiceRole.entities.Team.get(teamId).catch(() => null);
        if (team) {
          resolved.team_id = teamId;
        } else {
          unresolved.push({
            field: 'team_id',
            reason: `Team ID "${teamId}" not found`,
            value: teamId
          });
        }
      } else if (row.team_name) {
        const candidates = await base44.asServiceRole.entities.Team.filter({
          normalized_name: row.team_name.toLowerCase().trim()
        }, '-created_date', 5).catch(() => []);
        
        if (candidates.length === 1) {
          resolved.team_id = candidates[0].id;
        } else if (candidates.length > 1) {
          unresolved.push({
            field: 'team_id',
            reason: `Multiple team candidates match "${row.team_name}"`,
            count: candidates.length
          });
        } else {
          unresolved.push({
            field: 'team_id',
            reason: `No team found matching "${row.team_name}"`,
            value: row.team_name
          });
        }
      }
    }

    // ── Resolve event ──
    if (row.event_id || row.event_name) {
      const eventId = row.event_id;
      if (eventId) {
        const event = await base44.asServiceRole.entities.Event.get(eventId).catch(() => null);
        if (event) {
          resolved.event_id = eventId;
        } else {
          unresolved.push({
            field: 'event_id',
            reason: `Event ID "${eventId}" not found`,
            value: eventId
          });
        }
      } else if (row.event_name) {
        const candidates = await base44.asServiceRole.entities.Event.filter({
          normalized_name: row.event_name.toLowerCase().trim()
        }, '-created_date', 5).catch(() => []);
        
        if (candidates.length === 1) {
          resolved.event_id = candidates[0].id;
        } else if (candidates.length > 1) {
          unresolved.push({
            field: 'event_id',
            reason: `Multiple event candidates match "${row.event_name}"`,
            count: candidates.length
          });
        } else {
          unresolved.push({
            field: 'event_id',
            reason: `No event found matching "${row.event_name}"`,
            value: row.event_name
          });
        }
      }
    }

    // ── Resolve track ──
    if (row.track_id || row.track_name) {
      const trackId = row.track_id;
      if (trackId) {
        const track = await base44.asServiceRole.entities.Track.get(trackId).catch(() => null);
        if (track) {
          resolved.track_id = trackId;
        } else {
          unresolved.push({
            field: 'track_id',
            reason: `Track ID "${trackId}" not found`,
            value: trackId
          });
        }
      } else if (row.track_name) {
        const candidates = await base44.asServiceRole.entities.Track.filter({
          normalized_name: row.track_name.toLowerCase().trim()
        }, '-created_date', 5).catch(() => []);
        
        if (candidates.length === 1) {
          resolved.track_id = candidates[0].id;
        } else if (candidates.length > 1) {
          unresolved.push({
            field: 'track_id',
            reason: `Multiple track candidates match "${row.track_name}"`,
            count: candidates.length
          });
        } else {
          unresolved.push({
            field: 'track_id',
            reason: `No track found matching "${row.track_name}"`,
            value: row.track_name
          });
        }
      }
    }

    // ── Resolve series ──
    if (row.series_id || row.series_name) {
      const seriesId = row.series_id;
      if (seriesId) {
        const series = await base44.asServiceRole.entities.Series.get(seriesId).catch(() => null);
        if (series) {
          resolved.series_id = seriesId;
        } else {
          unresolved.push({
            field: 'series_id',
            reason: `Series ID "${seriesId}" not found`,
            value: seriesId
          });
        }
      } else if (row.series_name) {
        const candidates = await base44.asServiceRole.entities.Series.filter({
          normalized_name: row.series_name.toLowerCase().trim()
        }, '-created_date', 5).catch(() => []);
        
        if (candidates.length === 1) {
          resolved.series_id = candidates[0].id;
        } else if (candidates.length > 1) {
          unresolved.push({
            field: 'series_id',
            reason: `Multiple series candidates match "${row.series_name}"`,
            count: candidates.length
          });
        } else {
          unresolved.push({
            field: 'series_id',
            reason: `No series found matching "${row.series_name}"`,
            value: row.series_name
          });
        }
      }
    }

    // ── Resolve session ──
    if (row.session_id) {
      const session = await base44.asServiceRole.entities.Session.get(row.session_id).catch(() => null);
      if (session) {
        resolved.session_id = row.session_id;
      } else {
        unresolved.push({
          field: 'session_id',
          reason: `Session ID "${row.session_id}" not found`,
          value: row.session_id
        });
      }
    }

    // ── Resolve classes ──
    if (row.series_class_id) {
      const cls = await base44.asServiceRole.entities.SeriesClass.get(row.series_class_id).catch(() => null);
      if (cls) {
        resolved.series_class_id = row.series_class_id;
      } else {
        unresolved.push({
          field: 'series_class_id',
          reason: `SeriesClass ID "${row.series_class_id}" not found`,
          value: row.series_class_id
        });
      }
    }

    if (row.event_class_id) {
      const cls = await base44.asServiceRole.entities.EventClass.get(row.event_class_id).catch(() => null);
      if (cls) {
        resolved.event_class_id = row.event_class_id;
      } else {
        unresolved.push({
          field: 'event_class_id',
          reason: `EventClass ID "${row.event_class_id}" not found`,
          value: row.event_class_id
        });
      }
    }

    // ── Check required references based on row_type ──
    const ok = unresolved.length === 0;

    return Response.json({
      ok,
      resolved,
      unresolved,
      warnings,
      row_type
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});