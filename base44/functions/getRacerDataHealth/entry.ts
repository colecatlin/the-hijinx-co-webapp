/**
 * getRacerDataHealth — the admin-only Racer Data Health payload.
 *
 * Reports racer-chain counts, integrity failures and the review queue, and
 * serves the Relationship Audit and Review Draft Profiles actions of the
 * Racer Data Health view. Read-only: it never writes or repairs.
 *
 * Input:  { mode?: 'counts' | 'audit' | 'drafts', limit?: number }
 * Output: counts + per-record findings for the requested mode
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validateRacerRelationshipGraph, isPublishable } from '../../shared/racerRelationshipGraph.ts';

const CAP = 500;

function listOf(rows: any): any[] {
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
}

function idsOf(rows: any): Set<string> {
  const set = new Set<string>();
  for (const row of listOf(rows)) if (row.id) set.add(row.id);
  return set;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'audit' ? 'audit' : body.mode === 'drafts' ? 'drafts' : 'counts';
    const limit = Math.min(Number(body.limit) || CAP, 2000);
    const sr = base44.asServiceRole;

    const [identities, profiles, drivers, participations, entries, results, standings, stats, links] = await Promise.all([
      sr.entities.PersonIdentity.list('-created_date', limit).catch(() => []),
      sr.entities.RacerProfile.list('-created_date', limit).catch(() => []),
      sr.entities.Driver.list('-created_date', Math.max(limit, 1000)).catch(() => []),
      sr.entities.SeasonParticipation.list('-created_date', limit).catch(() => []),
      sr.entities.Entry.list('-created_date', limit).catch(() => []),
      sr.entities.Results.list('-created_date', limit).catch(() => []),
      sr.entities.Standings.list('-created_date', limit).catch(() => []),
      sr.entities.DriverCareerStats.list('-created_date', limit).catch(() => []),
      sr.entities.DriverImportIdentityLink.list('-created_date', limit).catch(() => []),
    ]);

    const identityIds = idsOf(identities);
    const profileIds = idsOf(profiles);
    const driverIds = idsOf(drivers);

    const profilesByIdentity = new Map<string, any[]>();
    for (const p of listOf(profiles)) {
      if (!p.person_identity_id) continue;
      if (!profilesByIdentity.has(p.person_identity_id)) profilesByIdentity.set(p.person_identity_id, []);
      (profilesByIdentity.get(p.person_identity_id) as any[]).push(p);
    }

    const identitiesMissingProfile = listOf(identities)
      .filter((i: any) => i.status !== 'merged' && !profilesByIdentity.has(i.id));
    const profilesMissingIdentity = listOf(profiles)
      .filter((p: any) => !p.person_identity_id || !identityIds.has(p.person_identity_id));
    const brokenCanonicalDriver = listOf(identities)
      .filter((i: any) => i.canonical_driver_id && !driverIds.has(i.canonical_driver_id));
    const brokenParticipationProfile = listOf(participations)
      .filter((p: any) => !p.racer_profile_id || !profileIds.has(p.racer_profile_id));
    const brokenParticipationIdentity = listOf(participations)
      .filter((p: any) => p.person_identity_id && !identityIds.has(p.person_identity_id));
    const brokenParticipationDriver = listOf(participations)
      .filter((p: any) => p.legacy_driver_id && !driverIds.has(p.legacy_driver_id));
    const statsMissingIdentity = listOf(stats).filter((s: any) => !s.identity_id || !identityIds.has(s.identity_id));
    const brokenLinks = listOf(links).filter((l: any) =>
      (l.person_identity_id && !identityIds.has(l.person_identity_id))
      || (l.racer_profile_id && !profileIds.has(l.racer_profile_id))
      || (l.legacy_driver_id && !driverIds.has(l.legacy_driver_id)));

    const nameGroups = new Map<string, any[]>();
    for (const i of listOf(identities)) {
      const key = String(i.canonical_name || '').trim().toLowerCase();
      if (!key) continue;
      if (!nameGroups.has(key)) nameGroups.set(key, []);
      (nameGroups.get(key) as any[]).push(i);
    }
    const duplicateCandidates = Array.from(nameGroups.entries())
      .filter(([, group]) => group.length > 1)
      .map(([name, group]) => ({ name, count: group.length, identity_ids: group.map((g: any) => g.id) }));

    const live = listOf(profiles).filter((p: any) => p.visibility === 'live' && !p.is_archived);
    const draft = listOf(profiles).filter((p: any) => p.visibility !== 'live' && !p.is_archived);

    const counts = {
      person_identities: listOf(identities).length,
      racer_profiles: listOf(profiles).length,
      racer_profiles_live: live.length,
      racer_profiles_draft: draft.length,
      identities_missing_profile: identitiesMissingProfile.length,
      profiles_missing_identity: profilesMissingIdentity.length,
      broken_canonical_driver_references: brokenCanonicalDriver.length,
      season_participations: listOf(participations).length,
      broken_participation_profile_references: brokenParticipationProfile.length,
      broken_participation_identity_references: brokenParticipationIdentity.length,
      broken_participation_driver_references: brokenParticipationDriver.length,
      entries: listOf(entries).length,
      results: listOf(results).length,
      standings: listOf(standings).length,
      driver_career_stats: listOf(stats).length,
      career_stats_missing_identity: statsMissingIdentity.length,
      import_links_with_dangling_references: brokenLinks.length,
      duplicate_identity_candidates: duplicateCandidates.length,
      records_requiring_review:
        identitiesMissingProfile.length + profilesMissingIdentity.length
        + brokenParticipationProfile.length + brokenParticipationDriver.length
        + duplicateCandidates.length + brokenLinks.length + statsMissingIdentity.length,
    };

    const legacy = {
      drivers: listOf(drivers).length,
      drivers_live: listOf(drivers).filter((d: any) => d.visibility_status === 'live').length,
      canonical_driver_links: listOf(identities).filter((i: any) => !!i.canonical_driver_id).length,
      profiles_with_legacy_driver: listOf(profiles).filter((p: any) => !!p.legacy_driver_id).length,
    };

    if (mode === 'counts') {
      return Response.json({
        mode,
        counts,
        legacy,
        review_queue: {
          identities_missing_profile: identitiesMissingProfile.slice(0, 25).map((i: any) => ({ id: i.id, name: i.canonical_name, racecore_id: i.racecore_id })),
          profiles_missing_identity: profilesMissingIdentity.slice(0, 25).map((p: any) => ({ id: p.id, name: p.display_name, slug: p.slug })),
          broken_participations: brokenParticipationProfile.slice(0, 25).map((p: any) => ({ id: p.id, racer_profile_id: p.racer_profile_id, person_identity_id: p.person_identity_id, season_year: p.season_year })),
          duplicate_identity_candidates: duplicateCandidates.slice(0, 25),
        },
        truncated: listOf(profiles).length >= limit || listOf(identities).length >= limit,
        generated_at: new Date().toISOString(),
      });
    }

    if (mode === 'audit') {
      const findings: any[] = [];
      const byCode: Record<string, number> = {};
      for (const profile of listOf(profiles).slice(0, 200)) {
        const graph = await validateRacerRelationshipGraph(sr, { racer_profile_id: profile.id });
        for (const error of graph.errors) byCode[error.code] = (byCode[error.code] || 0) + 1;
        for (const warning of graph.warnings) byCode[warning.code] = (byCode[warning.code] || 0) + 1;
        if (graph.errors.length > 0 || graph.warnings.length > 0) {
          findings.push({
            racer_profile_id: profile.id,
            display_name: profile.display_name,
            slug: profile.slug,
            errors: graph.errors,
            warnings: graph.warnings,
          });
        }
      }
      return Response.json({
        mode,
        profiles_audited: Math.min(listOf(profiles).length, 200),
        integrity_ok: findings.filter((f) => f.errors.length > 0).length === 0,
        findings,
        issue_counts: byCode,
        generated_at: new Date().toISOString(),
      });
    }

    // drafts — publish readiness for the Review Draft Profiles action
    const drafts: any[] = [];
    for (const profile of draft.slice(0, 100)) {
      const graph = await validateRacerRelationshipGraph(sr, { racer_profile_id: profile.id });
      const gate = isPublishable(graph);
      const completeness: string[] = [];
      if (!profile.bio) completeness.push('No biography');
      if (!profile.profile_image_url) completeness.push('No profile image');
      if (!profile.hero_image_url) completeness.push('No hero image');
      if (graph.participations.length === 0) completeness.push('No season participation');
      if (graph.results.length === 0) completeness.push('No results');
      drafts.push({
        racer_profile_id: profile.id,
        display_name: profile.display_name,
        slug: profile.slug,
        racecore_id: profile.racecore_id,
        publishable: gate.publishable,
        blockers: gate.blockers,
        completeness_notes: completeness,
      });
    }
    return Response.json({
      mode,
      draft_count: draft.length,
      publishable_count: drafts.filter((d) => d.publishable).length,
      drafts,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}