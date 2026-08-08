/**
 * getSeriesExperience
 * Phase 14 — Read-only function that computes the complete public Series
 * championship experience. Returns one structured payload containing all
 * data needed for the definitive public Series profile.
 *
 * Read-only — never creates or modifies Series state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  resolveSeries, isSeriesPublic, isEventPublic, loadSeriesContext,
  resolveRacer, resolveTeam, resolveVehicle, resolveClass, resolveTrack,
  getAllSeasonYears, getCurrentSeasonYear,
  type SeriesContext,
} from '../../shared/seriesExperienceHelpers.ts';

function buildPublicFields(series: any) {
  return {
    id: series.id,
    name: series.name,
    slug: series.slug || series.canonical_slug || null,
    full_name: series.full_name || null,
    sanctioning_body: series.sanctioning_body || null,
    discipline: series.discipline || null,
    discipline_id: series.discipline_id || null,
    format_id: series.format_id || null,
    geographic_scope: series.geographic_scope || null,
    derived_competition_level: series.derived_competition_level || null,
    override_competition_level: series.override_competition_level || null,
    override_reason: series.override_reason || null,
    season_year: series.season_year || null,
    description: series.description || null,
    bio: series.bio || null,
    tagline: series.tagline || null,
    logo_url: series.logo_url || null,
    banner_url: series.banner_url || null,
    hero_image_url: series.hero_image_url || series.banner_url || null,
    website_url: series.website_url || null,
    contact_email: series.contact_email || null,
    phone: series.phone || null,
    social_facebook: series.social_facebook || null,
    social_instagram: series.social_instagram || null,
    social_x: series.social_x || null,
    social_youtube: series.social_youtube || null,
    social_linkedin: series.social_linkedin || null,
    social_tiktok: series.social_tiktok || null,
    title_sponsor_name: series.title_sponsor_name || null,
    title_sponsor_logo_url: series.title_sponsor_logo_url || null,
    title_sponsor_url: series.title_sponsor_url || null,
    registration_url: series.registration_url || null,
    rules_url: series.rules_url || null,
    broadcast_url: series.broadcast_url || null,
    operational_status: series.operational_status || 'Active',
    visibility_status: series.visibility_status || 'draft',
    uses_rounds: series.uses_rounds || false,
    created_date: series.created_date || null,
  };
}

function buildSchedule(ctx: SeriesContext, seasonYear?: string) {
  let events = ctx.events;
  if (seasonYear) {
    events = events.filter(e => (e.season || (e.event_date ? e.event_date.substring(0, 4) : null)) === seasonYear);
  }
  return events
    .filter(e => isEventPublic(e))
    .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))
    .map(e => {
      const track = resolveTrack(ctx, e.track_id);
      const eventResults = ctx.resultsByEvent.get(e.id) || [];
      const validResults = eventResults.filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
      const winner = validResults.length > 0 ? buildResultSummary(ctx, validResults[0]) : null;
      return {
        event_id: e.id,
        name: e.name,
        slug: e.slug || e.canonical_slug || null,
        profile_url: (e.slug || e.canonical_slug) ? `/events/${e.slug || e.canonical_slug}` : `/EventProfile?id=${e.id}`,
        event_date: e.event_date || null,
        end_date: e.end_date || null,
        season: e.season || null,
        round_number: e.round_number || null,
        status: e.status || 'Draft',
        track,
        winner,
        entry_count: (ctx.entriesByEvent.get(e.id) || []).length,
        result_count: validResults.length,
      };
    });
}

function buildResultSummary(ctx: SeriesContext, result: any) {
  const entry = ctx.entries.find(e => e.id === result.entry_id) || ctx.entries.find(e => e.driver_id === result.driver_id) || { driver_id: result.driver_id };
  const racer = resolveRacer(ctx, entry.driver_id);
  const team = resolveTeam(ctx, entry.team_id);
  return {
    position: result.position,
    racer,
    team,
    car_number: entry.car_number || null,
  };
}

function buildClasses(ctx: SeriesContext, seasonYear?: string) {
  return ctx.classes
    .filter(c => c.active !== false)
    .sort((a, b) => {
      const aOrder = a.sort_order ?? 999;
      const bOrder = b.sort_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.competition_level || 0) - (a.competition_level || 0);
    })
    .map(c => {
      // Count entries for this class in the season
      const classEntries = ctx.entries.filter(e => {
        const ec = e.event_class_id ? null : null; // Entries reference event_class, not series_class directly
        return e.series_class_id === c.id;
      });

      // Standings leader for this class
      const key = `${seasonYear || ''}:${c.id}`;
      const classStandings = (ctx.standingsBySeasonClass.get(key) || [])
        .sort((a, b) => (a.position || 999) - (b.position || 999));
      const leader = classStandings.length > 0 ? buildStandingEntry(ctx, classStandings[0]) : null;

      return {
        class_id: c.id,
        class_name: c.class_name,
        slug: c.slug || null,
        description_summary: c.description_summary || null,
        vehicle_type: c.vehicle_type || null,
        competition_level: c.competition_level || null,
        geographic_scope: c.geographic_scope || null,
        sort_order: c.sort_order || 0,
        entry_count: classEntries.length,
        standings_leader: leader,
        standings_count: classStandings.length,
      };
    });
}

function buildRacerRoster(ctx: SeriesContext, seasonYear?: string) {
  const seen = new Map<string, any>();

  // From SeasonParticipation
  ctx.seasonParticipations.forEach(p => {
    if (seasonYear && p.season_year !== seasonYear) return;
    const rp = ctx.racerProfileMap.get(p.racer_profile_id);
    if (!rp) return;
    const racer = resolveRacer(ctx, p.legacy_driver_id || p.racer_profile_id);
    const participations = ctx.participationByRacerMap.get(p.racer_profile_id) || [];
    const classIds = [...new Set(participations.map(pp => pp.series_class_id).filter(Boolean))];
    const classes = classIds.map(cid => resolveClass(ctx, cid)).filter(Boolean);

    // Find current standings for this racer
    const racerStandings = ctx.standings.filter(s =>
      (seasonYear ? s.season_year === seasonYear : true) &&
      s.participation_id === p.id
    ).sort((a, b) => (a.position || 999) - (b.position || 999));
    const bestStanding = racerStandings[0] || null;

    // Find entries for this racer in season events
    const seasonEventIds = seasonYear
      ? (ctx.eventsBySeason.get(seasonYear) || []).map(e => e.id)
      : ctx.events.map(e => e.id);
    const racerEntries = ctx.entries.filter(e =>
      e.driver_id === p.legacy_driver_id &&
      seasonEventIds.includes(e.event_id)
    );
    const carNumber = racerEntries[0]?.car_number || null;
    const team = racerEntries[0]?.team_id ? resolveTeam(ctx, racerEntries[0].team_id) : null;

    seen.set(p.racer_profile_id, {
      ...racer,
      racer_type: p.racer_type || 'Driver',
      car_number: carNumber,
      team,
      classes: classes.map(c => c?.class_name).filter(Boolean),
      current_standing: bestStanding ? {
        position: bestStanding.position,
        points_total: bestStanding.points_total,
        wins: bestStanding.wins,
        podiums: bestStanding.podiums,
        starts: bestStanding.starts,
      } : null,
      participation_id: p.id,
      is_primary: p.is_primary || false,
    });
  });

  // Also include racers from entries not in SeasonParticipation
  const seasonEventIds = seasonYear
    ? (ctx.eventsBySeason.get(seasonYear) || []).map(e => e.id)
    : ctx.events.map(e => e.id);
  ctx.entries.forEach(e => {
    if (seen.has(e.driver_id)) return;
    if (!seasonEventIds.includes(e.event_id)) return;
    const racer = resolveRacer(ctx, e.driver_id);
    if (!racer.racer_profile_id) return;
    const team = e.team_id ? resolveTeam(ctx, e.team_id) : null;
    const ec = e.event_class_id ? null : null;
    seen.set(e.driver_id, {
      ...racer,
      racer_type: 'Driver',
      car_number: e.car_number || null,
      team,
      classes: [],
      current_standing: null,
      participation_id: null,
      is_primary: false,
    });
  });

  return Array.from(seen.values());
}

function buildTeamRoster(ctx: SeriesContext, seasonYear?: string) {
  const seen = new Map<string, any>();
  const seasonEventIds = seasonYear
    ? (ctx.eventsBySeason.get(seasonYear) || []).map(e => e.id)
    : ctx.events.map(e => e.id);

  ctx.entries.forEach(e => {
    if (!e.team_id) return;
    if (!seasonEventIds.includes(e.event_id)) return;
    if (seen.has(e.team_id)) return;
    const team = resolveTeam(ctx, e.team_id);
    if (!team) return;

    const teamEntries = ctx.entries.filter(en =>
      en.team_id === e.team_id && seasonEventIds.includes(en.event_id)
    );
    const driverIds = [...new Set(teamEntries.map(en => en.driver_id).filter(Boolean))];
    const vehicleIds = [...new Set(teamEntries.map(en => en.vehicle_id).filter(Boolean))];
    const classIds = [...new Set(teamEntries.map(en => en.series_class_id).filter(Boolean))];

    // Count wins from results
    const teamResults = ctx.results.filter(r =>
      r.position === 1 &&
      teamEntries.some(en => en.id === r.entry_id || en.driver_id === r.driver_id)
    );

    seen.set(e.team_id, {
      ...team,
      racer_count: driverIds.length,
      vehicle_count: vehicleIds.length,
      class_names: classIds.map(cid => resolveClass(ctx, cid)?.class_name).filter(Boolean),
      entry_count: teamEntries.length,
      wins: teamResults.length,
    });
  });

  return Array.from(seen.values());
}

function buildVehicleParticipation(ctx: SeriesContext, seasonYear?: string) {
  const seen = new Map<string, any>();
  const seasonEventIds = seasonYear
    ? (ctx.eventsBySeason.get(seasonYear) || []).map(e => e.id)
    : ctx.events.map(e => e.id);

  ctx.entries.forEach(e => {
    if (!e.vehicle_id) return;
    if (!seasonEventIds.includes(e.event_id)) return;
    if (seen.has(e.vehicle_id)) return;
    const vehicle = resolveVehicle(ctx, e.vehicle_id);
    if (!vehicle) return;
    const racer = resolveRacer(ctx, e.driver_id);
    const team = e.team_id ? resolveTeam(ctx, e.team_id) : null;
    const cls = e.series_class_id ? resolveClass(ctx, e.series_class_id) : null;

    const vehicleEntries = ctx.entries.filter(en =>
      en.vehicle_id === e.vehicle_id && seasonEventIds.includes(en.event_id)
    );
    const vehicleResults = ctx.results.filter(r =>
      r.position && r.position > 0 &&
      vehicleEntries.some(en => en.id === r.entry_id || en.driver_id === r.driver_id)
    );
    const wins = vehicleResults.filter(r => r.position === 1).length;
    const podiums = vehicleResults.filter(r => r.position <= 3).length;

    seen.set(e.vehicle_id, {
      ...vehicle,
      racer,
      team,
      class_name: cls?.class_name || null,
      starts: vehicleEntries.length,
      wins,
      podiums,
    });
  });

  return Array.from(seen.values());
}

function buildStandingEntry(ctx: SeriesContext, standing: any) {
  const racer = resolveRacer(ctx, standing.driver_id, standing.participation_id);
  const cls = standing.series_class_id ? resolveClass(ctx, standing.series_class_id) : null;
  const entry = ctx.entries.find(e => e.driver_id === standing.driver_id);
  return {
    standings_id: standing.id,
    position: standing.position,
    points_total: standing.points_total || 0,
    wins: standing.wins || 0,
    podiums: standing.podiums || 0,
    starts: standing.starts || 0,
    top5: standing.top5 || 0,
    top10: standing.top10 || 0,
    racer,
    car_number: entry?.car_number || null,
    class_name: cls?.class_name || null,
    season_year: standing.season_year || null,
  };
}

function buildStandings(ctx: SeriesContext, seasonYear?: string, classId?: string) {
  let filtered = ctx.standings;
  if (seasonYear) filtered = filtered.filter(s => s.season_year === seasonYear);
  if (classId) filtered = filtered.filter(s => s.series_class_id === classId);
  return filtered
    .sort((a, b) => (a.position || 999) - (b.position || 999))
    .map(s => buildStandingEntry(ctx, s));
}

function buildChampions(ctx: SeriesContext) {
  const champions: any[] = [];
  // Group standings by season+class, find position 1 for completed seasons
  const bySeasonClass = new Map<string, any[]>();
  ctx.standings.forEach(s => {
    if (!s.season_year) return;
    const key = `${s.season_year}:${s.series_class_id || 'overall'}`;
    if (!bySeasonClass.has(key)) bySeasonClass.set(key, []);
    bySeasonClass.get(key)!.push(s);
  });

  bySeasonClass.forEach((standings, key) => {
    const [seasonYear, classIdStr] = key.split(':');
    const classId = classIdStr === 'overall' ? null : classIdStr;
    // Only consider seasons that are in the past (not current)
    const currentSeason = getCurrentSeasonYear(ctx);
    if (seasonYear === currentSeason) return; // Don't label current leaders as champions

    const sorted = standings.sort((a, b) => (a.position || 999) - (b.position || 999));
    if (sorted.length === 0) return;
    const champ = sorted[0];
    if (!champ.position || champ.position !== 1) return;

    const racer = resolveRacer(ctx, champ.driver_id, champ.participation_id);
    const entry = ctx.entries.find(e => e.driver_id === champ.driver_id);
    const team = entry?.team_id ? resolveTeam(ctx, entry.team_id) : null;
    const vehicle = entry?.vehicle_id ? resolveVehicle(ctx, entry.vehicle_id) : null;
    const cls = classId ? resolveClass(ctx, classId) : null;

    champions.push({
      season_year: seasonYear,
      class_name: cls?.class_name || null,
      class_id: classId,
      racer,
      team,
      vehicle,
      points_total: champ.points_total || 0,
      wins: champ.wins || 0,
      standings_id: champ.id,
    });
  });

  return champions.sort((a, b) => b.season_year.localeCompare(a.season_year));
}

function buildRecords(ctx: SeriesContext) {
  // Aggregate career records from standings across all seasons
  const racerStats = new Map<string, { racer: any; championships: number; wins: number; podiums: number; starts: number; top5: number; points: number }>();
  const teamStats = new Map<string, { team: any; wins: number; podiums: number }>();
  const manufacturerStats = new Map<string, { manufacturer: string; wins: number; podiums: number }>();

  ctx.standings.forEach(s => {
    const did = s.driver_id;
    if (!did) return;
    if (!racerStats.has(did)) {
      racerStats.set(did, { racer: resolveRacer(ctx, did), championships: 0, wins: 0, podiums: 0, starts: 0, top5: 0, points: 0 });
    }
    const stat = racerStats.get(did)!;
    stat.wins += s.wins || 0;
    stat.podiums += s.podiums || 0;
    stat.starts += s.starts || 0;
    stat.top5 += s.top5 || 0;
    stat.points += s.points_total || 0;
    // Championship = position 1 in a completed (non-current) season
    const currentSeason = getCurrentSeasonYear(ctx);
    if (s.position === 1 && s.season_year && s.season_year !== currentSeason) {
      stat.championships += 1;
    }
  });

  // Results-based team/manufacturer stats
  ctx.results.forEach(r => {
    if (!r.position || r.position <= 0) return;
    const entry = ctx.entries.find(e => e.id === r.entry_id) || ctx.entries.find(e => e.driver_id === r.driver_id);
    if (!entry) return;
    if (entry.team_id) {
      if (!teamStats.has(entry.team_id)) teamStats.set(entry.team_id, { team: resolveTeam(ctx, entry.team_id)!, wins: 0, podiums: 0 });
      const ts = teamStats.get(entry.team_id)!;
      if (r.position === 1) ts.wins++;
      if (r.position <= 3) ts.podiums++;
    }
    const vehicle = entry.vehicle_id ? ctx.vehicleMap.get(entry.vehicle_id) : null;
    const mfr = vehicle?.manufacturer;
    if (mfr) {
      if (!manufacturerStats.has(mfr)) manufacturerStats.set(mfr, { manufacturer: mfr, wins: 0, podiums: 0 });
      const ms = manufacturerStats.get(mfr)!;
      if (r.position === 1) ms.wins++;
      if (r.position <= 3) ms.podiums++;
    }
  });

  const racerArr = Array.from(racerStats.values());
  const teamArr = Array.from(teamStats.values());
  const mfrArr = Array.from(manufacturerStats.values());

  return {
    most_championships: racerArr.sort((a, b) => b.championships - a.championships).slice(0, 5).map(s => ({ racer: s.racer, value: s.championships })),
    most_wins: racerArr.sort((a, b) => b.wins - a.wins).slice(0, 5).map(s => ({ racer: s.racer, value: s.wins })),
    most_podiums: racerArr.sort((a, b) => b.podiums - a.podiums).slice(0, 5).map(s => ({ racer: s.racer, value: s.podiums })),
    most_starts: racerArr.sort((a, b) => b.starts - a.starts).slice(0, 5).map(s => ({ racer: s.racer, value: s.starts })),
    most_top5: racerArr.sort((a, b) => b.top5 - a.top5).slice(0, 5).map(s => ({ racer: s.racer, value: s.top5 })),
    most_points: racerArr.sort((a, b) => b.points - a.points).slice(0, 5).map(s => ({ racer: s.racer, value: s.points })),
    most_successful_team: teamArr.sort((a, b) => b.wins - a.wins).slice(0, 5).map(s => ({ team: s.team, wins: s.wins, podiums: s.podiums })),
    most_successful_manufacturer: mfrArr.sort((a, b) => b.wins - a.wins).slice(0, 5),
    coverage: {
      based_on_standings: ctx.standings.length,
      based_on_results: ctx.results.length,
      note: 'Records derived from authoritative Standings and Results data.',
    },
  };
}

function buildStatistics(ctx: SeriesContext, seasonYear?: string) {
  const events = seasonYear ? (ctx.eventsBySeason.get(seasonYear) || []) : ctx.events;
  const publicEvents = events.filter(e => isEventPublic(e));
  const seasonEntries = seasonYear
    ? ctx.entries.filter(e => (ctx.eventsBySeason.get(seasonYear) || []).some(ev => ev.id === e.event_id))
    : ctx.entries;
  const racerIds = new Set(seasonEntries.map(e => e.driver_id).filter(Boolean));
  const teamIds = new Set(seasonEntries.map(e => e.team_id).filter(Boolean));
  const vehicleIds = new Set(seasonEntries.map(e => e.vehicle_id).filter(Boolean));
  const trackIds = new Set(publicEvents.map(e => e.track_id).filter(Boolean));
  const validResults = ctx.results.filter(r => r.position && r.position > 0);

  return {
    seasons_count: getAllSeasonYears(ctx).length,
    events_count: publicEvents.length,
    classes_count: ctx.classes.filter(c => c.active !== false).length,
    racers_count: racerIds.size,
    teams_count: teamIds.size,
    vehicles_count: vehicleIds.size,
    tracks_count: trackIds.size,
    total_entries: seasonEntries.length,
    total_results: validResults.length,
    total_wins: validResults.filter(r => r.position === 1).length,
    total_podiums: validResults.filter(r => r.position <= 3).length,
    championships_count: buildChampions(ctx).length,
    manufacturers_count: new Set(ctx.vehicles.map(v => v.manufacturer).filter(Boolean)).size,
    avg_field_size: publicEvents.length > 0 ? Math.round(seasonEntries.length / publicEvents.length * 10) / 10 : 0,
  };
}

function buildTimeline(ctx: SeriesContext) {
  const events: any[] = [];
  // Series creation
  if (ctx.series.created_date) events.push({ type: 'creation', date: ctx.series.created_date, title: 'Series Created', description: `${ctx.series.name} was created`, priority: 50 });
  // Season milestones from events
  ctx.events.forEach(e => {
    if (!isEventPublic(e)) return;
    const season = e.season || (e.event_date ? e.event_date.substring(0, 4) : null);
    if (e.event_date) {
      events.push({ type: 'event', date: e.event_date, title: e.name, description: `${season ? `${season} season: ` : ''}${e.name}`, metadata: { event_id: e.id, season }, priority: 60 });
    }
  });
  // Race winners
  ctx.results.filter(r => r.position === 1).forEach(r => {
    const event = ctx.eventMap.get(r.event_id);
    if (!event) return;
    const racer = resolveRacer(ctx, r.driver_id);
    events.push({ type: 'race_winner', date: event.event_date || r.created_date, title: `Winner: ${racer.display_name}`, description: `Won ${event.name}`, metadata: { event_id: event.id, racer }, priority: 90 });
  });
  // Published stories
  ctx.outletStories.forEach(story => {
    if (story.series_id && story.series_id !== ctx.series.id) return;
    events.push({ type: 'media', date: story.published_date || story.created_date, title: story.title, description: story.subtitle || 'Story published', metadata: { story_slug: story.slug, story_id: story.id }, priority: 40 });
  });
  events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  return events.slice(0, 100);
}

function buildHistory(ctx: SeriesContext) {
  const seasonYears = getAllSeasonYears(ctx);
  const pastChampions = buildChampions(ctx);
  const pastClasses = ctx.classes.filter(c => c.active === false);
  const pastTracks = new Map<string, any>();
  ctx.events.forEach(e => {
    if (e.track_id) {
      const track = resolveTrack(ctx, e.track_id);
      if (track) pastTracks.set(e.track_id, track);
    }
  });

  return {
    seasons: seasonYears,
    years_active: seasonYears.length > 0 ? { start: seasonYears[seasonYears.length - 1], end: seasonYears[0] } : null,
    past_champions: pastChampions,
    past_classes: pastClasses.map(c => ({ class_name: c.class_name, competition_level: c.competition_level || null })),
    past_tracks: Array.from(pastTracks.values()),
    total_seasons: seasonYears.length,
  };
}

function buildTracks(ctx: SeriesContext) {
  const trackMap = new Map<string, any>();
  ctx.events.forEach(e => {
    if (!e.track_id) return;
    if (trackMap.has(e.track_id)) return;
    const track = resolveTrack(ctx, e.track_id);
    if (!track) return;
    const trackEvents = ctx.events.filter(e => e.track_id === track.track_id);
    const trackResults = ctx.results.filter(r => trackEvents.some(e => e.id === r.event_id));
    const winners = trackResults.filter(r => r.position === 1).map(r => ({
      racer: resolveRacer(ctx, r.driver_id),
      event_id: r.event_id,
    }));
    trackMap.set(e.track_id, {
      ...track,
      events_hosted: trackEvents.length,
      rounds_hosted: trackEvents.filter(e => e.round_number).length,
      winner_history: winners.slice(0, 10),
    });
  });
  return Array.from(trackMap.values());
}

function buildSponsors(ctx: SeriesContext) {
  const series = ctx.series;
  const sponsors: any[] = [];
  if (series.title_sponsor_name) {
    sponsors.push({
      sponsor_name: series.title_sponsor_name,
      logo_url: series.title_sponsor_logo_url || null,
      sponsor_url: series.title_sponsor_url || null,
      tier: 'title',
      is_primary: true,
    });
  }
  // Entry-level sponsors
  const entrySponsorMap = new Map<string, any>();
  ctx.entrySponsors.forEach(es => {
    const sid = es.sponsor_id || es.sponsor_name;
    if (!sid) return;
    if (!entrySponsorMap.has(sid)) {
      entrySponsorMap.set(sid, {
        sponsor_name: es.sponsor_name || sid,
        logo_url: es.sponsor_logo_url || null,
        sponsor_url: es.sponsor_url || null,
        tier: es.tier || 'partner',
        is_primary: es.is_primary || false,
        entries_count: 0,
      });
    }
    entrySponsorMap.get(sid).entries_count++;
  });
  sponsors.push(...Array.from(entrySponsorMap.values()).sort((a, b) => b.entries_count - a.entries_count));
  return {
    title_sponsor: series.title_sponsor_name ? sponsors[0] : null,
    all_sponsors: sponsors,
    total_sponsors: sponsors.length,
  };
}

function buildMedia(ctx: SeriesContext) {
  const seriesStories = ctx.outletStories.filter(s =>
    s.series_id === ctx.series.id ||
    (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(ctx.series.name.toLowerCase())))
  ).slice(0, 20);
  return {
    outlet_stories: seriesStories.map(s => ({
      id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle,
      primary_category: s.primary_category, published_date: s.published_date,
      cover_image_url: s.cover_image_url, author: s.author,
    })),
    story_count: seriesStories.length,
  };
}

function buildSEO(series: any, statistics: any, currentSeason: string | null) {
  const title = series.seo_title || `${series.name} — Series Profile | HIJINX`;
  const description = series.seo_description || series.bio || series.description ||
    `${series.name}${series.discipline ? ` — ${series.discipline}` : ''}${series.sanctioning_body ? ` sanctioned by ${series.sanctioning_body}` : ''}${currentSeason ? ` — ${currentSeason} season` : ''}. ${statistics.events_count} events, ${statistics.classes_count} classes, ${statistics.racers_count} racers.`;
  const image = series.hero_image_url || series.banner_url || series.logo_url || null;
  const url = (series.slug || series.canonical_slug) ? `/series/${series.slug || series.canonical_slug}` : null;
  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: series.name,
    description,
    sport: series.discipline || undefined,
  };
  if (image) structuredData.image = image;
  if (url) structuredData.url = `https://hijinxco.com${url}`;
  if (series.website_url) structuredData.sameAs = [series.website_url];
  if (series.sanctioning_body) structuredData.parentOrganization = { '@type': 'Organization', name: series.sanctioning_body };
  return {
    title, description, image, url,
    og_type: 'website', twitter_card: 'summary_large_image',
    og_title: title, og_description: description, og_image: image,
    twitter_title: title, twitter_description: description, twitter_image: image,
    structured_data: structuredData,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, series_id, season_year, allow_draft = false } = body;
    if (!slug && !series_id) return Response.json({ error: 'slug or series_id is required' }, { status: 400 });

    const series = await resolveSeries(base44, slug, series_id);
    if (!series) return Response.json({ error: 'Series not found' }, { status: 404 });
    if (!isSeriesPublic(series) && !allow_draft) return Response.json({ error: 'Series not found' }, { status: 404 });

    const ctx = await loadSeriesContext(base44, series);
    const currentSeason = getCurrentSeasonYear(ctx);
    const seasonYear = season_year || currentSeason;

    const publicFields = buildPublicFields(series);
    const schedule = buildSchedule(ctx, seasonYear);
    const classes = buildClasses(ctx, seasonYear);
    const racerRoster = buildRacerRoster(ctx, seasonYear);
    const teamRoster = buildTeamRoster(ctx, seasonYear);
    const vehicleParticipation = buildVehicleParticipation(ctx, seasonYear);
    const standings = buildStandings(ctx, seasonYear);
    const champions = buildChampions(ctx);
    const records = buildRecords(ctx);
    const statistics = buildStatistics(ctx, seasonYear);
    const timeline = buildTimeline(ctx);
    const history = buildHistory(ctx);
    const tracks = buildTracks(ctx);
    const sponsors = buildSponsors(ctx);
    const media = buildMedia(ctx);
    const allSeasons = getAllSeasonYears(ctx);
    const seo = buildSEO(series, statistics, currentSeason);

    return Response.json({
      series: publicFields,
      current_season: currentSeason,
      selected_season: seasonYear,
      all_seasons: allSeasons,
      schedule,
      classes,
      racers: racerRoster,
      teams: teamRoster,
      vehicles: vehicleParticipation,
      standings,
      champions,
      records,
      statistics,
      timeline,
      history,
      tracks,
      sponsors,
      media,
      seo,
    });
  } catch (err) {
    console.error('[getSeriesExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}