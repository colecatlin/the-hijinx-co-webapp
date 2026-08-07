/**
 * auditRacerProfileExperience — Phase 10
 *
 * Read-only integrity audit for the public RacerProfile experience.
 * Never repairs data automatically.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveRacerProfile, loadRacerProfileContext } from '../../shared/racerProfileExperienceHelpers.ts';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { slug, racer_profile_id } = body;

  const racerProfile = await resolveRacerProfile(base44, slug, racer_profile_id);
  if (!racerProfile) return Response.json({ error: 'RacerProfile not found', issues: [{ severity: 'critical', category: 'profile', message: 'RacerProfile not found' }] });

  const ctx = await loadRacerProfileContext(base44, racerProfile);
  const { racerProfile: rp, identity: identityRecord, racerEntries, racerResults, racerStandings, driverPrograms, driverSponsors, driverMedia,
    eventMap, sessionMap, seriesMap, teamMap, vehicleMap } = ctx;

  const issues: any[] = [];
  const warnings: any[] = [];
  const passed: any[] = [];

  // ── PROFILE IMAGES ──
  if (!rp.profile_image_url) warnings.push({ category: 'profile_image', severity: 'low', message: 'Profile image missing' });
  else passed.push({ category: 'profile_image', message: 'Profile image set' });
  if (!rp.hero_image_url) warnings.push({ category: 'hero_image', severity: 'low', message: 'Hero image missing' });
  else passed.push({ category: 'hero_image', message: 'Hero image set' });

  // ── IDENTITY CHAIN ──
  if (!ctx.identityId) issues.push({ category: 'identity', severity: 'critical', message: 'RacerProfile has no person_identity_id' });
  else if (!identityRecord) issues.push({ category: 'identity', severity: 'critical', message: 'PersonIdentity record not found' });
  else passed.push({ category: 'identity', message: 'PersonIdentity linked and found' });

  // ── OWNERSHIP ──
  if (identityRecord && identityRecord.claim_status === 'claimed' && !identityRecord.owner_user_id) {
    issues.push({ category: 'ownership', severity: 'high', message: 'Identity marked claimed but no owner_user_id' });
  } else passed.push({ category: 'ownership', message: 'Ownership state consistent' });

  // ── PARTICIPATIONS ──
  if (ctx.participationIds.length === 0) warnings.push({ category: 'participation', severity: 'medium', message: 'No season participations found' });
  else passed.push({ category: 'participation', message: `${ctx.participationIds.length} participations found` });

  // ── ENTRIES ──
  if (racerEntries.length === 0 && ctx.participationIds.length > 0) {
    warnings.push({ category: 'entries', severity: 'medium', message: 'Participations exist but no entries linked' });
  } else passed.push({ category: 'entries', message: `${racerEntries.length} entries linked` });

  const brokenEventRefs = racerEntries.filter((e: any) => e.event_id && !eventMap.has(e.event_id));
  if (brokenEventRefs.length > 0) issues.push({ category: 'entries', severity: 'high', message: `${brokenEventRefs.length} entries reference missing events` });

  // ── RESULTS ──
  const brokenSessionRefs = racerResults.filter((r: any) => r.session_id && !sessionMap.has(r.session_id));
  if (brokenSessionRefs.length > 0) warnings.push({ category: 'results', severity: 'medium', message: `${brokenSessionRefs.length} results reference missing sessions` });
  const brokenResultEventRefs = racerResults.filter((r: any) => {
    const session = r.session_id ? sessionMap.get(r.session_id) : null;
    const eventId = session?.event_id || r.event_id;
    return eventId && !eventMap.has(eventId);
  });
  if (brokenResultEventRefs.length > 0) issues.push({ category: 'results', severity: 'high', message: `${brokenResultEventRefs.length} results reference missing events` });

  // ── STANDINGS ──
  const brokenStandingsSeries = racerStandings.filter((s: any) => s.series_id && !seriesMap.has(s.series_id));
  if (brokenStandingsSeries.length > 0) issues.push({ category: 'standings', severity: 'high', message: `${brokenStandingsSeries.length} standings reference missing series` });

  // ── TEAM REFERENCES ──
  const entryTeamRefs = racerEntries.filter((e: any) => e.team_id && !teamMap.has(e.team_id));
  if (entryTeamRefs.length > 0) issues.push({ category: 'team_references', severity: 'medium', message: `${entryTeamRefs.length} entries reference missing teams` });
  const programTeamRefs = driverPrograms.filter((p: any) => p.team_id && !teamMap.has(p.team_id));
  if (programTeamRefs.length > 0) warnings.push({ category: 'team_references', severity: 'low', message: `${programTeamRefs.length} programs reference missing teams` });

  // ── VEHICLE REFERENCES ──
  const brokenVehicleRefs = racerEntries.filter((e: any) => e.vehicle_id && !vehicleMap.has(e.vehicle_id));
  if (brokenVehicleRefs.length > 0) warnings.push({ category: 'vehicle_references', severity: 'low', message: `${brokenVehicleRefs.length} entries reference missing vehicles` });

  // ── SPONSOR REFERENCES ──
  const sponsorsWithMissingLogos = driverSponsors.filter((s: any) => s.sponsor_name && !s.logo_url);
  if (sponsorsWithMissingLogos.length > 0) warnings.push({ category: 'sponsors', severity: 'low', message: `${sponsorsWithMissingLogos.length} sponsors missing logo URLs` });

  // ── MEDIA REFERENCES ──
  if ((driverMedia?.[0]?.gallery_urls?.length || 0) > 0 && !rp.profile_image_url && !rp.hero_image_url) {
    warnings.push({ category: 'media', severity: 'low', message: 'Media gallery exists but profile/hero images not set on RacerProfile' });
  }

  // ── SOCIAL LINKS ──
  const socialLinks = [{ key: 'website_url', url: rp.website_url }, { key: 'instagram_url', url: rp.instagram_url }, { key: 'facebook_url', url: rp.facebook_url }, { key: 'x_url', url: rp.x_url }, { key: 'youtube_url', url: rp.youtube_url }, { key: 'tiktok_url', url: rp.tiktok_url }].filter((s: any) => s.url);
  const invalidSocialLinks = socialLinks.filter((s: any) => { try { new URL(s.url); return false; } catch { return true; } });
  if (invalidSocialLinks.length > 0) warnings.push({ category: 'social_links', severity: 'low', message: `${invalidSocialLinks.length} social links have invalid URLs`, fields: invalidSocialLinks.map((s: any) => s.key) });

  // ── SEO ──
  if (!rp.slug) issues.push({ category: 'seo', severity: 'high', message: 'RacerProfile has no slug — canonical URL broken' });
  if (!rp.display_name) issues.push({ category: 'seo', severity: 'high', message: 'RacerProfile has no display_name — SEO title broken' });
  if (!rp.bio && !rp.tagline) warnings.push({ category: 'seo', severity: 'low', message: 'No bio or tagline — meta description will be generic' });

  // ── TIMELINE INTEGRITY ──
  if (racerResults.length > 0 && racerEntries.length === 0) issues.push({ category: 'timeline', severity: 'medium', message: 'Results exist but no entries — timeline may be incomplete' });

  // ── STATISTICS INTEGRITY ──
  if (racerResults.length > 0) {
    const careerStats = ctx.identityId ? await base44.asServiceRole.entities.DriverCareerStats.filter({ identity_id: ctx.identityId }).catch(() => []) : [];
    if (careerStats.length === 0) warnings.push({ category: 'statistics', severity: 'medium', message: 'Results exist but no DriverCareerStats record — stats may not be cached' });
  }

  // ── SHARING ──
  if (!rp.hero_image_url && !rp.profile_image_url) warnings.push({ category: 'sharing', severity: 'medium', message: 'No images — social sharing previews will use fallback' });

  // ── VISIBILITY ──
  if (rp.visibility !== 'live') warnings.push({ category: 'visibility', severity: 'medium', message: `Profile visibility is ${rp.visibility} — not public` });
  if (rp.is_archived) issues.push({ category: 'visibility', severity: 'high', message: 'Profile is archived — should not be publicly visible' });

  const criticalCount = issues.filter((i: any) => i.severity === 'critical').length;
  const highCount = issues.filter((i: any) => i.severity === 'high').length;
  const mediumCount = issues.filter((i: any) => i.severity === 'medium').length + warnings.filter((w: any) => w.severity === 'medium').length;
  const lowCount = warnings.filter((w: any) => w.severity === 'low').length;
  const status = criticalCount > 0 ? 'critical' : highCount > 0 ? 'issues' : mediumCount > 0 ? 'warnings' : 'clean';

  return Response.json({
    racer_profile_id: rp.id, slug: rp.slug, display_name: rp.display_name, status, issues, warnings, passed,
    summary: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, passed_count: passed.length, total_checks: issues.length + warnings.length + passed.length },
    audited_at: new Date().toISOString(),
  });
}