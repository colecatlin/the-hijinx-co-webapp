/**
 * verifyStoryRadarSystem
 * ─────────────────────────────────────────────────────────────────
 * Read-only system health check for Story Radar.
 * Does NOT create, modify, or delete any data.
 * Safe to run at any time.
 *
 * Returns:
 *  {
 *    success,
 *    signal_intake_ok,
 *    signal_dedupe_ok,
 *    ai_processing_ok,
 *    recommendation_duplicate_protection_ok,
 *    coverage_memory_ok,
 *    trend_clustering_ok,
 *    draft_conversion_ok,
 *    auto_publish_guard_ok,
 *    warnings,
 *    failures
 *  }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ACTIVE_STATUSES = ['suggested', 'approved', 'saved', 'drafted'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (user !== null && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const warnings = [];
    const failures = [];

    // ── 1. Signal intake ─────────────────────────────────────────
    let signals = null;
    try {
      signals = await base44.asServiceRole.entities.ContentSignal.list('-created_date', 20);
    } catch (err) {
      failures.push(`signal_intake: ${err.message}`);
    }
    const signal_intake_ok = signals !== null;
    if (signal_intake_ok && signals.length === 0) {
      warnings.push('No ContentSignals found — scanForContentSignals may not have run yet.');
    }

    // ── 2. Signal dedupe ──────────────────────────────────────────
    let signal_dedupe_ok = true;
    if (signals && signals.length > 0) {
      const withDedupeKey = signals.filter(s => s.dedupe_key);
      if (withDedupeKey.length === 0) {
        signal_dedupe_ok = false;
        failures.push('ContentSignals exist but none have dedupe_key set — createContentSignalFromUpdate dedupe is broken.');
      }
    }

    // ── 3. AI processing ─────────────────────────────────────────
    let processedSignals = null;
    try {
      processedSignals = await base44.asServiceRole.entities.ContentSignal.filter(
        { ai_processed: true }, '-created_date', 5
      );
    } catch (err) {
      failures.push(`ai_processing: ${err.message}`);
    }
    const ai_processing_ok = processedSignals !== null;
    if (ai_processing_ok && processedSignals.length === 0 && signals && signals.length > 0) {
      warnings.push('Signals exist but none have been AI-processed — processPendingContentSignals may not have run yet.');
    }

    // ── 4. Recommendation fingerprinting / duplicate protection ───
    let activeRecs = null;
    try {
      activeRecs = await base44.asServiceRole.entities.StoryRecommendation.list('-created_date', 50);
    } catch (err) {
      failures.push(`recommendation_fingerprints: ${err.message}`);
    }

    let recommendation_duplicate_protection_ok = true;
    if (activeRecs && activeRecs.length > 0) {
      const withFingerprint = activeRecs.filter(r => r.recommendation_fingerprint);
      if (withFingerprint.length === 0) {
        recommendation_duplicate_protection_ok = false;
        failures.push('StoryRecommendations exist but none have recommendation_fingerprint set — dedup is broken.');
      } else {
        // Check for duplicate fingerprints among currently active statuses
        const fpCount = {};
        for (const r of activeRecs.filter(r => ACTIVE_STATUSES.includes(r.status) && r.recommendation_fingerprint)) {
          fpCount[r.recommendation_fingerprint] = (fpCount[r.recommendation_fingerprint] ?? 0) + 1;
        }
        const dupes = Object.entries(fpCount).filter(([, n]) => n > 1);
        if (dupes.length > 0) {
          warnings.push(`${dupes.length} fingerprint(s) appear on multiple active recommendations — investigate dedup gap.`);
        }
      }
    }

    // ── 5. Coverage memory ────────────────────────────────────────
    let coverageMap = null;
    try {
      coverageMap = await base44.asServiceRole.entities.OutletStoryCoverageMap.list('-created_date', 5);
    } catch (err) {
      failures.push(`coverage_memory: ${err.message}`);
    }
    const coverage_memory_ok = coverageMap !== null;
    if (coverage_memory_ok && coverageMap.length === 0) {
      warnings.push('No OutletStoryCoverageMap records found — updateCoverageMapFromPublishedStory may not have run yet.');
    }

    // ── 6. Trend clustering ───────────────────────────────────────
    let clusters = null;
    try {
      clusters = await base44.asServiceRole.entities.StoryTrendCluster.list('-last_activity_date', 5);
    } catch (err) {
      failures.push(`trend_clustering: ${err.message}`);
    }
    const trend_clustering_ok = clusters !== null;
    if (trend_clustering_ok && clusters.length === 0) {
      warnings.push('No StoryTrendClusters found yet — clustering will begin once signals are processed at sufficient volume.');
    }

    // ── 7. Draft conversion ───────────────────────────────────────
    let draftedRecs = null;
    try {
      draftedRecs = await base44.asServiceRole.entities.StoryRecommendation.filter(
        { status: 'drafted' }, '-created_date', 10
      );
    } catch (err) {
      failures.push(`draft_conversion: ${err.message}`);
    }
    let draft_conversion_ok = true;
    if (draftedRecs && draftedRecs.length > 0) {
      const withoutLink = draftedRecs.filter(r => !r.linked_story_id);
      if (withoutLink.length > 0) {
        draft_conversion_ok = false;
        failures.push(`${withoutLink.length} drafted recommendation(s) have no linked_story_id — draft conversion is broken.`);
      }
    }

    // ── 8. Auto-publish guard ──────────────────────────────────────
    // Verify that no linked OutletStory drafts have been published
    let auto_publish_guard_ok = true;
    const linkedRecs = draftedRecs?.filter(r => r.linked_story_id) ?? [];
    for (const rec of linkedRecs) {
      try {
        const story = await base44.asServiceRole.entities.OutletStory.get(rec.linked_story_id);
        if (story?.status === 'published') {
          auto_publish_guard_ok = false;
          failures.push(`CRITICAL: OutletStory ${rec.linked_story_id} linked from recommendation ${rec.id} is published — auto-publish guard may be broken.`);
        }
      } catch (_) { /* story may have been deleted — not a guard failure */ }
    }

    // ── Log verification run ───────────────────────────────────────
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'story_radar_verification_run',
        entity_name: 'StoryRecommendation',
        entity_id: '',
        metadata: {
          signal_intake_ok,
          signal_dedupe_ok,
          ai_processing_ok,
          recommendation_duplicate_protection_ok,
          coverage_memory_ok,
          trend_clustering_ok,
          draft_conversion_ok,
          auto_publish_guard_ok,
          warnings_count: warnings.length,
          failures_count: failures.length,
        },
      });
    } catch (_) { /* fire-and-forget */ }

    return Response.json({
      success: failures.length === 0,
      signal_intake_ok,
      signal_dedupe_ok,
      ai_processing_ok,
      recommendation_duplicate_protection_ok,
      coverage_memory_ok,
      trend_clustering_ok,
      draft_conversion_ok,
      auto_publish_guard_ok,
      warnings,
      failures,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});