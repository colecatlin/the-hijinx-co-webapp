/**
 * getRacerProfileExperience — Phase 10
 *
 * Read-only computed experience data for a RacerProfile.
 *
 * Computes from existing data (no manual entry, no duplicated storage):
 *   - Career timeline (entries, results, standings, championships, claims, media)
 *   - Comprehensive statistics (career, season, series, class, track, manufacturer, team)
 *   - Achievement engine (firsts, milestones, championships, records)
 *   - Team history (current, previous, per-team stats)
 *   - Vehicle history (timeline, manufacturer, class, performance)
 *   - Media ecosystem (outlet stories, articles, photos, videos)
 *   - Profile completeness score
 *   - SEO metadata (structured data, OpenGraph, Twitter cards)
 *
 * No writes. No repairs. Pure computation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveRacerProfile, loadRacerProfileContext } from '../../shared/racerProfileExperienceHelpers.ts';
import { buildSponsorshipsForTarget, normalizeDriverSponsorLegacy } from '../../shared/sponsorshipReadHelpers.ts';
import { buildPersonSchema, buildBreadcrumbSchema } from '../../shared/structuredDataHelpers.ts';
import {
  toPublicIdentity, toPublicRacerProfile, toPublicLegacyDriver, toPublicParticipation,
  toPublicEntry, toPublicResult, toPublicStanding, toPublicCareerStats,
} from '../../shared/racerPublicProjection.ts';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { slug, racer_profile_id, allow_draft = false } = body;

  // allow_draft is admin-only — prevents anonymous access to archived/draft profiles
  if (allow_draft) {
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') return Response.json({ error: 'RacerProfile not found', racerProfile: null });
  }

  // The viewer decides only which authorization flags the projection carries.
  // No private identity data is ever included because of who is asking.
  const viewer = await base44.auth.me().catch(() => null);

  const racerProfile = await resolveRacerProfile(base44, slug, racer_profile_id);
  if (!racerProfile) return Response.json({ error: 'RacerProfile not found', racerProfile: null });

  if (!allow_draft && (racerProfile.is_archived || racerProfile.visibility !== 'live')) {
    return Response.json({ error: 'RacerProfile not found', racerProfile: null });
  }

  const ctx = await loadRacerProfileContext(base44, racerProfile);
  const { racerProfile: rp, identity: identityRecord, racerEntries, racerResults, racerStandings,
    driverPrograms, driverMedia, driverSponsors, outletStories,
    seriesMap, classMap, eventMap, trackMap, sessionMap, teamMap, vehicleMap } = ctx;

  const driverId = ctx.legacyDriverId;

  // ── CAREER TIMELINE ──
  const timeline: any[] = [];

  if (identityRecord?.claim_status === 'claimed' && identityRecord.claimed_at) {
    timeline.push({ type: 'ownership_milestone', subtype: 'claim_approved', date: identityRecord.claimed_at, title: 'Profile Claimed', description: 'Ownership verified and granted', icon: 'badge-check', priority: 10 });
  }
  if (identityRecord?.claim_submitted_at) {
    timeline.push({ type: 'ownership_milestone', subtype: 'claim_submitted', date: identityRecord.claim_submitted_at, title: 'Ownership Claim Submitted', description: 'Profile claim submitted for review', icon: 'user-plus', priority: 5 });
  }
  if (rp.years_active_start) {
    timeline.push({ type: 'career_milestone', subtype: 'career_start', date: `${rp.years_active_start}-01-01`, title: 'Career Began', description: `Racing career started in ${rp.years_active_start}`, icon: 'flag', priority: 8 });
  }

  for (const result of racerResults) {
    const session = result.session_id ? sessionMap.get(result.session_id) : null;
    const event = session?.event_id ? eventMap.get(session.event_id) : (result.event_id ? eventMap.get(result.event_id) : null);
    if (!event) continue;
    const track = event?.track_id ? trackMap.get(event.track_id) : null;
    const series = event?.series_id ? seriesMap.get(event.series_id) : null;
    const sessionType = session?.session_type || result.session_type || 'Race';
    timeline.push({
      type: 'race_result', subtype: sessionType.toLowerCase(), date: event.event_date,
      title: `${sessionType} — ${event.name}`,
      description: `Finished P${result.position || '—'}${result.points ? ` · ${result.points} pts` : ''}${result.status && result.status !== 'Running' ? ` · ${result.status}` : ''}`,
      icon: result.position === 1 ? 'trophy' : result.position && result.position <= 3 ? 'medal' : 'flag',
      priority: result.position === 1 ? 9 : result.position && result.position <= 3 ? 7 : 3,
      metadata: { event_id: event.id, event_name: event.name, track_name: track?.name || null, series_name: series?.name || null, position: result.position, points: result.points, status: result.status, session_type: sessionType },
    });
  }

  for (const standing of racerStandings) {
    if (standing.position === 1 || standing.rank === 1) {
      const series = standing.series_id ? seriesMap.get(standing.series_id) : null;
      const seriesClass = standing.series_class_id ? classMap.get(standing.series_class_id) : null;
      timeline.push({
        type: 'championship', subtype: 'series_champion', date: standing.last_calculated || `${standing.season_year}-12-31`,
        title: `${series?.name || 'Series'} Champion`, description: `${standing.season_year} ${seriesClass?.class_name || 'Overall'} Champion`,
        icon: 'trophy', priority: 10,
        metadata: { series_id: standing.series_id, series_name: series?.name || null, class_name: seriesClass?.class_name || null, season_year: standing.season_year, points_total: standing.points_total },
      });
    }
  }

  if (driverMedia?.[0]?.gallery_urls?.length > 0) {
    timeline.push({ type: 'media', subtype: 'gallery_upload', date: driverMedia[0].created_date, title: 'Media Gallery Updated', description: `${driverMedia[0].gallery_urls.length} photos added to gallery`, icon: 'camera', priority: 2 });
  }

  const racerStories = outletStories.filter((s: any) =>
    s.status === 'published' && (s.driver_ids?.includes(driverId) || s.racer_profile_ids?.includes(rp.id) || s.tags?.some((t: string) => t.toLowerCase().includes(rp.display_name?.toLowerCase())))
  );
  for (const s of racerStories.slice(0, 10)) {
    timeline.push({ type: 'media', subtype: 'article', date: s.published_date || s.created_date, title: s.title, description: s.subtitle || s.primary_category || 'Featured story', icon: 'newspaper', priority: 4, metadata: { story_slug: s.slug, story_id: s.id } });
  }

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── COMPREHENSIVE STATISTICS ──
  const careerStarts = racerResults.filter((r: any) => r.position != null || r.status === 'Running').length;
  const careerWins = racerResults.filter((r: any) => r.position === 1).length;
  const careerPodiums = racerResults.filter((r: any) => r.position && r.position <= 3).length;
  const careerTop5 = racerResults.filter((r: any) => r.position && r.position <= 5).length;
  const careerTop10 = racerResults.filter((r: any) => r.position && r.position <= 10).length;
  const careerDNF = racerResults.filter((r: any) => r.status === 'DNF').length;
  const careerPoints = racerResults.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
  const championshipCount = racerStandings.filter((s: any) => s.position === 1 || s.rank === 1).length;

  const positions = racerResults.filter((r: any) => r.position != null).map((r: any) => r.position);
  const avgFinish = positions.length > 0 ? (positions.reduce((a: number, b: number) => a + b, 0) / positions.length) : null;
  const bestFinish = positions.length > 0 ? Math.min(...positions) : null;
  const worstFinish = positions.length > 0 ? Math.max(...positions) : null;

  const bySeries = new Map<string, any>();
  for (const result of racerResults) {
    const session = result.session_id ? sessionMap.get(result.session_id) : null;
    const event = session?.event_id ? eventMap.get(session.event_id) : (result.event_id ? eventMap.get(result.event_id) : null);
    const seriesId = event?.series_id || result.series_id;
    if (!seriesId) continue;
    if (!bySeries.has(seriesId)) bySeries.set(seriesId, { series_id: seriesId, series_name: seriesMap.get(seriesId)?.name || '—', starts: 0, wins: 0, podiums: 0, top5: 0, top10: 0, points: 0, championships: 0 });
    const s = bySeries.get(seriesId);
    s.starts++;
    if (result.position === 1) s.wins++;
    if (result.position && result.position <= 3) s.podiums++;
    if (result.position && result.position <= 5) s.top5++;
    if (result.position && result.position <= 10) s.top10++;
    s.points += result.points || 0;
  }
  for (const standing of racerStandings) {
    if (standing.position === 1 || standing.rank === 1) { const s = bySeries.get(standing.series_id); if (s) s.championships++; }
  }

  const byClass = new Map<string, any>();
  for (const result of racerResults) {
    const classId = result.series_class_id;
    if (!classId) continue;
    if (!byClass.has(classId)) byClass.set(classId, { class_id: classId, class_name: classMap.get(classId)?.class_name || '—', starts: 0, wins: 0, podiums: 0, points: 0 });
    const c = byClass.get(classId);
    c.starts++;
    if (result.position === 1) c.wins++;
    if (result.position && result.position <= 3) c.podiums++;
    c.points += result.points || 0;
  }

  const byTrack = new Map<string, any>();
  for (const result of racerResults) {
    const session = result.session_id ? sessionMap.get(result.session_id) : null;
    const event = session?.event_id ? eventMap.get(session.event_id) : (result.event_id ? eventMap.get(result.event_id) : null);
    const trackId = event?.track_id;
    if (!trackId) continue;
    if (!byTrack.has(trackId)) byTrack.set(trackId, { track_id: trackId, track_name: trackMap.get(trackId)?.name || '—', starts: 0, wins: 0, podiums: 0, best_finish: null });
    const t = byTrack.get(trackId);
    t.starts++;
    if (result.position === 1) t.wins++;
    if (result.position && result.position <= 3) t.podiums++;
    if (result.position && (t.best_finish === null || result.position < t.best_finish)) t.best_finish = result.position;
  }

  const byManufacturer = new Map<string, any>();
  for (const entry of racerEntries) {
    const vehicle = entry.vehicle_id ? vehicleMap.get(entry.vehicle_id) : null;
    const manufacturer = vehicle?.manufacturer || null;
    if (!manufacturer) continue;
    if (!byManufacturer.has(manufacturer)) byManufacturer.set(manufacturer, { manufacturer, starts: 0, wins: 0, podiums: 0 });
    const m = byManufacturer.get(manufacturer);
    m.starts++;
    const result = racerResults.find((r: any) => r.entry_id === entry.id);
    if (result?.position === 1) m.wins++;
    if (result?.position && result.position <= 3) m.podiums++;
  }

  const byTeam = new Map<string, any>();
  for (const entry of racerEntries) {
    const teamId = entry.team_id;
    if (!teamId) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, { team_id: teamId, team_name: teamMap.get(teamId)?.name || '—', starts: 0, wins: 0, podiums: 0, points: 0, championships: 0 });
    const t = byTeam.get(teamId);
    t.starts++;
    const result = racerResults.find((r: any) => r.entry_id === entry.id);
    if (result?.position === 1) t.wins++;
    if (result?.position && result.position <= 3) t.podiums++;
    if (result) t.points += result.points || 0;
  }

  const bySessionType: any = { Practice: 0, Qualifying: 0, Heat: 0, LCQ: 0, Final: 0 };
  for (const result of racerResults) {
    const session = result.session_id ? sessionMap.get(result.session_id) : null;
    const st = session?.session_type || result.session_type;
    if (st && bySessionType.hasOwnProperty(st)) bySessionType[st]++;
  }

  const bySeason = new Map<string, any>();
  for (const result of racerResults) {
    const session = result.session_id ? sessionMap.get(result.session_id) : null;
    const event = session?.event_id ? eventMap.get(session.event_id) : (result.event_id ? eventMap.get(result.event_id) : null);
    const season = event?.season;
    if (!season) continue;
    if (!bySeason.has(season)) bySeason.set(season, { season_year: season, starts: 0, wins: 0, podiums: 0, points: 0 });
    const s = bySeason.get(season);
    s.starts++;
    if (result.position === 1) s.wins++;
    if (result.position && result.position <= 3) s.podiums++;
    s.points += result.points || 0;
  }

  const statistics = {
    career: { starts: careerStarts, wins: careerWins, podiums: careerPodiums, top5: careerTop5, top10: careerTop10, dnf: careerDNF, dns: racerResults.filter((r: any) => r.status === 'DNS').length, dsq: racerResults.filter((r: any) => r.status === 'DSQ').length, points: careerPoints, championships: championshipCount, avg_finish: avgFinish ? Math.round(avgFinish * 100) / 100 : null, best_finish: bestFinish, worst_finish: worstFinish, seasons_count: bySeason.size, series_count: bySeries.size },
    by_series: Array.from(bySeries.values()),
    by_class: Array.from(byClass.values()),
    by_track: Array.from(byTrack.values()),
    by_manufacturer: Array.from(byManufacturer.values()),
    by_team: Array.from(byTeam.values()),
    by_season: Array.from(bySeason.values()).sort((a: any, b: any) => b.season_year.localeCompare(a.season_year)),
    by_session_type: bySessionType,
  };

  // ── ACHIEVEMENT ENGINE ──
  const achievements: any[] = [];
  if (careerStarts >= 1) achievements.push({ id: 'first_start', category: 'milestone', title: 'First Start', description: 'Competed in first race', icon: 'flag', unlocked: true });
  if (bestFinish != null) {
    achievements.push({ id: 'first_finish', category: 'milestone', title: 'First Finish', description: 'Completed first race', icon: 'check-circle', unlocked: true });
    if (bestFinish <= 10) achievements.push({ id: 'first_top10', category: 'milestone', title: 'First Top 10', description: 'Finished in top 10 for the first time', icon: 'trending-up', unlocked: true });
    if (careerPodiums >= 1) achievements.push({ id: 'first_podium', category: 'milestone', title: 'First Podium', description: 'Reached the podium for the first time', icon: 'medal', unlocked: true });
    if (careerWins >= 1) achievements.push({ id: 'first_win', category: 'milestone', title: 'First Win', description: 'Won first race', icon: 'trophy', unlocked: true });
  }
  if (championshipCount >= 1) achievements.push({ id: 'first_championship', category: 'milestone', title: 'First Championship', description: 'Won first championship', icon: 'crown', unlocked: true });

  for (const m of [10, 25, 50, 100, 200]) {
    if (careerStarts >= m) achievements.push({ id: `starts_${m}`, category: 'milestone', title: `${m} Starts`, description: `Competed in ${m} races`, icon: 'flag', unlocked: true });
    else achievements.push({ id: `starts_${m}`, category: 'milestone', title: `${m} Starts`, description: `Compete in ${m} races`, icon: 'flag', unlocked: false, progress: careerStarts, target: m });
  }
  for (const m of [5, 10, 25, 50]) {
    if (careerWins >= m) achievements.push({ id: `wins_${m}`, category: 'wins', title: `${m} Wins`, description: `Won ${m} races`, icon: 'trophy', unlocked: true });
    else if (careerWins > 0) achievements.push({ id: `wins_${m}`, category: 'wins', title: `${m} Wins`, description: `Win ${m} races`, icon: 'trophy', unlocked: false, progress: careerWins, target: m });
  }
  for (const m of [10, 25, 50, 100]) {
    if (careerPodiums >= m) achievements.push({ id: `podiums_${m}`, category: 'podiums', title: `${m} Podiums`, description: `Reached ${m} podiums`, icon: 'medal', unlocked: true });
    else if (careerPodiums > 0) achievements.push({ id: `podiums_${m}`, category: 'podiums', title: `${m} Podiums`, description: `Reach ${m} podiums`, icon: 'medal', unlocked: false, progress: careerPodiums, target: m });
  }
  for (const [seriesId, s] of bySeries) { if (s.championships >= 1) { const series = seriesMap.get(seriesId); achievements.push({ id: `series_champion_${seriesId}`, category: 'championship', title: `${series?.name || 'Series'} Champion`, description: `Won ${series?.name || 'series'} championship`, icon: 'crown', unlocked: true }); } }
  for (const [trackId, t] of byTrack) { if (t.wins >= 3) { const track = trackMap.get(trackId); achievements.push({ id: `track_master_${trackId}`, category: 'track', title: `${track?.name || 'Track'} Master`, description: `Won 3+ races at ${track?.name || 'track'}`, icon: 'map-pin', unlocked: true }); } }
  for (const [classId, c] of byClass) { if (c.wins >= 5) { achievements.push({ id: `class_dominator_${classId}`, category: 'class', title: `${c.class_name} Dominator`, description: `Won 5+ races in ${c.class_name}`, icon: 'zap', unlocked: true }); } }
  for (const [season, s] of bySeason) { if (s.starts >= 3 && s.wins === s.starts) { achievements.push({ id: `perfect_season_${season}`, category: 'record', title: `Perfect Season ${season}`, description: `Won every race in ${season}`, icon: 'sparkles', unlocked: true }); } }
  for (const [seriesId, s] of bySeries) { if (s.wins >= 10) { const series = seriesMap.get(seriesId); achievements.push({ id: `most_wins_${seriesId}`, category: 'record', title: `${series?.name || 'Series'} Win Leader`, description: `10+ wins in ${series?.name || 'series'}`, icon: 'award', unlocked: true }); } }

  // ── TEAM HISTORY ──
  const teamHistory = Array.from(byTeam.values()).map((t: any) => {
    const team = teamMap.get(t.team_id);
    return { team_id: t.team_id, team_name: t.team_name, team_slug: team?.slug || team?.canonical_slug || null, team_logo_url: team?.logo_url || null, is_current: false, starts: t.starts, wins: t.wins, podiums: t.podiums, points: t.points, championships: t.championships };
  }).sort((a: any, b: any) => b.starts - a.starts);
  const activeProgram = driverPrograms.find((p: any) => p.status === 'active');
  if (activeProgram?.team_id) { const ct = teamHistory.find((t: any) => t.team_id === activeProgram.team_id); if (ct) ct.is_current = true; }

  // ── VEHICLE HISTORY ──
  const vehicleHistory: any[] = [];
  const vehicleSet = new Set<string>();
  for (const entry of racerEntries) {
    if (entry.vehicle_id && !vehicleSet.has(entry.vehicle_id)) {
      vehicleSet.add(entry.vehicle_id);
      const vehicle = vehicleMap.get(entry.vehicle_id);
      const team = entry.team_id ? teamMap.get(entry.team_id) : null;
      const resultsForVehicle = racerResults.filter((r: any) => r.entry_id === entry.id);
      vehicleHistory.push({
        vehicle_id: entry.vehicle_id, vehicle_name: vehicle?.name || vehicle?.nickname || 'Vehicle',
        manufacturer: vehicle?.manufacturer || null, model: vehicle?.model || null, year: vehicle?.year || null,
        team_name: team?.name || null, starts: resultsForVehicle.length, wins: resultsForVehicle.filter((r: any) => r.position === 1).length,
        best_finish: resultsForVehicle.length > 0 ? Math.min(...resultsForVehicle.filter((r: any) => r.position).map((r: any) => r.position)) : null,
        first_used: entry.created_date,
      });
    }
  }
  vehicleHistory.sort((a: any, b: any) => b.starts - a.starts);

  // ── MEDIA ECOSYSTEM ──
  const mediaEcosystem = {
    gallery_photos: driverMedia?.[0]?.gallery_urls || [],
    gallery_count: driverMedia?.[0]?.gallery_urls?.length || 0,
    headshot_url: driverMedia?.[0]?.headshot_url || null,
    hero_image_url: driverMedia?.[0]?.hero_image_url || null,
    outlet_stories: racerStories.slice(0, 20).map((s: any) => ({ story_id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle, primary_category: s.primary_category, published_date: s.published_date, cover_image_url: s.cover_image_url || null, author: s.author || null })),
    outlet_story_count: racerStories.length,
  };

  // ── SPONSOR PRESENTATION ──
  const sponsorPresentation = {
    current_sponsors: driverSponsors.filter((s: any) => s.status === 'active' || !s.end_date).map((s: any) => ({ sponsor_id: s.id, sponsor_name: s.sponsor_name || s.name, sponsor_logo_url: s.logo_url || null, sponsor_url: s.website_url || null, tier: s.tier || null, is_primary: s.is_primary || false })),
    historical_sponsors: driverSponsors.filter((s: any) => s.end_date).map((s: any) => ({ sponsor_id: s.id, sponsor_name: s.sponsor_name || s.name, sponsor_logo_url: s.logo_url || null, start_date: s.start_date, end_date: s.end_date })),
    total_sponsors: driverSponsors.length,
  };

  // ── PROFILE COMPLETENESS ──
  const completenessChecks = [
    { key: 'profile_photo', label: 'Profile Photo', weight: 8, passed: !!rp.profile_image_url },
    { key: 'hero_image', label: 'Hero Image', weight: 8, passed: !!rp.hero_image_url },
    { key: 'bio', label: 'Bio', weight: 10, passed: !!rp.bio && rp.bio.length > 20 },
    { key: 'location', label: 'Location', weight: 6, passed: !!(rp.hometown_city || rp.hometown_country) },
    { key: 'nationality', label: 'Nationality', weight: 4, passed: !!rp.hometown_country },
    { key: 'social_links', label: 'Social Links', weight: 6, passed: !!(rp.instagram_url || rp.facebook_url || rp.x_url || rp.youtube_url || rp.tiktok_url || rp.website_url) },
    { key: 'sponsors', label: 'Sponsors', weight: 6, passed: driverSponsors.length > 0 },
    { key: 'teams', label: 'Teams', weight: 6, passed: teamHistory.length > 0 },
    { key: 'vehicles', label: 'Vehicles', weight: 4, passed: vehicleHistory.length > 0 },
    { key: 'statistics', label: 'Statistics', weight: 8, passed: careerStarts > 0 },
    { key: 'timeline', label: 'Timeline', weight: 6, passed: timeline.length > 0 },
    { key: 'achievements', label: 'Achievements', weight: 6, passed: achievements.filter((a: any) => a.unlocked).length > 0 },
    { key: 'media', label: 'Media', weight: 8, passed: mediaEcosystem.gallery_count > 0 || mediaEcosystem.outlet_story_count > 0 },
    { key: 'ownership', label: 'Ownership', weight: 8, passed: identityRecord?.claim_status === 'claimed' },
    { key: 'claim_status', label: 'Claim Status', weight: 6, passed: identityRecord?.claim_status !== 'unclaimed' },
  ];
  const totalWeight = completenessChecks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = completenessChecks.filter((c: any) => c.passed).reduce((sum, c) => sum + c.weight, 0);

  // ── SEO METADATA ──
  const fullName = rp.display_name || '';
  const description = [rp.career_status || 'Racing competitor', rp.primary_discipline, rp.hometown_city ? `from ${rp.hometown_city}` : ''].filter(Boolean).join(' · ');
  const heroImg = rp.hero_image_url || mediaEcosystem.hero_image_url || rp.profile_image_url;
  const seo = {
    title: `${fullName} — Racer Profile | INDEX46`,
    description: description || `${fullName} racing profile on INDEX46`,
    canonical_url: `/racers/${rp.slug}`,
    og_type: 'profile', og_title: `${fullName} — Racer Profile`, og_description: description, og_image: heroImg || null,
    twitter_card: 'summary_large_image', twitter_title: `${fullName} — Racer Profile`, twitter_description: description, twitter_image: heroImg || null,
    structured_data: buildPersonSchema(rp, null),
    structured_data_extra: [
      buildBreadcrumbSchema([
        { name: 'INDEX46', path: '/MotorsportsHome' },
        { name: 'Racers', path: '/Directory?cat=racers' },
        { name: fullName, path: rp.slug ? `/racers/${rp.slug}` : null },
      ], null),
    ].filter(Boolean),
  };

  // Phase 17B: Unified sponsorship read (modern Sponsorship + legacy DriverSponsor fallback)
  const legacyDriverSponsors = driverSponsors.map((s: any) => normalizeDriverSponsorLegacy(s));
  const sponsorshipResult = await buildSponsorshipsForTarget(base44, 'RacerProfile', rp.id, {
    legacySponsors: legacyDriverSponsors,
  });

  // ── PUBLIC-SAFE IDENTITY PROJECTION (never the raw record) ──
  const isAdmin = !!viewer && viewer.role === 'admin';
  const isOwner = !!(identityRecord && viewer && identityRecord.claim_status === 'claimed'
    && identityRecord.owner_user_id === viewer.id);
  let isManager = false;
  if (viewer && !isAdmin && !isOwner) {
    const collaborators = await base44.asServiceRole.entities.EntityCollaborator
      .filter({ entity_type: 'RacerProfile', entity_id: rp.id, status: 'approved' }).catch(() => []);
    isManager = (collaborators || []).some((c: any) => c && c.user_id === viewer.id
      && (c.permission_level === 'admin' || c.permission_level === 'staff'));
  }
  const identityProjection = identityRecord
    ? Object.assign(toPublicIdentity(identityRecord), {
        is_owner: isOwner, is_manager: isManager, is_admin: isAdmin,
        can_manage: isAdmin || isOwner || isManager,
      })
    : null;

  // ── CURRENT RACING CONTEXT (canonical source: active SeasonParticipation) ──
  const activeParticipations = (ctx.participations as any[]).filter((p: any) =>
    p && p.status !== 'Archived' && !p.is_archived);
  const primaryParticipation = activeParticipations.find((p: any) => p.is_primary === true)
    || activeParticipations[0] || null;
  const contextProgram = (driverPrograms as any[]).find((p: any) => p.status === 'active')
    || (driverPrograms as any[])[0] || null;
  const contextSeriesId = primaryParticipation?.series_id || contextProgram?.series_id || ctx.legacyDriver?.primary_series_id || null;
  const contextClassId = primaryParticipation?.series_class_id || contextProgram?.series_class_id || ctx.legacyDriver?.primary_class_id || null;
  const contextTeamId = primaryParticipation?.team_id || ctx.legacyDriver?.team_id || null;
  const currentContext = {
    source: primaryParticipation ? 'SeasonParticipation' : (contextProgram ? 'DriverProgram' : (ctx.legacyDriver ? 'Driver (legacy fallback)' : null)),
    series: contextSeriesId ? { id: contextSeriesId, name: seriesMap.get(contextSeriesId)?.name || null } : null,
    class: contextClassId ? { id: contextClassId, name: classMap.get(contextClassId)?.class_name || null } : null,
    team: contextTeamId ? { id: contextTeamId, name: teamMap.get(contextTeamId)?.name || null } : null,
    car_number: primaryParticipation?.car_number || ctx.legacyDriver?.primary_number || null,
    vehicle: primaryParticipation?.vehicle_id
      ? { id: primaryParticipation.vehicle_id, name: vehicleMap.get(primaryParticipation.vehicle_id)?.nickname || vehicleMap.get(primaryParticipation.vehicle_id)?.name || null }
      : null,
    participations: activeParticipations.map((p: any) => ({
      id: p.id, racecore_id: p.racecore_id || null,
      series_id: p.series_id || null, series_name: seriesMap.get(p.series_id)?.name || null,
      series_class_id: p.series_class_id || null,
      class_name: p.series_class_id ? classMap.get(p.series_class_id)?.class_name || null : null,
      team_id: p.team_id || null, team_name: p.team_id ? teamMap.get(p.team_id)?.name || null : null,
      car_number: p.car_number || null, season_year: p.season_year || null,
      racer_type: p.racer_type || null, status: p.status || null,
      is_primary: p.is_primary === true,
    })),
  };

  return Response.json({
    racerProfile: {
      id: rp.id, slug: rp.slug, display_name: fullName, racecore_id: rp.racecore_id,
      profile_image_url: rp.profile_image_url, hero_image_url: rp.hero_image_url, bio: rp.bio, tagline: rp.tagline,
      career_status: rp.career_status, primary_discipline: rp.primary_discipline,
      hometown_city: rp.hometown_city, hometown_state: rp.hometown_state, hometown_country: rp.hometown_country,
      racing_base_city: rp.racing_base_city, racing_base_state: rp.racing_base_state, racing_base_country: rp.racing_base_country,
      years_active_start: rp.years_active_start, years_active_end: rp.years_active_end, nicknames: rp.nicknames || [],
      website_url: rp.website_url, instagram_url: rp.instagram_url, facebook_url: rp.facebook_url, tiktok_url: rp.tiktok_url, x_url: rp.x_url, youtube_url: rp.youtube_url,
      is_claimed: rp.is_claimed, visibility: rp.visibility,
    },
    identity: identityProjection,
    current_context: currentContext,
    legacy_driver_id: ctx.legacyDriverId,
    timeline: timeline.slice(0, 100), timeline_count: timeline.length,
    statistics, achievements, achievements_unlocked_count: achievements.filter((a: any) => a.unlocked).length,
    team_history: teamHistory, vehicle_history: vehicleHistory,
    media_ecosystem: mediaEcosystem, sponsor_presentation: sponsorPresentation,
    sponsorships: sponsorshipResult.sponsorships,
    sponsorship_counts: {
      modern: sponsorshipResult.modern_count,
      legacy: sponsorshipResult.legacy_count,
      deduped: sponsorshipResult.deduped_count,
    },
    profile_completeness: { score: Math.round((earnedWeight / totalWeight) * 100), checks: completenessChecks, earned_weight: earnedWeight, total_weight: totalWeight },
    seo, computed_at: new Date().toISOString(),
    // Phase 7 mobile optimization: return the full raw page dataset so the
    // public RacerProfile page can render from a single backend call instead
    // of issuing 17 client-side list queries.
    // Explicitly constructed public-safe projections — never raw entity objects.
    // Identity, legacy Driver and the competition records are reduced to the
    // fields the public page renders; claim evidence, claim history, DOB,
    // licence, contact email, access codes and ownership metadata cannot be
    // expressed by these builders.
    page_data: {
      racerProfile: toPublicRacerProfile(rp),
      identity: identityProjection,
      legacyDriver: toPublicLegacyDriver(ctx.legacyDriver),
      media: ctx.driverMedia?.[0] ? {
        headshot_url: ctx.driverMedia[0].headshot_url || null,
        hero_image_url: ctx.driverMedia[0].hero_image_url || null,
        gallery_urls: ctx.driverMedia[0].gallery_urls || [],
        highlight_video_url: ctx.driverMedia[0].highlight_video_url || null,
      } : null,
      careerStats: toPublicCareerStats(ctx.careerStats),
      participations: (ctx.participations as any[]).map((p: any) => toPublicParticipation(p)),
      entries: (ctx.racerEntries as any[]).map((e: any) => toPublicEntry(e)),
      results: (ctx.racerResults as any[]).map((r: any) => toPublicResult(r)),
      standings: (ctx.racerStandings as any[]).map((s: any) => toPublicStanding(s)),
      programs: (ctx.driverPrograms as any[]).map((p: any) => ({
        id: p.id, driver_id: p.driver_id, program_type: p.program_type,
        series_id: p.series_id, series_class_id: p.series_class_id, event_id: p.event_id,
        team_id: p.team_id, car_number: p.car_number, status: p.status,
        start_year: p.start_year, end_year: p.end_year, participation_status: p.participation_status,
      })),
      careerEntries: (ctx.careerEntries as any[]).map((c: any) => ({
        id: c.id, year: c.year, team_id: c.team_id, team_name_override: c.team_name_override,
        series_id: c.series_id, series_name_override: c.series_name_override,
        class_id: c.class_id, class_name_override: c.class_name_override,
        vehicle: c.vehicle, number: c.number, starts: c.starts, wins: c.wins,
        podiums: c.podiums, championship_position: c.championship_position,
      })),
      sponsors: (ctx.driverSponsors as any[]).map((s: any) => ({
        id: s.id, sponsor_name: s.sponsor_name, logo_url: s.logo_url, website_url: s.website_url,
        tier: s.tier, is_primary: s.is_primary, start_date: s.start_date, end_date: s.end_date, status: s.status,
      })),
      series: ctx.allSeries,
      classes: ctx.allClasses,
      events: ctx.allEvents,
      tracks: ctx.allTracks,
      sessions: ctx.allSessions,
      teams: ctx.allTeams,
      current_context: currentContext,
    },
  });
}