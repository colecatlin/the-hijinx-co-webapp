import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const results = await base44.asServiceRole.entities.Results.list('-created_date', 2000);
    const standings = await base44.asServiceRole.entities.Standings.list('-created_date', 2000);

    // Check Results normalization
    const resultsWithoutKey = results.filter(r => !r.normalized_result_key);
    const result_normalization_ok = resultsWithoutKey.length === 0;

    // Check Standings normalization
    const standingsWithoutKey = standings.filter(s => !s.normalized_standing_key);
    const standings_normalization_ok = standingsWithoutKey.length === 0;

    // Check for duplicate Results groups
    const resultGroups = {};
    for (const result of results) {
      const key = result.normalized_result_key;
      if (!key) continue;
      if (!resultGroups[key]) resultGroups[key] = [];
      resultGroups[key].push(result);
    }
    const duplicate_results_remaining = Object.values(resultGroups).filter(g => g.length > 1).length;

    // Check for duplicate Standings groups
    const standingGroups = {};
    for (const standing of standings) {
      const key = standing.normalized_standing_key;
      if (!key) continue;
      if (!standingGroups[key]) standingGroups[key] = [];
      standingGroups[key].push(standing);
    }
    const duplicate_standings_remaining = Object.values(standingGroups).filter(g => g.length > 1).length;

    const failures = [];
    const warnings = [];

    if (!result_normalization_ok) {
      failures.push(`${resultsWithoutKey.length} Results missing normalized_result_key`);
    }
    if (!standings_normalization_ok) {
      failures.push(`${standingsWithoutKey.length} Standings missing normalized_standing_key`);
    }
    if (duplicate_results_remaining > 0) {
      failures.push(`${duplicate_results_remaining} duplicate Results groups remain`);
    }
    if (duplicate_standings_remaining > 0) {
      failures.push(`${duplicate_standings_remaining} duplicate Standings groups remain`);
    }

    return Response.json({
      success: true,
      result_normalization_ok,
      standings_normalization_ok,
      duplicate_results_remaining,
      duplicate_standings_remaining,
      import_idempotence_ok: result_normalization_ok && standings_normalization_ok && duplicate_results_remaining === 0 && duplicate_standings_remaining === 0,
      failures,
      warnings,
      details: {
        total_results: results.length,
        results_with_key: results.filter(r => r.normalized_result_key).length,
        total_standings: standings.length,
        standings_with_key: standings.filter(s => s.normalized_standing_key).length,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});