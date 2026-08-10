/**
 * getTrackExperience
 * Phase 15 — Read-only function that computes the complete public Track
 * experience. Returns one structured payload containing all data needed
 * for the definitive public Track profile.
 *
 * Read-only — never creates or modifies Track state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  resolveTrack, isTrackPublic, isEventPublic, loadTrackContext,
  resolveRacer, resolveTeam, resolveVehicle, resolveSeries,
  getAllSeasonYears,
  type TrackContext,
} from '../../shared/trackExperienceHelpers.ts';

function buildPublicFields(track: any) {
  return {
    id: track.id,
    name: track.name,
    slug: track.slug || track.canonical_slug || null,
    location_city: track.location_city || null,
    location_state: track.location_state || null,
    location_country: track.location_country || null,
    latitude: track.latitude || null,
    longitude: track.longitude || null,
    track_type: track.track_type || null,
    surface_type: track.surface_type || null,
    length: track.length || null,
    banking: track.banking || null,
    configuration: track.configuration || null,
    website_url: track.website_url || null,
    contact_email: track.contact_email || null,
    phone: track.phone || null,
    description: track.description || null,
    bio: track.bio || null,
    tagline: track.tagline || null,
    logo_url: track.logo_url || null,
    image_url: track.image_url || null,
    hero_image_url: track.hero_image_url || track.image_url || null,
    map_image_url: track.map_image_url || null,
    gallery_images: track.gallery_images || [],
    social_facebook: track.social_facebook || null,
    social_instagram: track.social_instagram || null,
    social_x: track.social_x || null,
    social_youtube: track.social_youtube || null,
    social_tiktok: track.social_tiktok || null,
    address_line1: track.address_line1 || null,
    address_line2: track.address_line2 || null,
    zip_code: track.zip_code || null,
    elevation: track.elevation || null,
    capacity: track.capacity || null,
    time_zone: track.time_zone || null,
    sanctioning_bodies: track.sanctioning_bodies || [],
    visitor_info: track.visitor_info || null,
    timeline_milestones: track.timeline_milestones || [],
    operational_status: track.operational_status || 'Active',
    visibility_status: track.visibility_status || 'draft',
    created_date: track.created_date || null,
  };
}

function buildResultSummary(ctx: TrackContext, result: any) {
  const entry = ctx.entries.find(e => e.id === result.entry_id) || ctx.entries.find(e => e.driver_id === result.driver_id) || { driver_id: result.driver_id };
  const racer = resolveRacer(ctx, entry.driver_id);
  const team = resolveTeam(ctx, entry.team_id);
  return {
    position: result.position,
    racer,
    team,
    car_number: entry.car_number || null,
    best_lap_time_ms: result.best_lap_time_ms || null,
  };
}

function buildEventHistory(ctx: TrackContext) {
  return ctx.events
    .filter(e => isEventPublic(e))
    .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
    .map(e => {
      const series = resolveSeries(ctx, e.series_id);
      const eventResults = ctx.resultsByEvent.get(e.id) || [];
      const validResults = eventResults.filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
      const winner = validResults.length > 0 ? buildResultSummary(ctx, validResults[0]) : null;
      const entries = ctx.entriesByEvent.get(e.id) || [];
      const classIds = [...new Set(entries.map(en => en.series_class_id).filter(Boolean))];
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
        series,
        winner,
        entry_count: entries.length,
        result_count: validResults.length,
        class_count: classIds.length,
      };
    });
}

function buildSeriesHosted(ctx: TrackContext) {
  const seriesMap = new Map<string, any>();
  ctx.events.forEach(e => {
    if (!e.series_id) return;
    if (seriesMap.has(e.series_id)) return;
    const series = resolveSeries(ctx, e.series_id);
    if (!series) return;
    const seriesEvents = ctx.events.filter(ev => ev.series_id === e.series_id);
    const seasonYears = [...new Set(seriesEvents.map(ev => ev.season || (ev.event_date ? ev.event_date.substring(0, 4) : null)).filter(Boolean))].sort();
    const seriesResults = ctx.results.filter(r => seriesEvents.some(ev => ev.id === r.event_id));
    const champions = ctx.standings.filter(s => s.series_id === e.series_id && s.position === 1).length;
    seriesMap.set(e.series_id, {
      ...series,
      events_hosted: seriesEvents.length,
      years_active: seasonYears,
      championships_hosted: champions,
      total_results: seriesResults.length,
    });
  });
  return Array.from(seriesMap.values()).sort((a, b) => b.events_hosted - a.events_hosted);
}

function buildClassesCompeted(ctx: TrackContext) {
  const classMap = new Map<string, any>();
  ctx.entries.forEach(e => {
    if (!e.series_class_id) return;
    if (classMap.has(e.series_class_id)) return;
    const cls = ctx.classMap.get(e.series_class_id);
    if (!cls) return;
    const classEntries = ctx.entries.filter(en => en.series_class_id === e.series_class_id);
    const classResults = ctx.results.filter(r =>
      r.position && r.position > 0 &&
      classEntries.some(en => en.id === r.entry_id || en.driver_id === r.driver_id)
    );
    const wins = classResults.filter(r => r.position === 1).length;
    const podiums = classResults.filter(r => r.position <= 3).length;
    const classEvents = ctx.events.filter(ev =>
      classEntries.some(en => en.event_id === ev.id)
    );
    const latestEvent = classEvents.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))[0];
    classMap.set(e.series_class_id, {
      class_id: cls.id,
      class_name: cls.class_name,
      vehicle_type: cls.vehicle_type || null,
      competition_level: cls.competition_level || null,
      starts: classEntries.length,
      wins,
      podiums,
      latest_appearance: latestEvent?.event_date || null,
    });
  });
  return Array.from(classMap.values()).sort((a, b) => b.starts - a.starts);
}

function buildRecords(ctx: TrackContext) {
  const racerStats = new Map<string, { racer: any; wins: number; podiums: number; starts: number; top5: number; championships: number; best_finish: number }>();
  const teamStats = new Map<string, { team: any; wins: number; podiums: number; starts: number }>();
  const manufacturerStats = new Map<string, { manufacturer: string; wins: number; podiums: number; starts: number }>();

  // Lap records from results
  const lapRecords: any[] = [];
  ctx.results.forEach(r => {
    if (!r.best_lap_time_ms) return;
    const entry = ctx.entries.find(e => e.id === r.entry_id) || ctx.entries.find(e => e.driver_id === r.driver_id);
    if (!entry) return;
    const event = ctx.eventMap.get(r.event_id);
    if (!event) return;
    const racer = resolveRacer(ctx, r.driver_id);
    lapRecords.push({
      event_id: r.event_id,
      event_name: event.name,
      event_date: event.event_date,
      racer,
      lap_time_ms: r.best_lap_time_ms,
      session_type: r.session_type || null,
    });
  });
  lapRecords.sort((a, b) => a.lap_time_ms - b.lap_time_ms);

  // Aggregate racer/team/manufacturer stats from results
  ctx.results.forEach(r => {
    if (!r.position || r.position <= 0) return;
    const entry = ctx.entries.find(e => e.id === r.entry_id) || ctx.entries.find(e => e.driver_id === r.driver_id);
    if (!entry) return;

    const did = r.driver_id || entry.driver_id;
    if (did) {
      if (!racerStats.has(did)) {
        racerStats.set(did, { racer: resolveRacer(ctx, did), wins: 0, podiums: 0, starts: 0, top5: 0, championships: 0, best_finish: 999 });
      }
      const stat = racerStats.get(did)!;
      stat.starts++;
      if (r.position === 1) stat.wins++;
      if (r.position <= 3) stat.podiums++;
      if (r.position <= 5) stat.top5++;
      if (r.position < stat.best_finish) stat.best_finish = r.position;
    }

    if (entry.team_id) {
      if (!teamStats.has(entry.team_id)) {
        teamStats.set(entry.team_id, { team: resolveTeam(ctx, entry.team_id)!, wins: 0, podiums: 0, starts: 0 });
      }
      const ts = teamStats.get(entry.team_id)!;
      ts.starts++;
      if (r.position === 1) ts.wins++;
      if (r.position <= 3) ts.podiums++;
    }

    const vehicle = entry.vehicle_id ? ctx.vehicleMap.get(entry.vehicle_id) : null;
    const mfr = vehicle?.manufacturer;
    if (mfr) {
      if (!manufacturerStats.has(mfr)) {
        manufacturerStats.set(mfr, { manufacturer: mfr, wins: 0, podiums: 0, starts: 0 });
      }
      const ms = manufacturerStats.get(mfr)!;
      ms.starts++;
      if (r.position === 1) ms.wins++;
      if (r.position <= 3) ms.podiums++;
    }
  });

  // Championships won here (from standings where position=1 at events on this track)
  const championshipSet = new Map<string, number>();
  ctx.standings.forEach(s => {
    if (s.position !== 1) return;
    const did = s.driver_id;
    if (!did) return;
    championshipSet.set(did, (championshipSet.get(did) || 0) + 1);
  });
  championshipSet.forEach((count, did) => {
    if (racerStats.has(did)) racerStats.get(did)!.championships = count;
  });

  const racerArr = Array.from(racerStats.values());
  const teamArr = Array.from(teamStats.values());
  const mfrArr = Array.from(manufacturerStats.values());

  return {
    lap_records: {
      fastest_lap: lapRecords[0] || null,
      top_5_fastest: lapRecords.slice(0, 5),
    },
    most_wins: racerArr.sort((a, b) => b.wins - a.wins).slice(0, 5).map(s => ({ racer: s.racer, value: s.wins })),
    most_starts: racerArr.sort((a, b) => b.starts - a.starts).slice(0, 5).map(s => ({ racer: s.racer, value: s.starts })),
    most_podiums: racerArr.sort((a, b) => b.podiums - a.podiums).slice(0, 5).map(s => ({ racer: s.racer, value: s.podiums })),
    most_championships: racerArr.filter(s => s.championships > 0).sort((a, b) => b.championships - a.championships).slice(0, 5).map(s => ({ racer: s.racer, value: s.championships })),
    best_average_finish: racerArr.filter(s => s.starts >= 2).sort((a, b) => a.best_finish - b.best_finish).slice(0, 5).map(s => ({ racer: s.racer, value: s.best_finish })),
    most_successful_team: teamArr.sort((a, b) => b.wins - a.wins).slice(0, 5).map(s => ({ team: s.team, wins: s.wins, podiums: s.podiums, starts: s.starts })),
    most_successful_manufacturer: mfrArr.sort((a, b) => b.wins - a.wins).slice(0, 5),
    coverage: {
      based_on_results: ctx.results.length,
      based_on_standings: ctx.standings.length,
      note: 'Records derived from authoritative Results and Standings data at this track.',
    },
  };
}

function buildChampions(ctx: TrackContext) {
  const champions: any[] = [];
  const bySeasonClassSeries = new Map<string, any[]>();
  ctx.standings.forEach(s => {
    if (!s.season_year) return;
    const key = `${s.season_year}:${s.series_class_id || 'overall'}:${s.series_id || ''}`;
    if (!bySeasonClassSeries.has(key)) bySeasonClassSeries.set(key, []);
    bySeasonClassSeries.get(key)!.push(s);
  });

  bySeasonClassSeries.forEach((standings, key) => {
    const sorted = standings.sort((a, b) => (a.position || 999) - (b.position || 999));
    if (sorted.length === 0) return;
    const champ = sorted[0];
    if (!champ.position || champ.position !== 1) return;

    const racer = resolveRacer(ctx, champ.driver_id);
    const entry = ctx.entries.find(e => e.driver_id === champ.driver_id);
    const team = entry?.team_id ? resolveTeam(ctx, entry.team_id) : null;
    const vehicle = entry?.vehicle_id ? resolveVehicle(ctx, entry.vehicle_id) : null;
    const series = resolveSeries(ctx, champ.series_id);
    const cls = champ.series_class_id ? ctx.classMap.get(champ.series_class_id) : null;

    champions.push({
      season_year: champ.season_year,
      class_name: cls?.class_name || null,
      series_name: series?.name || null,
      series,
      racer,
      team,
      vehicle,
      points_total: champ.points_total || 0,
      wins: champ.wins || 0,
      standings_id: champ.id,
    });
  });

  return champions.sort((a, b) => (b.season_year || '').localeCompare(a.season_year || ''));
}

function buildRacerLeaders(ctx: TrackContext) {
  const racerStats = new Map<string, { racer: any; wins: number; podiums: number; starts: number; top5: number; best_finish: number; championships: number }>();

  ctx.results.forEach(r => {
    if (!r.position || r.position <= 0) return;
    const did = r.driver_id;
    if (!did) return;
    if (!racerStats.has(did)) {
      racerStats.set(did, { racer: resolveRacer(ctx, did), wins: 0, podiums: 0, starts: 0, top5: 0, best_finish: 999, championships: 0 });
    }
    const stat = racerStats.get(did)!;
    stat.starts++;
    if (r.position === 1) stat.wins++;
    if (r.position <= 3) stat.podiums++;
    if (r.position <= 5) stat.top5++;
    if (r.position < stat.best_finish) stat.best_finish = r.position;
  });

  // Championships won here
  ctx.standings.forEach(s => {
    if (s.position !== 1) return;
    const did = s.driver_id;
    if (!did || !racerStats.has(did)) return;
    racerStats.get(did)!.championships++;
  });

  return Array.from(racerStats.values())
    .map(s => ({
      ...s.racer,
      wins: s.wins,
      podiums: s.podiums,
      starts: s.starts,
      top5: s.top5,
      best_finish: s.best_finish === 999 ? null : s.best_finish,
      win_pct: s.starts > 0 ? Math.round((s.wins / s.starts) * 1000) / 10 : 0,
      championships: s.championships,
    }))
    .sort((a, b) => b.wins - a.wins || b.starts - a.starts)
    .slice(0, 20);
}

function buildTeamLeaders(ctx: TrackContext) {
  const teamStats = new Map<string, { team: any; wins: number; podiums: number; starts: number; championships: number }>();

  ctx.results.forEach(r => {
    if (!r.position || r.position <= 0) return;
    const entry = ctx.entries.find(e => e.id === r.entry_id) || ctx.entries.find(e => e.driver_id === r.driver_id);
    if (!entry || !entry.team_id) return;
    const tid = entry.team_id;
    if (!teamStats.has(tid)) {
      teamStats.set(tid, { team: resolveTeam(ctx, tid), wins: 0, podiums: 0, starts: 0, championships: 0 });
    }
    const stat = teamStats.get(tid)!;
    stat.starts++;
    if (r.position === 1) stat.wins++;
    if (r.position <= 3) stat.podiums++;
  });

  return Array.from(teamStats.values())
    .map(s => ({
      ...s.team,
      wins: s.wins,
      podiums: s.podiums,
      starts: s.starts,
      championships: s.championships,
    }))
    .sort((a, b) => b.wins - a.wins || b.starts - a.starts)
    .slice(0, 15);
}

function buildVehicleLeaders(ctx: TrackContext) {
  const vehicleStats = new Map<string, { vehicle: any; manufacturer: string; wins: number; podiums: number; starts: number }>();
  const manufacturerStats = new Map<string, { manufacturer: string; wins: number; podiums: number; starts: number }>();

  ctx.results.forEach(r => {
    if (!r.position || r.position <= 0) return;
    const entry = ctx.entries.find(e => e.id === r.entry_id) || ctx.entries.find(e => e.driver_id === r.driver_id);
    if (!entry || !entry.vehicle_id) return;
    const vid = entry.vehicle_id;
    const vehicle = ctx.vehicleMap.get(vid);
    const mfr = vehicle?.manufacturer || 'Unknown';

    if (!vehicleStats.has(vid)) {
      vehicleStats.set(vid, { vehicle: resolveVehicle(ctx, vid), manufacturer: mfr, wins: 0, podiums: 0, starts: 0 });
    }
    const vs = vehicleStats.get(vid)!;
    vs.starts++;
    if (r.position === 1) vs.wins++;
    if (r.position <= 3) vs.podiums++;

    if (!manufacturerStats.has(mfr)) {
      manufacturerStats.set(mfr, { manufacturer: mfr, wins: 0, podiums: 0, starts: 0 });
    }
    const ms = manufacturerStats.get(mfr)!;
    ms.starts++;
    if (r.position === 1) ms.wins++;
    if (r.position <= 3) ms.podiums++;
  });

  return {
    winning_vehicles: Array.from(vehicleStats.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10),
    manufacturer_trends: Array.from(manufacturerStats.values())
      .sort((a, b) => b.wins - a.wins),
  };
}

function buildTimeline(ctx: TrackContext) {
  const events: any[] = [];

  // Track creation
  if (ctx.track.created_date) {
    events.push({ type: 'creation', date: ctx.track.created_date, title: 'Track Added', description: `${ctx.track.name} was added to HIJINX`, priority: 50 });
  }

  // Facility milestones from timeline_milestones field
  (ctx.track.timeline_milestones || []).forEach((m: any) => {
    events.push({
      type: m.type || 'milestone',
      date: m.date,
      title: m.title,
      description: m.description || '',
      priority: 80,
    });
  });

  // Event milestones
  ctx.events.forEach(e => {
    if (!isEventPublic(e)) return;
    if (e.event_date) {
      events.push({
        type: 'event',
        date: e.event_date,
        title: e.name,
        description: `${e.season ? `${e.season} season: ` : ''}${e.name}`,
        metadata: { event_id: e.id, season: e.season },
        priority: 60,
      });
    }
  });

  // Race winners
  ctx.results.filter(r => r.position === 1).forEach(r => {
    const event = ctx.eventMap.get(r.event_id);
    if (!event) return;
    const racer = resolveRacer(ctx, r.driver_id);
    events.push({
      type: 'race_winner',
      date: event.event_date || r.created_date,
      title: `Winner: ${racer.display_name}`,
      description: `Won ${event.name}`,
      metadata: { event_id: event.id, racer },
      priority: 90,
    });
  });

  // Published stories about this track
  const trackName = ctx.track.name?.toLowerCase() || '';
  ctx.outletStories.forEach(story => {
    const matches = story.title?.toLowerCase().includes(trackName) ||
      (story.tags && story.tags.some((t: string) => t.toLowerCase().includes(trackName)));
    if (!matches) return;
    events.push({
      type: 'media',
      date: story.published_date || story.created_date,
      title: story.title,
      description: story.subtitle || 'Story published',
      metadata: { story_slug: story.slug, story_id: story.id },
      priority: 40,
    });
  });

  events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  return events.slice(0, 100);
}

function buildMedia(ctx: TrackContext) {
  const trackName = ctx.track.name?.toLowerCase() || '';
  const trackStories = ctx.outletStories.filter(s =>
    s.title?.toLowerCase().includes(trackName) ||
    (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(trackName)))
  ).slice(0, 20);

  return {
    outlet_stories: trackStories.map(s => ({
      id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle,
      primary_category: s.primary_category, published_date: s.published_date,
      cover_image_url: s.cover_image_url, author: s.author,
    })),
    story_count: trackStories.length,
    gallery_images: ctx.track.gallery_images || [],
    map_image_url: ctx.track.map_image_url || null,
  };
}

function buildStatistics(ctx: TrackContext) {
  const publicEvents = ctx.events.filter(e => isEventPublic(e));
  const validResults = ctx.results.filter(r => r.position && r.position > 0);
  const racerIds = new Set(ctx.entries.map(e => e.driver_id).filter(Boolean));
  const teamIds = new Set(ctx.entries.map(e => e.team_id).filter(Boolean));
  const vehicleIds = new Set(ctx.entries.map(e => e.vehicle_id).filter(Boolean));
  const seriesIds = new Set(ctx.events.map(e => e.series_id).filter(Boolean));
  const classIds = new Set(ctx.entries.map(e => e.series_class_id).filter(Boolean));

  return {
    total_events: publicEvents.length,
    total_results: validResults.length,
    total_wins: validResults.filter(r => r.position === 1).length,
    total_podiums: validResults.filter(r => r.position <= 3).length,
    total_entries: ctx.entries.length,
    racers_count: racerIds.size,
    teams_count: teamIds.size,
    vehicles_count: vehicleIds.size,
    series_count: seriesIds.size,
    classes_count: classIds.size,
    seasons_count: getAllSeasonYears(ctx).length,
    manufacturers_count: new Set(ctx.vehicles.map(v => v.manufacturer).filter(Boolean)).size,
    avg_field_size: publicEvents.length > 0 ? Math.round(ctx.entries.length / publicEvents.length * 10) / 10 : 0,
  };
}

function buildCompleteness(track: any, ctx: TrackContext) {
  const checks = [
    { field: 'logo_url', label: 'Logo', weight: 10, present: !!track.logo_url },
    { field: 'hero_image_url', label: 'Hero Image', weight: 10, present: !!(track.hero_image_url || track.image_url) },
    { field: 'coordinates', label: 'Coordinates', weight: 10, present: !!(track.latitude && track.longitude) },
    { field: 'description', label: 'Description', weight: 8, present: !!(track.bio || track.description) },
    { field: 'website_url', label: 'Website', weight: 8, present: !!track.website_url },
    { field: 'track_type', label: 'Track Type', weight: 5, present: !!track.track_type },
    { field: 'surface_type', label: 'Surface Type', weight: 5, present: !!track.surface_type },
    { field: 'length', label: 'Track Length', weight: 5, present: !!track.length },
    { field: 'configuration', label: 'Configuration', weight: 5, present: !!track.configuration },
    { field: 'capacity', label: 'Capacity', weight: 5, present: !!track.capacity },
    { field: 'gallery_images', label: 'Gallery Images', weight: 7, present: (track.gallery_images || []).length > 0 },
    { field: 'map_image_url', label: 'Track Layout Map', weight: 5, present: !!track.map_image_url },
    { field: 'social_links', label: 'Social Links', weight: 4, present: !!(track.social_facebook || track.social_instagram || track.social_x || track.social_youtube || track.social_tiktok) },
    { field: 'visitor_info', label: 'Visitor Info', weight: 5, present: !!track.visitor_info },
    { field: 'timeline_milestones', label: 'Timeline Milestones', weight: 4, present: (track.timeline_milestones || []).length > 0 },
    { field: 'events', label: 'Event History', weight: 4, present: ctx.events.length > 0 },
  ];

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks.filter(c => c.present).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);
  const missing = checks.filter(c => !c.present).map(c => ({ field: c.field, label: c.label }));

  return { score, checks, missing, total: checks.length, present: checks.filter(c => c.present).length };
}

function buildSEO(track: any, statistics: any) {
  const location = [track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ');
  const title = track.seo_title || `${track.name} — Track Profile | HIJINX`;
  const description = track.seo_description || track.bio || track.description ||
    `${track.name}${track.track_type ? ` — ${track.track_type}` : ''}${location ? ` in ${location}` : ''}${track.surface_type ? `, ${track.surface_type} surface` : ''}${track.length ? `, ${track.length} mi` : ''}. ${statistics.total_events} events hosted, ${statistics.racers_count} racers, ${statistics.series_count} series.`;
  const image = track.hero_image_url || track.image_url || track.logo_url || null;
  const url = (track.slug || track.canonical_slug) ? `/tracks/${track.slug || track.canonical_slug}` : null;

  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'SportsVenue',
    name: track.name,
    description,
  };
  if (image) structuredData.image = image;
  if (url) structuredData.url = `https://hijinxco.com${url}`;
  if (track.website_url) structuredData.sameAs = [track.website_url];
  if (location) structuredData.address = {
    '@type': 'PostalAddress',
    addressLocality: track.location_city || undefined,
    addressRegion: track.location_state || undefined,
    addressCountry: track.location_country || undefined,
  };
  if (track.latitude && track.longitude) {
    structuredData.geo = {
      '@type': 'GeoCoordinates',
      latitude: track.latitude,
      longitude: track.longitude,
    };
  }
  if (track.capacity) structuredData.maximumAttendeeCapacity = track.capacity;

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
    const { slug, track_id, allow_draft = false } = body;
    if (!slug && !track_id) return Response.json({ error: 'slug or track_id is required' }, { status: 400 });

    const track = await resolveTrack(base44, slug, track_id);
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });
    if (!isTrackPublic(track) && !allow_draft) return Response.json({ error: 'Track not found' }, { status: 404 });

    const ctx = await loadTrackContext(base44, track);

    const publicFields = buildPublicFields(track);
    const eventHistory = buildEventHistory(ctx);
    const seriesHosted = buildSeriesHosted(ctx);
    const classesCompeted = buildClassesCompeted(ctx);
    const records = buildRecords(ctx);
    const champions = buildChampions(ctx);
    const racerLeaders = buildRacerLeaders(ctx);
    const teamLeaders = buildTeamLeaders(ctx);
    const vehicleLeaders = buildVehicleLeaders(ctx);
    const timeline = buildTimeline(ctx);
    const media = buildMedia(ctx);
    const statistics = buildStatistics(ctx);
    const completeness = buildCompleteness(track, ctx);
    const allSeasons = getAllSeasonYears(ctx);
    const seo = buildSEO(track, statistics);

    return Response.json({
      track: publicFields,
      event_history: eventHistory,
      series: seriesHosted,
      classes: classesCompeted,
      records,
      champions,
      racers: racerLeaders,
      teams: teamLeaders,
      vehicles: vehicleLeaders,
      timeline,
      media,
      statistics,
      completeness,
      all_seasons: allSeasons,
      seo,
    });
  } catch (err) {
    console.error('[getTrackExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}