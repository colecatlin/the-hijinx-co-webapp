import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// inline normalizeName (no local imports)
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const MODEL_MAP = {
  driver:  'Driver',
  team:    'Team',
  track:   'Track',
  series:  'Series',
  event:   'Event',
  session: 'Session',
};

function resolveDisplayName(entity_type, record) {
  if (entity_type === 'driver') {
    return `${record.first_name || ''} ${record.last_name || ''}`.trim();
  }
  return record.name || record.full_name || record.title || '';
}
function normalizeName2(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entity_type } = body;

    if (!entity_type || !MODEL_MAP[entity_type]) {
      return Response.json({
        error: `Invalid entity_type. Use one of: ${Object.keys(MODEL_MAP).join(', ')}`,
      }, { status: 400 });
    }

    const modelName = MODEL_MAP[entity_type];
    const records = await base44.asServiceRole.entities[modelName].list('-created_date', 2000);

    // ---- Group by three dimensions in priority order ----
    const byExternalUid    = new Map(); // external_uid -> records[]
    const byCanonicalKey   = new Map(); // canonical_key -> records[]
    const byNormName       = new Map(); // normalized_name -> records[]
    const byNormDob        = new Map(); // driver: normalized_name:dob -> records[]
    const byNormNum        = new Map(); // driver: normalized_name:number -> records[]
    // event-specific
    const byNormEventKey   = new Map(); // normalized_event_key (stored composite)
    const byNormDateTrack  = new Map(); // name|date|track_id
    const byNormDateSeries = new Map(); // name|date|series_id
    const byNormDate       = new Map(); // name|date fallback
    // session-specific
    const byNormSessionKey    = new Map(); // normalized_session_key (stored)
    const byEventNormName     = new Map(); // event_id:normalized_name

    for (const r of records) {
      // external_uid
      if (r.external_uid) {
        const arr = byExternalUid.get(r.external_uid) || [];
        arr.push(r);
        byExternalUid.set(r.external_uid, arr);
      }

      // canonical_key
      if (r.canonical_key) {
        const arr = byCanonicalKey.get(r.canonical_key) || [];
        arr.push(r);
        byCanonicalKey.set(r.canonical_key, arr);
      }

      // normalized_name (derived on-the-fly if not stored)
      const displayName = r.normalized_name || normalizeName(resolveDisplayName(entity_type, r));
      if (displayName) {
        // Events: skip plain name match (too broad across years) — use composite keys instead
        if (entity_type !== 'event') {
          let normKey = displayName;
          // Tracks: include location to avoid false-positives
          if (entity_type === 'track' && (r.location_state || r.location_country)) {
            const locCtx = normalizeName(r.location_state || r.location_country || '');
            if (locCtx) normKey = `${displayName}:${locCtx}`;
          }
          const arr = byNormName.get(normKey) || [];
          arr.push(r);
          byNormName.set(normKey, arr);
        }

        // Drivers: also group by name+DOB and name+primary_number for higher precision
        if (entity_type === 'driver') {
          if (r.date_of_birth) {
            const dobKey = `${displayName}:dob:${r.date_of_birth}`;
            const da = byNormDob.get(dobKey) || []; da.push(r); byNormDob.set(dobKey, da);
          }
          if (r.primary_number) {
            const numKey = `${displayName}:num:${r.primary_number}`;
            const na = byNormNum.get(numKey) || []; na.push(r); byNormNum.set(numKey, na);
          }
        }

        // Sessions: use event_id + name composite keys
        if (entity_type === 'session') {
          if (r.normalized_session_key) {
            const a = byNormSessionKey.get(r.normalized_session_key) || []; a.push(r); byNormSessionKey.set(r.normalized_session_key, a);
          }
          if (r.event_id) {
            const normN = r.normalized_name || normalizeName2(r.name || '');
            if (normN) {
              const k = `${r.event_id}:${normN}`;
              const a = byEventNormName.get(k) || []; a.push(r); byEventNormName.set(k, a);
            }
          }
        }

        // Events: use composite keys for accurate duplicate detection
        if (entity_type === 'event') {
          if (r.normalized_event_key) {
            const a = byNormEventKey.get(r.normalized_event_key) || []; a.push(r); byNormEventKey.set(r.normalized_event_key, a);
          }
          if (r.event_date) {
            if (r.track_id) {
              const k = `${displayName}|${r.event_date}|${r.track_id}`;
              const a = byNormDateTrack.get(k) || []; a.push(r); byNormDateTrack.set(k, a);
            }
            if (r.series_id) {
              const k = `${displayName}|${r.event_date}|${r.series_id}`;
              const a = byNormDateSeries.get(k) || []; a.push(r); byNormDateSeries.set(k, a);
            }
            const k = `${displayName}|${r.event_date}`;
            const a = byNormDate.get(k) || []; a.push(r); byNormDate.set(k, a);
          }
        }
      }
    }

    const duplicate_groups = [];

    function buildGroup(match_type, key, group) {
      return {
        match_type,
        key,
        count: group.length,
        record_ids: group.map(r => r.id),
        names: group.map(r => resolveDisplayName(entity_type, r)),
        records: group.map(r => ({
          id: r.id,
          name: resolveDisplayName(entity_type, r),
          status: r.status || null,
          external_uid: r.external_uid || null,
          canonical_key: r.canonical_key || null,
          normalized_name: r.normalized_name || null,
          created_date: r.created_date || null,
        })),
      };
    }

    for (const [key, group] of byExternalUid) {
      if (group.length > 1) {
        duplicate_groups.push(buildGroup('external_uid', key, group));
      }
    }

    // Track already-flagged IDs from external_uid pass to avoid double-reporting
    const flaggedIds = new Set(duplicate_groups.flatMap(g => g.record_ids));

    for (const [key, group] of byCanonicalKey) {
      if (group.length > 1) {
        const newIds = group.map(r => r.id).filter(id => !flaggedIds.has(id));
        if (newIds.length > 1 || (newIds.length > 0 && group.length > newIds.length)) {
          duplicate_groups.push(buildGroup('canonical_key', key, group));
          group.forEach(r => flaggedIds.add(r.id));
        }
      }
    }

    for (const [key, group] of byNormName) {
      if (group.length > 1) {
        const unflagged = group.filter(r => !flaggedIds.has(r.id));
        if (unflagged.length > 1) {
          duplicate_groups.push(buildGroup('normalized_name', key, group));
          group.forEach(r => flaggedIds.add(r.id));
        }
      }
    }

    // Driver-specific: normalized_name + DOB and normalized_name + primary_number
    if (entity_type === 'driver') {
      for (const [key, group] of byNormDob) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('normalized_name_dob', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
      for (const [key, group] of byNormNum) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('normalized_name_number', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
    }

    // Event-specific: composite key groupings
    if (entity_type === 'event') {
      for (const [key, group] of byNormEventKey) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('normalized_event_key', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
      for (const [key, group] of byNormDateTrack) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('name_date_track', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
      for (const [key, group] of byNormDateSeries) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('name_date_series', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
      for (const [key, group] of byNormDate) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('name_date', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
    }

    // Session-specific groupings
    if (entity_type === 'session') {
      for (const [key, group] of byNormSessionKey) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('normalized_session_key', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
      for (const [key, group] of byEventNormName) {
        if (group.length > 1) {
          const unflagged = group.filter(r => !flaggedIds.has(r.id));
          if (unflagged.length > 1) {
            duplicate_groups.push(buildGroup('event_id_normalized_name', key, group));
            group.forEach(r => flaggedIds.add(r.id));
          }
        }
      }
    }

    // Log if duplicates found
    if (duplicate_groups.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_detected',
        entity_name: modelName,
        status: 'success',
        metadata: {
          entity_type,
          duplicate_group_count: duplicate_groups.length,
          total_records: records.length,
        },
      }).catch(() => {});
    }

    return Response.json({
      entity_type,
      total_records: records.length,
      duplicate_groups,
      duplicate_count: duplicate_groups.length,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});