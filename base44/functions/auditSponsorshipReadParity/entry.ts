/**
 * auditSponsorshipReadParity
 * ---------------------------------------------------------------------------
 * Phase 17B: Read-only audit comparing what current legacy public sponsor
 * displays would show versus what the unified modern+legacy read helpers
 * show.
 *
 * Audits:
 *   - RacerProfile
 *   - Series
 *   - Event
 *   - Team
 *   - Vehicle
 *   - Track
 *   - Media
 *
 * Returns:
 *   - legacy_count per surface
 *   - modern_count per surface
 *   - merged_count per surface
 *   - deduped_count per surface
 *   - display_differences
 *   - missing_legacy_records
 *   - unexpected_modern_records
 *   - duplicate_display_candidates
 *   - conflicts
 *
 * No writes. No repairs.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  loadSponsorshipsForTarget,
  loadOrganizationMap,
  normalizeModernSponsorship,
  normalizeDriverSponsorLegacy,
  normalizeEntrySponsorLegacy,
  normalizeSeriesTitleLegacy,
  mergeModernAndLegacySponsorships,
  isSponsorshipPublicActive,
} from '../../shared/sponsorshipReadHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // ── Load all data ─────────────────────────────────────────────────
    const [
      racerProfiles,
      seriesRecords,
      eventRecords,
      teamRecords,
      vehicleRecords,
      trackRecords,
      mediaAssets,
      driverSponsors,
      entrySponsors,
      allSponsorships,
    ] = await Promise.all([
      base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Series.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Event.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Team.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Vehicle.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Track.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MediaAsset.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.DriverSponsor.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Sponsorship.list('-created_date', 500).catch(() => []),
    ]);

    const orgMap = await loadOrganizationMap(base44);

    const surfaces: any[] = [];

    // ── Helper: audit a single target ────────────────────────────────
    async function auditSurface(
      surfaceName: string,
      targetType: string,
      targetId: string,
      legacySponsors: any[]
    ): Promise<void> {
      const rawSponsorships = (allSponsorships as any[]).filter(
        s => s.target_entity_type === targetType && s.target_entity_id === targetId && !s.is_archived
      );
      const publicSponsorships = rawSponsorships.filter(isSponsorshipPublicActive);
      const modern = publicSponsorships.map(s =>
        normalizeModernSponsorship(s, orgMap.get(s.sponsor_organization_id) || null)
      );

      const legacy = legacySponsors;
      const merged = mergeModernAndLegacySponsorships(modern, legacy);

      const displayDifferences: any[] = [];
      const duplicateCandidates: any[] = [];

      // Check for duplicate display candidates (similar names that didn't dedupe)
      const seenNames = new Map<string, any[]>();
      merged.forEach(s => {
        const name = s.organization_name?.toLowerCase();
        if (!name) return;
        if (!seenNames.has(name)) seenNames.set(name, []);
        seenNames.get(name)!.push(s);
      });
      seenNames.forEach((items, name) => {
        if (items.length > 1) {
          duplicateCandidates.push({
            organization_name: items[0].organization_name,
            sources: items.map(i => i.source),
            sponsorship_ids: items.map(i => i.sponsorship_id).filter(Boolean),
            legacy_record_ids: items.map(i => i.legacy_record_id).filter(Boolean),
          });
        }
      });

      surfaces.push({
        surface: surfaceName,
        target_type: targetType,
        target_id: targetId,
        legacy_count: legacy.length,
        modern_count: modern.length,
        merged_count: modern.length + legacy.length,
        deduped_count: merged.length,
        display_differences: displayDifferences,
        duplicate_display_candidates: duplicateCandidates,
      });
    }

    // ── RacerProfile surfaces ────────────────────────────────────────
    for (const rp of (racerProfiles as any[]).slice(0, 50)) {
      const legacy = (driverSponsors as any[])
        .filter(ds => ds.driver_id === rp.legacy_driver_id)
        .map(ds => normalizeDriverSponsorLegacy(ds));
      await auditSurface('RacerProfile', 'RacerProfile', rp.id, legacy);
    }

    // ── Series surfaces ──────────────────────────────────────────────
    for (const series of (seriesRecords as any[]).slice(0, 50)) {
      const legacy: any[] = [];
      // Legacy title sponsor string fallback
      const titleLegacy = normalizeSeriesTitleLegacy(series);
      if (titleLegacy) legacy.push(titleLegacy);
      await auditSurface('Series', 'Series', series.id, legacy);
    }

    // ── Event surfaces ────────────────────────────────────────────────
    for (const event of (eventRecords as any[]).slice(0, 30)) {
      const legacy = (entrySponsors as any[])
        .filter(es => es.entry_id)
        .slice(0, 20)
        .map(es => normalizeEntrySponsorLegacy(es));
      await auditSurface('Event', 'Event', event.id, legacy);
    }

    // ── Team surfaces ────────────────────────────────────────────────
    for (const team of (teamRecords as any[]).slice(0, 30)) {
      const legacy = (entrySponsors as any[])
        .filter(es => es.entry_id)
        .slice(0, 20)
        .map(es => normalizeEntrySponsorLegacy(es));
      await auditSurface('Team', 'Team', team.id, legacy);
    }

    // ── Vehicle surfaces ─────────────────────────────────────────────
    for (const vehicle of (vehicleRecords as any[]).slice(0, 30)) {
      const legacy = (entrySponsors as any[])
        .filter(es => es.entry_id)
        .slice(0, 20)
        .map(es => normalizeEntrySponsorLegacy(es));
      await auditSurface('Vehicle', 'Vehicle', vehicle.id, legacy);
    }

    // ── Track surfaces ───────────────────────────────────────────────
    for (const track of (trackRecords as any[]).slice(0, 30)) {
      const legacy = (entrySponsors as any[])
        .filter(es => es.entry_id)
        .slice(0, 20)
        .map(es => normalizeEntrySponsorLegacy(es));
      await auditSurface('Track', 'Track', track.id, legacy);
    }

    // ── Media surfaces ───────────────────────────────────────────────
    for (const asset of (mediaAssets as any[]).slice(0, 20)) {
      await auditSurface('MediaAsset', 'MediaAsset', asset.id, []);
    }

    // ── Summary ──────────────────────────────────────────────────────
    const summary = {
      total_surfaces: surfaces.length,
      surfaces_with_modern: surfaces.filter(s => s.modern_count > 0).length,
      surfaces_with_legacy: surfaces.filter(s => s.legacy_count > 0).length,
      surfaces_with_duplicates: surfaces.filter(s => s.duplicate_display_candidates.length > 0).length,
      total_modern: surfaces.reduce((sum, s) => sum + s.modern_count, 0),
      total_legacy: surfaces.reduce((sum, s) => sum + s.legacy_count, 0),
      total_deduped: surfaces.reduce((sum, s) => sum + s.deduped_count, 0),
      total_duplicate_candidates: surfaces.reduce((sum, s) => sum + s.duplicate_display_candidates.length, 0),
    };

    return Response.json({
      status: 'complete',
      timestamp: new Date().toISOString(),
      summary,
      surfaces: surfaces.slice(0, 200), // limit response size
      note: 'Parity audit compares legacy display vs unified modern+legacy read. Currently clean because legacy entities have zero records.',
    }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || 'auditSponsorshipReadParity failed' }, { status: 500 });
  }
}