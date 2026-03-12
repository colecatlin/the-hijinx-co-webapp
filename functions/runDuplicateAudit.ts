/**
 * runDuplicateAudit.js
 * 
 * Orchestrates all duplicate detection functions.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Call all duplicate detection functions
    const results = await Promise.all([
      base44.asServiceRole.functions.invoke('findDuplicateDrivers', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateTeams', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateTracks', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateSeries', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateEvents', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateResults', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateEntries', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateClasses', {}).catch(e => ({ error: e.message, data: {} })),
      base44.asServiceRole.functions.invoke('findDuplicateStandings', {}).catch(e => ({ error: e.message, data: {} })),
    ]);

    const duplicate_entities_by_type = {
      drivers: results[0]?.data?.duplicate_groups?.length || 0,
      teams: results[1]?.data?.duplicate_groups?.length || 0,
      tracks: results[2]?.data?.duplicate_groups?.length || 0,
      series: results[3]?.data?.duplicate_groups?.length || 0,
      events: results[4]?.data?.duplicate_groups?.length || 0,
      results: results[5]?.data?.duplicate_groups?.length || 0,
      entries: results[6]?.data?.duplicate_groups?.length || 0,
      classes: results[7]?.data?.duplicate_groups?.length || 0,
      standings: results[8]?.data?.duplicate_groups?.length || 0,
    };

    const duplicate_groups_remaining = Object.values(duplicate_entities_by_type).reduce((sum, v) => sum + v, 0);
    let severity_level = 0;
    if (duplicate_groups_remaining > 0) severity_level = 1;
    if (duplicate_groups_remaining > 10) severity_level = 2;
    if (duplicate_groups_remaining > 50) severity_level = 3;

    return Response.json({
      duplicate_groups_remaining,
      duplicate_entities_by_type,
      severity_level,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});