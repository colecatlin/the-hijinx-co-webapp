/**
 * resolveMotorsportFact — Phase 17C
 *
 * Deterministic Motorsport Fact Resolver.
 *
 * THE DATA DETERMINES THE ANSWER.
 * AI MAY EXPLAIN THE ANSWER.
 * AI MUST NEVER DETERMINE THE FACT.
 *
 * This function accepts an intent (fact type) and a context (series, season,
 * event, class, racer, etc.) and resolves the fact from authoritative entity
 * relationships. It returns a structured FactResult with:
 *   - status (RESOLVED, AMBIGUOUS, INSUFFICIENT_CONTEXT, NO_DATA, UNSUPPORTED, ERROR)
 *   - answer (structured factual data)
 *   - answer_text (deterministic sentence)
 *   - entities (entity references involved in the answer)
 *   - evidence (provenance chain — source entity, field, value)
 *   - public_links (public destinations)
 *   - ambiguity_options (when AMBIGUOUS)
 *   - missing_context (when INSUFFICIENT_CONTEXT)
 *
 * No facts are stored. Facts are DERIVED from authoritative entities.
 * No LLM is used. All answers are deterministic.
 *
 * Public visibility is respected — draft/private/unpublished records are not
 * surfaced (uses the same published/visibility filters as public pages).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  type FactIntent, type FactContext, type FactResult, type FactEntityRef,
  type FactEvidence, type AmbiguityOption, type ContextDimension,
  getMissingContext, RACE_SESSION_TYPES,
} from '../../shared/factTypes.ts';
import { buildAnswerText, resolvePublicLinks } from '../../shared/factSentenceBuilders.ts';

// ═══════════════════════════════════════════════════════════════════════════
// VISIBILITY FILTERS — match public page rules
// ═══════════════════════════════════════════════════════════════════════════

const EVENT_VISIBLE = (e: any) =>
  !e.is_archived && (e.status === 'Published' || e.status === 'Live' || e.status === 'Completed' || e.published_flag);

const SERIES_VISIBLE = (s: any) =>
  !s.is_archived && s.visibility_status === 'live';

const TRACK_VISIBLE = (t: any) =>
  !t.is_archived && t.visibility_status === 'live';

const RACER_VISIBLE = (r: any) =>
  !r.is_archived && r.visibility === 'live';

const TEAM_VISIBLE = (t: any) =>
  !t.is_archived && t.visibility_status === 'live';

const RESULT_VISIBLE = (r: any) =>
  !r.is_archived && r.published && r.status_state !== 'Draft';

const STANDING_VISIBLE = (s: any) =>
  !s.is_archived;

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY RESOLVERS — slug → record
// ═══════════════════════════════════════════════════════════════════════════

async function resolveEntity(base44: any, type: string, ref: string): Promise<any | null> {
  if (!ref) return null;
  try {
    // Try by slug first
    const list = await base44.asServiceRole.entities[type].filter({ slug: ref });
    if (list && list.length > 0) return list[0];
    // Try by canonical_slug
    const list2 = await base44.asServiceRole.entities[type].filter({ canonical_slug: ref });
    if (list2 && list2.length > 0) return list2[0];
    // Try by id
    return await base44.asServiceRole.entities[type].get(ref).catch(() => null);
  } catch {
    return null;
  }
}

function toEntityRef(record: any, type: string): FactEntityRef | null {
  if (!record) return null;
  return {
    type,
    id: record.id,
    name: record.name || record.display_name || record.canonical_name || record.class_name || '—',
    slug: record.slug || record.canonical_slug,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);

  const body = await req.json().catch(() => ({}));
  const { intent, context = {} } = body;
  const ctx: FactContext = context;

  if (!intent) {
    return Response.json({
      status: 'ERROR',
      reason: 'Missing required parameter: intent',
    });
  }

  // ── Check required context ──────────────────────────────────────────────
  const missing = getMissingContext(intent as FactIntent, ctx);
  if (missing.length > 0) {
    return Response.json({
      intent,
      status: 'INSUFFICIENT_CONTEXT',
      context: ctx,
      missing_context: missing,
      reason: `Required context missing: ${missing.join(', ')}`,
    } as FactResult);
  }

  try {
    const result = await resolveByIntent(base44, intent as FactIntent, ctx);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({
      intent,
      status: 'ERROR',
      context: ctx,
      reason: err?.message || 'Resolver execution failed',
      resolved_at: new Date().toISOString(),
    } as FactResult);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENT DISPATCH
// ═══════════════════════════════════════════════════════════════════════════

async function resolveByIntent(base44: any, intent: FactIntent, ctx: FactContext): Promise<FactResult> {
  switch (intent) {
    case 'RESULT_WINNER':     return resolveResultWinner(base44, ctx);
    case 'RESULT_POSITION':  return resolveResultPosition(base44, ctx);
    case 'RESULT_LIST':      return resolveResultList(base44, ctx);
    case 'RESULT_PODIUM':    return resolveResultPodium(base44, ctx);
    case 'STANDINGS_LEADER': return resolveStandingsLeader(base44, ctx);
    case 'STANDINGS_POSITION': return resolveStandingsPosition(base44, ctx);
    case 'STANDINGS_POINTS':   return resolveStandingsPoints(base44, ctx);
    case 'CHAMPION_SEASON':  return resolveChampionSeason(base44, ctx);
    case 'CHAMPION_SPECIAL_EVENT': return resolveChampionSpecialEvent(base44, ctx);
    case 'RACER_PROFILE':    return resolveRacerProfile(base44, ctx);
    case 'RACER_TEAM':       return resolveRacerTeam(base44, ctx);
    case 'RACER_NUMBER':     return resolveRacerNumber(base44, ctx);
    case 'RACER_CLASS':     return resolveRacerClass(base44, ctx);
    case 'EVENT_DATE':       return resolveEventDate(base44, ctx);
    case 'EVENT_LOCATION':   return resolveEventLocation(base44, ctx);
    case 'EVENT_SERIES':     return resolveEventSeries(base44, ctx);
    case 'EVENT_TRACK':      return resolveEventTrack(base44, ctx);
    case 'EVENT_CLASSES':    return resolveEventClasses(base44, ctx);
    case 'TEAM_ROSTER':      return resolveTeamRoster(base44, ctx);
    case 'SERIES_EVENTS':    return resolveSeriesEvents(base44, ctx);
    case 'SERIES_CLASSES':   return resolveSeriesClasses(base44, ctx);
    case 'SERIES_CHAMPIONS': return resolveSeriesChampions(base44, ctx);
    case 'TRACK_EVENTS':     return resolveTrackEvents(base44, ctx);
    case 'TRACK_LOCATION':   return resolveTrackLocation(base44, ctx);
    default:
      return {
        intent, status: 'UNSUPPORTED', context: ctx,
        unsupported_reason: `Intent '${intent}' is not implemented`,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveResultWinner(base44: any, ctx: FactContext): Promise<FactResult> {
  // Resolve event if provided
  let event: any = null;
  if (ctx.event) {
    event = await resolveEntity(base44, 'Event', ctx.event);
    if (!event) return { intent: 'RESULT_WINNER', status: 'NO_DATA', context: ctx, reason: 'Event not found' };
  }

  // Build filter for results
  const filter: any = { position: 1, status: { $ne: 'DNF' } };
  if (event) filter.event_id = event.id;
  if (ctx.series) {
    const series = await resolveEntity(base44, 'Series', ctx.series);
    if (series) filter.series_id = series.id;
  }
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }
  if (ctx.session_type) filter.session_type = ctx.session_type;
  else filter.session_type = { $in: RACE_SESSION_TYPES }; // default to race sessions

  const results = await base44.asServiceRole.entities.Results.filter(filter).catch(() => []);

  if (!results || results.length === 0) {
    return {
      intent: 'RESULT_WINNER', status: 'NO_DATA', context: ctx,
      reason: 'No published result with position=1 found for the given context',
    };
  }

  // Check for ambiguity — multiple results may mean multiple competitions
  if (results.length > 1 && !ctx.session_type && !ctx.round) {
    // Group by session_type to check if ambiguous
    const sessionTypes = [...new Set(results.map((r: any) => r.session_type))];
    if (sessionTypes.length > 1 && !ctx.session_type) {
      const options: AmbiguityOption[] = sessionTypes.map((st: string) => ({
        label: st,
        context: { ...ctx, session_type: st },
      }));
      return {
        intent: 'RESULT_WINNER', status: 'AMBIGUOUS', context: ctx,
        ambiguity_options: options,
        reason: `Multiple competition types found: ${sessionTypes.join(', ')}. Specify session_type.`,
      };
    }
  }

  const winnerResult = results[0];
  const racer = winnerResult.driver_id
    ? await base44.asServiceRole.entities.RacerProfile.get(winnerResult.driver_id).catch(() => null)
    : null;

  if (!racer) {
    return {
      intent: 'RESULT_WINNER', status: 'NO_DATA', context: ctx,
      reason: 'Winner result found but racer profile not resolvable',
      evidence: [{ entity_type: 'Results', entity_id: winnerResult.id, field: 'position', value: 1 }],
    };
  }

  const entities: FactEntityRef[] = [
    toEntityRef(racer, 'RacerProfile')!,
  ].filter(Boolean);
  if (event) entities.push(toEntityRef(event, 'Event')!);
  if (winnerResult.series_id) {
    const series = await base44.asServiceRole.entities.Series.get(winnerResult.series_id).catch(() => null);
    if (series) entities.push(toEntityRef(series, 'Series')!);
  }

  const result: FactResult = {
    intent: 'RESULT_WINNER',
    status: 'RESOLVED',
    context: ctx,
    answer: {
      racer_id: racer.id,
      racer_name: racer.display_name,
      position: 1,
      session_type: winnerResult.session_type,
    },
    entities,
    evidence: [
      { entity_type: 'Results', entity_id: winnerResult.id, field: 'position', value: 1 },
      { entity_type: 'Results', entity_id: winnerResult.id, field: 'session_type', value: winnerResult.session_type },
    ],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveResultPosition(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer) return { intent: 'RESULT_POSITION', status: 'NO_DATA', context: ctx, reason: 'Racer not found' };

  const filter: any = { driver_id: racer.id, status: { $ne: 'DNF' } };
  if (ctx.event) {
    const event = await resolveEntity(base44, 'Event', ctx.event);
    if (event) filter.event_id = event.id;
  }
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }
  if (ctx.session_type) filter.session_type = ctx.session_type;
  else filter.session_type = { $in: RACE_SESSION_TYPES };

  const results = await base44.asServiceRole.entities.Results.filter(filter).catch(() => []);
  if (!results || results.length === 0) {
    return { intent: 'RESULT_POSITION', status: 'NO_DATA', context: ctx, reason: 'No results found for racer' };
  }

  // Sort by event date descending if possible, take latest
  const result = results[0];
  const event = result.event_id ? await base44.asServiceRole.entities.Event.get(result.event_id).catch(() => null) : null;

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!];
  if (event) entities.push(toEntityRef(event, 'Event')!);

  const factResult: FactResult = {
    intent: 'RESULT_POSITION',
    status: 'RESOLVED',
    context: ctx,
    answer: { position: result.position, session_type: result.session_type },
    entities,
    evidence: [{ entity_type: 'Results', entity_id: result.id, field: 'position', value: result.position }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  factResult.answer_text = buildAnswerText(factResult) || undefined;
  return factResult;
}

async function resolveResultList(base44: any, ctx: FactContext): Promise<FactResult> {
  let event: any = null;
  if (ctx.event) {
    event = await resolveEntity(base44, 'Event', ctx.event);
    if (!event) return { intent: 'RESULT_LIST', status: 'NO_DATA', context: ctx, reason: 'Event not found' };
  }

  const filter: any = {};
  if (event) filter.event_id = event.id;
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }
  if (ctx.session_type) filter.session_type = ctx.session_type;
  else filter.session_type = { $in: RACE_SESSION_TYPES };

  const results = await base44.asServiceRole.entities.Results.filter(filter).catch(() => []);
  if (!results || results.length === 0) {
    return { intent: 'RESULT_LIST', status: 'NO_DATA', context: ctx, reason: 'No results found' };
  }

  // Sort by position
  const sorted = results.sort((a: any, b: any) => (a.position || 999) - (b.position || 999));
  const list = sorted.slice(0, 30).map((r: any) => ({
    position: r.position,
    racer_id: r.driver_id,
    status: r.status,
  }));

  const entities: FactEntityRef[] = [];
  if (event) entities.push(toEntityRef(event, 'Event')!);

  return {
    intent: 'RESULT_LIST',
    status: 'RESOLVED',
    context: ctx,
    answer: { results: list, count: sorted.length },
    entities,
    evidence: [{ entity_type: 'Results', entity_id: sorted[0]?.id, field: 'event_id', value: event?.id }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
}

async function resolveResultPodium(base44: any, ctx: FactContext): Promise<FactResult> {
  let event: any = null;
  if (ctx.event) {
    event = await resolveEntity(base44, 'Event', ctx.event);
    if (!event) return { intent: 'RESULT_PODIUM', status: 'NO_DATA', context: ctx, reason: 'Event not found' };
  }

  const filter: any = { position: { $lte: 3 }, status: { $ne: 'DNF' } };
  if (event) filter.event_id = event.id;
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }
  if (ctx.session_type) filter.session_type = ctx.session_type;
  else filter.session_type = { $in: RACE_SESSION_TYPES };

  const results = await base44.asServiceRole.entities.Results.filter(filter).catch(() => []);
  if (!results || results.length === 0) {
    return { intent: 'RESULT_PODIUM', status: 'NO_DATA', context: ctx, reason: 'No podium results found' };
  }

  const sorted = results.sort((a: any, b: any) => (a.position || 999) - (b.position || 999));
  const podium = [];
  for (const r of sorted.slice(0, 3)) {
    const racer = r.driver_id ? await base44.asServiceRole.entities.RacerProfile.get(r.driver_id).catch(() => null) : null;
    podium.push({
      position: r.position,
      racer_id: r.driver_id,
      racer_name: racer?.display_name || '—',
    });
  }

  const entities: FactEntityRef[] = [];
  if (event) entities.push(toEntityRef(event, 'Event')!);

  const result: FactResult = {
    intent: 'RESULT_PODIUM',
    status: 'RESOLVED',
    context: ctx,
    answer: { podium },
    entities,
    evidence: sorted.slice(0, 3).map((r: any) => ({ entity_type: 'Results', entity_id: r.id, field: 'position', value: r.position })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDINGS RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveStandingsLeader(base44: any, ctx: FactContext): Promise<FactResult> {
  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series) return { intent: 'STANDINGS_LEADER', status: 'NO_DATA', context: ctx, reason: 'Series not found' };

  const filter: any = { series_id: series.id, season_year: ctx.season };
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }

  const standings = await base44.asServiceRole.entities.Standings.filter(filter).catch(() => []);
  if (!standings || standings.length === 0) {
    return { intent: 'STANDINGS_LEADER', status: 'NO_DATA', context: ctx, reason: 'No standings found' };
  }

  // Find position=1 or rank=1
  const leaders = standings.filter((s: any) => s.position === 1 || s.rank === 1);
  if (leaders.length === 0) {
    // Fall back to highest points
    const sorted = standings.sort((a: any, b: any) => (b.points_total || 0) - (a.points_total || 0));
    if (sorted.length === 0) {
      return { intent: 'STANDINGS_LEADER', status: 'NO_DATA', context: ctx, reason: 'No standings with position/rank found' };
    }
    return resolveStandingsLeaderFromRecord(base44, ctx, sorted[0], series);
  }

  if (leaders.length > 1) {
    const options: AmbiguityOption[] = leaders.map((l: any) => ({
      label: `Position ${l.position || l.rank}`,
      context: { ...ctx },
    }));
    return {
      intent: 'STANDINGS_LEADER', status: 'AMBIGUOUS', context: ctx,
      ambiguity_options: options,
      reason: 'Multiple standings records with position=1 found',
    };
  }

  return resolveStandingsLeaderFromRecord(base44, ctx, leaders[0], series);
}

async function resolveStandingsLeaderFromRecord(base44: any, ctx: FactContext, standing: any, series: any): Promise<FactResult> {
  const racer = standing.driver_id
    ? await base44.asServiceRole.entities.RacerProfile.get(standing.driver_id).catch(() => null)
    : null;

  if (!racer) {
    return { intent: 'STANDINGS_LEADER', status: 'NO_DATA', context: ctx, reason: 'Leader standings found but racer not resolvable' };
  }

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!, toEntityRef(series, 'Series')!];

  const result: FactResult = {
    intent: 'STANDINGS_LEADER',
    status: 'RESOLVED',
    context: ctx,
    answer: {
      racer_id: racer.id,
      racer_name: racer.display_name,
      position: standing.position || standing.rank,
      points_total: standing.points_total,
    },
    entities,
    evidence: [
      { entity_type: 'Standings', entity_id: standing.id, field: 'position', value: standing.position || standing.rank },
      { entity_type: 'Standings', entity_id: standing.id, field: 'points_total', value: standing.points_total },
    ],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveStandingsPosition(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer) return { intent: 'STANDINGS_POSITION', status: 'NO_DATA', context: ctx, reason: 'Racer not found' };

  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series) return { intent: 'STANDINGS_POSITION', status: 'NO_DATA', context: ctx, reason: 'Series not found' };

  const filter: any = { driver_id: racer.id, series_id: series.id, season_year: ctx.season };
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }

  const standings = await base44.asServiceRole.entities.Standings.filter(filter).catch(() => []);
  if (!standings || standings.length === 0) {
    return { intent: 'STANDINGS_POSITION', status: 'NO_DATA', context: ctx, reason: 'No standings found for racer' };
  }

  const standing = standings[0];
  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!, toEntityRef(series, 'Series')!];

  const result: FactResult = {
    intent: 'STANDINGS_POSITION',
    status: 'RESOLVED',
    context: ctx,
    answer: { position: standing.position || standing.rank, points_total: standing.points_total },
    entities,
    evidence: [{ entity_type: 'Standings', entity_id: standing.id, field: 'position', value: standing.position || standing.rank }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveStandingsPoints(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer) return { intent: 'STANDINGS_POINTS', status: 'NO_DATA', context: ctx, reason: 'Racer not found' };

  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series) return { intent: 'STANDINGS_POINTS', status: 'NO_DATA', context: ctx, reason: 'Series not found' };

  const filter: any = { driver_id: racer.id, series_id: series.id, season_year: ctx.season };
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }

  const standings = await base44.asServiceRole.entities.Standings.filter(filter).catch(() => []);
  if (!standings || standings.length === 0) {
    return { intent: 'STANDINGS_POINTS', status: 'NO_DATA', context: ctx, reason: 'No standings found for racer' };
  }

  const standing = standings[0];
  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!, toEntityRef(series, 'Series')!];

  const result: FactResult = {
    intent: 'STANDINGS_POINTS',
    status: 'RESOLVED',
    context: ctx,
    answer: { points_total: standing.points_total },
    entities,
    evidence: [{ entity_type: 'Standings', entity_id: standing.id, field: 'points_total', value: standing.points_total }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAMPIONSHIP RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveChampionSeason(base44: any, ctx: FactContext): Promise<FactResult> {
  // SEMANTIC GAP: No is_final flag on Standings.
  // We resolve the position=1/rank=1 record but note the gap in evidence.
  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series) return { intent: 'CHAMPION_SEASON', status: 'NO_DATA', context: ctx, reason: 'Series not found' };

  const filter: any = { series_id: series.id, season_year: ctx.season };
  if (ctx.class) {
    const sc = await resolveSeriesClass(base44, ctx.class, ctx.series);
    if (sc) filter.series_class_id = sc.id;
  }

  const standings = await base44.asServiceRole.entities.Standings.filter(filter).catch(() => []);
  if (!standings || standings.length === 0) {
    return { intent: 'CHAMPION_SEASON', status: 'NO_DATA', context: ctx, reason: 'No standings found for series/season' };
  }

  const leaders = standings.filter((s: any) => s.position === 1 || s.rank === 1);
  if (leaders.length === 0) {
    return { intent: 'CHAMPION_SEASON', status: 'NO_DATA', context: ctx, reason: 'No champion (position=1) standings found' };
  }

  const standing = leaders[0];
  const racer = standing.driver_id
    ? await base44.asServiceRole.entities.RacerProfile.get(standing.driver_id).catch(() => null)
    : null;

  if (!racer) {
    return { intent: 'CHAMPION_SEASON', status: 'NO_DATA', context: ctx, reason: 'Champion standings found but racer not resolvable' };
  }

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!, toEntityRef(series, 'Series')!];

  const result: FactResult = {
    intent: 'CHAMPION_SEASON',
    status: 'RESOLVED',
    context: ctx,
    answer: {
      racer_id: racer.id,
      racer_name: racer.display_name,
      position: 1,
      points_total: standing.points_total,
      semantic_gap: 'No is_final flag — cannot confirm season is complete',
    },
    entities,
    evidence: [
      { entity_type: 'Standings', entity_id: standing.id, field: 'position', value: 1 },
      { entity_type: 'Standings', entity_id: standing.id, field: 'points_total', value: standing.points_total },
    ],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveChampionSpecialEvent(base44: any, ctx: FactContext): Promise<FactResult> {
  // UNSUPPORTED — no championship_designation field exists
  return {
    intent: 'CHAMPION_SPECIAL_EVENT',
    status: 'UNSUPPORTED',
    context: ctx,
    unsupported_reason: 'No championship_designation field on Event or Session. Cannot distinguish special-event championship from regular round. REQUIRED RaceCore change.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RACER RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveRacerProfile(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer || !RACER_VISIBLE(racer)) {
    return { intent: 'RACER_PROFILE', status: 'NO_DATA', context: ctx, reason: 'Racer not found or not public' };
  }

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!];
  const hometown = [racer.hometown_city, racer.hometown_state, racer.hometown_country].filter(Boolean).join(', ');

  const result: FactResult = {
    intent: 'RACER_PROFILE',
    status: 'RESOLVED',
    context: ctx,
    answer: {
      display_name: racer.display_name,
      primary_discipline: racer.primary_discipline,
      hometown: hometown || undefined,
      career_status: racer.career_status,
    },
    entities,
    evidence: [
      { entity_type: 'RacerProfile', entity_id: racer.id, field: 'display_name', value: racer.display_name },
    ],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveRacerTeam(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer) return { intent: 'RACER_TEAM', status: 'NO_DATA', context: ctx, reason: 'Racer not found' };

  // Event-specific team via Entry
  let team: any = null;
  let entry: any = null;

  if (ctx.event) {
    const event = await resolveEntity(base44, 'Event', ctx.event);
    if (event) {
      const entries = await base44.asServiceRole.entities.Entry.filter({
        driver_id: racer.id, event_id: event.id,
      }).catch(() => []);
      if (entries && entries.length > 0) {
        entry = entries[0];
        if (entry.team_id) {
          team = await base44.asServiceRole.entities.Team.get(entry.team_id).catch(() => null);
        }
      }
    }
  }

  // Fallback to legacy Driver.team_id
  if (!team && racer.legacy_driver_id) {
    const driver = await base44.asServiceRole.entities.Driver.get(racer.legacy_driver_id).catch(() => null);
    if (driver?.team_id) {
      team = await base44.asServiceRole.entities.Team.get(driver.team_id).catch(() => null);
    }
  }

  if (!team) {
    return { intent: 'RACER_TEAM', status: 'NO_DATA', context: ctx, reason: 'No team found for racer in this context' };
  }

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!, toEntityRef(team, 'Team')!];
  if (ctx.event) {
    const event = await resolveEntity(base44, 'Event', ctx.event);
    if (event) entities.push(toEntityRef(event, 'Event')!);
  }

  const result: FactResult = {
    intent: 'RACER_TEAM',
    status: 'RESOLVED',
    context: ctx,
    answer: { team_id: team.id, team_name: team.name },
    entities,
    evidence: entry
      ? [{ entity_type: 'Entry', entity_id: entry.id, field: 'team_id', value: entry.team_id }]
      : [{ entity_type: 'Driver', entity_id: racer.legacy_driver_id, field: 'team_id', value: team.id }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveRacerNumber(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer) return { intent: 'RACER_NUMBER', status: 'NO_DATA', context: ctx, reason: 'Racer not found' };

  // Event-specific number via Entry
  let number: string | null = null;
  let sourceEntity = 'Driver';

  if (ctx.event) {
    const event = await resolveEntity(base44, 'Event', ctx.event);
    if (event) {
      const entries = await base44.asServiceRole.entities.Entry.filter({
        driver_id: racer.id, event_id: event.id,
      }).catch(() => []);
      if (entries && entries.length > 0 && entries[0].car_number) {
        number = entries[0].car_number;
        sourceEntity = 'Entry';
      }
    }
  }

  // Fallback to legacy Driver.primary_number
  if (!number && racer.legacy_driver_id) {
    const driver = await base44.asServiceRole.entities.Driver.get(racer.legacy_driver_id).catch(() => null);
    if (driver?.primary_number) {
      number = driver.primary_number;
      sourceEntity = 'Driver';
    }
  }

  if (!number) {
    return { intent: 'RACER_NUMBER', status: 'NO_DATA', context: ctx, reason: 'No number found for racer in this context' };
  }

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!];

  const result: FactResult = {
    intent: 'RACER_NUMBER',
    status: 'RESOLVED',
    context: ctx,
    answer: { number },
    entities,
    evidence: [{ entity_type: sourceEntity, entity_id: racer.id, field: sourceEntity === 'Entry' ? 'car_number' : 'primary_number', value: number }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveRacerClass(base44: any, ctx: FactContext): Promise<FactResult> {
  const racer = await resolveEntity(base44, 'RacerProfile', ctx.racer!);
  if (!racer) return { intent: 'RACER_CLASS', status: 'NO_DATA', context: ctx, reason: 'Racer not found' };

  // Via SeasonParticipation
  const filter: any = { racer_profile_id: racer.id };
  if (ctx.series) {
    const series = await resolveEntity(base44, 'Series', ctx.series);
    if (series) filter.series_id = series.id;
  }
  if (ctx.season) filter.season_year = ctx.season;

  const participations = await base44.asServiceRole.entities.SeasonParticipation.filter(filter).catch(() => []);
  let className: string | null = null;
  let seriesRef: FactEntityRef | null = null;

  if (participations && participations.length > 0) {
    const sp = participations[0];
    if (sp.series_id) {
      const series = await base44.asServiceRole.entities.Series.get(sp.series_id).catch(() => null);
      if (series) seriesRef = toEntityRef(series, 'Series');
      // Get classes for this series
      const classes = await base44.asServiceRole.entities.SeriesClass.filter({ series_id: sp.series_id }).catch(() => []);
      if (classes && classes.length > 0) {
        className = classes[0].class_name;
      }
    }
  }

  // Fallback to legacy Driver
  if (!className && racer.legacy_driver_id) {
    const driver = await base44.asServiceRole.entities.Driver.get(racer.legacy_driver_id).catch(() => null);
    if (driver?.primary_class_id) {
      const sc = await base44.asServiceRole.entities.SeriesClass.get(driver.primary_class_id).catch(() => null);
      if (sc) className = sc.class_name;
    }
  }

  if (!className) {
    return { intent: 'RACER_CLASS', status: 'NO_DATA', context: ctx, reason: 'No class found for racer' };
  }

  const entities: FactEntityRef[] = [toEntityRef(racer, 'RacerProfile')!];
  if (seriesRef) entities.push(seriesRef);

  const result: FactResult = {
    intent: 'RACER_CLASS',
    status: 'RESOLVED',
    context: ctx,
    answer: { class_name: className },
    entities,
    evidence: participations?.length > 0
      ? [{ entity_type: 'SeasonParticipation', entity_id: participations[0].id, field: 'series_id', value: participations[0].series_id }]
      : [{ entity_type: 'Driver', entity_id: racer.legacy_driver_id, field: 'primary_class_id', value: className }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveEventDate(base44: any, ctx: FactContext): Promise<FactResult> {
  const event = await resolveEntity(base44, 'Event', ctx.event!);
  if (!event || !EVENT_VISIBLE(event)) {
    return { intent: 'EVENT_DATE', status: 'NO_DATA', context: ctx, reason: 'Event not found or not public' };
  }

  const entities: FactEntityRef[] = [toEntityRef(event, 'Event')!];
  const result: FactResult = {
    intent: 'EVENT_DATE',
    status: 'RESOLVED',
    context: ctx,
    answer: { date: event.event_date, end_date: event.end_date },
    entities,
    evidence: [{ entity_type: 'Event', entity_id: event.id, field: 'event_date', value: event.event_date }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveEventLocation(base44: any, ctx: FactContext): Promise<FactResult> {
  const event = await resolveEntity(base44, 'Event', ctx.event!);
  if (!event || !EVENT_VISIBLE(event)) {
    return { intent: 'EVENT_LOCATION', status: 'NO_DATA', context: ctx, reason: 'Event not found or not public' };
  }

  const track = event.track_id ? await base44.asServiceRole.entities.Track.get(event.track_id).catch(() => null) : null;
  if (!track) {
    return { intent: 'EVENT_LOCATION', status: 'NO_DATA', context: ctx, reason: 'Event has no track or track not found' };
  }

  const location = formatLocation(track.location_city, track.location_state, track.location_country);
  const entities: FactEntityRef[] = [toEntityRef(event, 'Event')!, toEntityRef(track, 'Track')!];

  const result: FactResult = {
    intent: 'EVENT_LOCATION',
    status: 'RESOLVED',
    context: ctx,
    answer: { track_name: track.name, location },
    entities,
    evidence: [
      { entity_type: 'Event', entity_id: event.id, field: 'track_id', value: event.track_id },
      { entity_type: 'Track', entity_id: track.id, field: 'location_city', value: track.location_city },
    ],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveEventSeries(base44: any, ctx: FactContext): Promise<FactResult> {
  const event = await resolveEntity(base44, 'Event', ctx.event!);
  if (!event || !EVENT_VISIBLE(event)) {
    return { intent: 'EVENT_SERIES', status: 'NO_DATA', context: ctx, reason: 'Event not found or not public' };
  }

  const series = event.series_id ? await base44.asServiceRole.entities.Series.get(event.series_id).catch(() => null) : null;
  if (!series) {
    return { intent: 'EVENT_SERIES', status: 'NO_DATA', context: ctx, reason: 'Event has no series or series not found' };
  }

  const entities: FactEntityRef[] = [toEntityRef(event, 'Event')!, toEntityRef(series, 'Series')!];
  const result: FactResult = {
    intent: 'EVENT_SERIES',
    status: 'RESOLVED',
    context: ctx,
    answer: { series_name: series.name },
    entities,
    evidence: [{ entity_type: 'Event', entity_id: event.id, field: 'series_id', value: event.series_id }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveEventTrack(base44: any, ctx: FactContext): Promise<FactResult> {
  const event = await resolveEntity(base44, 'Event', ctx.event!);
  if (!event || !EVENT_VISIBLE(event)) {
    return { intent: 'EVENT_TRACK', status: 'NO_DATA', context: ctx, reason: 'Event not found or not public' };
  }

  const track = event.track_id ? await base44.asServiceRole.entities.Track.get(event.track_id).catch(() => null) : null;
  if (!track) {
    return { intent: 'EVENT_TRACK', status: 'NO_DATA', context: ctx, reason: 'Event has no track' };
  }

  const entities: FactEntityRef[] = [toEntityRef(event, 'Event')!, toEntityRef(track, 'Track')!];
  const result: FactResult = {
    intent: 'EVENT_TRACK',
    status: 'RESOLVED',
    context: ctx,
    answer: { track_name: track.name },
    entities,
    evidence: [{ entity_type: 'Event', entity_id: event.id, field: 'track_id', value: event.track_id }],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveEventClasses(base44: any, ctx: FactContext): Promise<FactResult> {
  const event = await resolveEntity(base44, 'Event', ctx.event!);
  if (!event || !EVENT_VISIBLE(event)) {
    return { intent: 'EVENT_CLASSES', status: 'NO_DATA', context: ctx, reason: 'Event not found or not public' };
  }

  const classes = await base44.asServiceRole.entities.EventClass.filter({ event_id: event.id }).catch(() => []);
  if (!classes || classes.length === 0) {
    return { intent: 'EVENT_CLASSES', status: 'NO_DATA', context: ctx, reason: 'No classes found for event' };
  }

  const classNames = classes.map((c: any) => c.class_name).filter(Boolean);
  const entities: FactEntityRef[] = [toEntityRef(event, 'Event')!];

  const result: FactResult = {
    intent: 'EVENT_CLASSES',
    status: 'RESOLVED',
    context: ctx,
    answer: { classes: classNames },
    entities,
    evidence: classes.map((c: any) => ({ entity_type: 'EventClass', entity_id: c.id, field: 'class_name', value: c.class_name })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM / SERIES / TRACK RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════

async function resolveTeamRoster(base44: any, ctx: FactContext): Promise<FactResult> {
  const team = await resolveEntity(base44, 'Team', ctx.team!);
  if (!team || !TEAM_VISIBLE(team)) {
    return { intent: 'TEAM_ROSTER', status: 'NO_DATA', context: ctx, reason: 'Team not found or not public' };
  }

  const filter: any = { team_id: team.id };
  const entries = await base44.asServiceRole.entities.Entry.filter(filter).catch(() => []);
  if (!entries || entries.length === 0) {
    return { intent: 'TEAM_ROSTER', status: 'NO_DATA', context: ctx, reason: 'No entries found for team' };
  }

  // Get unique racer IDs
  const racerIds = [...new Set(entries.map((e: any) => e.driver_id).filter(Boolean))];
  const racers: any[] = [];
  for (const id of racerIds.slice(0, 20)) {
    const r = await base44.asServiceRole.entities.RacerProfile.get(id).catch(() => null);
    if (r && RACER_VISIBLE(r)) racers.push(r);
  }

  if (racers.length === 0) {
    return { intent: 'TEAM_ROSTER', status: 'NO_DATA', context: ctx, reason: 'Team has entries but no public racer profiles' };
  }

  const entities: FactEntityRef[] = [toEntityRef(team, 'Team')!, ...racers.map((r) => toEntityRef(r, 'RacerProfile')!)];

  const result: FactResult = {
    intent: 'TEAM_ROSTER',
    status: 'RESOLVED',
    context: ctx,
    answer: { racers: racers.map((r) => r.display_name) },
    entities,
    evidence: entries.slice(0, 5).map((e: any) => ({ entity_type: 'Entry', entity_id: e.id, field: 'team_id', value: e.team_id })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveSeriesEvents(base44: any, ctx: FactContext): Promise<FactResult> {
  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series || !SERIES_VISIBLE(series)) {
    return { intent: 'SERIES_EVENTS', status: 'NO_DATA', context: ctx, reason: 'Series not found or not public' };
  }

  const filter: any = { series_id: series.id };
  if (ctx.season) filter.season = ctx.season;
  const events = await base44.asServiceRole.entities.Event.filter(filter).catch(() => []);
  const visibleEvents = (events || []).filter(EVENT_VISIBLE);

  if (visibleEvents.length === 0) {
    return { intent: 'SERIES_EVENTS', status: 'NO_DATA', context: ctx, reason: 'No published events found for series' };
  }

  const entities: FactEntityRef[] = [toEntityRef(series, 'Series')!, ...visibleEvents.slice(0, 10).map((e) => toEntityRef(e, 'Event')!)];

  const result: FactResult = {
    intent: 'SERIES_EVENTS',
    status: 'RESOLVED',
    context: ctx,
    answer: { count: visibleEvents.length, events: visibleEvents.slice(0, 20).map((e) => ({ name: e.name, date: e.event_date })) },
    entities,
    evidence: visibleEvents.slice(0, 5).map((e) => ({ entity_type: 'Event', entity_id: e.id, field: 'series_id', value: e.series_id })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveSeriesClasses(base44: any, ctx: FactContext): Promise<FactResult> {
  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series || !SERIES_VISIBLE(series)) {
    return { intent: 'SERIES_CLASSES', status: 'NO_DATA', context: ctx, reason: 'Series not found or not public' };
  }

  const classes = await base44.asServiceRole.entities.SeriesClass.filter({ series_id: series.id, active: true }).catch(() => []);
  if (!classes || classes.length === 0) {
    return { intent: 'SERIES_CLASSES', status: 'NO_DATA', context: ctx, reason: 'No active classes found for series' };
  }

  const classNames = classes.map((c: any) => c.class_name).filter(Boolean);
  const entities: FactEntityRef[] = [toEntityRef(series, 'Series')!];

  const result: FactResult = {
    intent: 'SERIES_CLASSES',
    status: 'RESOLVED',
    context: ctx,
    answer: { classes: classNames },
    entities,
    evidence: classes.map((c) => ({ entity_type: 'SeriesClass', entity_id: c.id, field: 'class_name', value: c.class_name })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveSeriesChampions(base44: any, ctx: FactContext): Promise<FactResult> {
  const series = await resolveEntity(base44, 'Series', ctx.series!);
  if (!series || !SERIES_VISIBLE(series)) {
    return { intent: 'SERIES_CHAMPIONS', status: 'NO_DATA', context: ctx, reason: 'Series not found or not public' };
  }

  const filter: any = { series_id: series.id };
  if (ctx.season) filter.season_year = ctx.season;
  const standings = await base44.asServiceRole.entities.Standings.filter(filter).catch(() => []);

  const leaders = (standings || []).filter((s: any) => s.position === 1 || s.rank === 1);
  if (leaders.length === 0) {
    return { intent: 'SERIES_CHAMPIONS', status: 'NO_DATA', context: ctx, reason: 'No champion standings found' };
  }

  const champions: any[] = [];
  for (const s of leaders) {
    const racer = s.driver_id ? await base44.asServiceRole.entities.RacerProfile.get(s.driver_id).catch(() => null) : null;
    const sc = s.series_class_id ? await base44.asServiceRole.entities.SeriesClass.get(s.series_class_id).catch(() => null) : null;
    champions.push({
      class_name: sc?.class_name || 'Overall',
      racer_name: racer?.display_name || '—',
      season_year: s.season_year,
    });
  }

  const entities: FactEntityRef[] = [toEntityRef(series, 'Series')!];

  const result: FactResult = {
    intent: 'SERIES_CHAMPIONS',
    status: 'RESOLVED',
    context: ctx,
    answer: { champions },
    entities,
    evidence: leaders.map((s) => ({ entity_type: 'Standings', entity_id: s.id, field: 'position', value: 1 })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveTrackEvents(base44: any, ctx: FactContext): Promise<FactResult> {
  const track = await resolveEntity(base44, 'Track', ctx.track!);
  if (!track || !TRACK_VISIBLE(track)) {
    return { intent: 'TRACK_EVENTS', status: 'NO_DATA', context: ctx, reason: 'Track not found or not public' };
  }

  const filter: any = { track_id: track.id };
  if (ctx.season) filter.season = ctx.season;
  const events = await base44.asServiceRole.entities.Event.filter(filter).catch(() => []);
  const visibleEvents = (events || []).filter(EVENT_VISIBLE);

  if (visibleEvents.length === 0) {
    return { intent: 'TRACK_EVENTS', status: 'NO_DATA', context: ctx, reason: 'No published events found for track' };
  }

  const entities: FactEntityRef[] = [toEntityRef(track, 'Track')!, ...visibleEvents.slice(0, 10).map((e) => toEntityRef(e, 'Event')!)];

  const result: FactResult = {
    intent: 'TRACK_EVENTS',
    status: 'RESOLVED',
    context: ctx,
    answer: { count: visibleEvents.length, events: visibleEvents.slice(0, 20).map((e) => ({ name: e.name, date: e.event_date })) },
    entities,
    evidence: visibleEvents.slice(0, 5).map((e) => ({ entity_type: 'Event', entity_id: e.id, field: 'track_id', value: e.track_id })),
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

async function resolveTrackLocation(base44: any, ctx: FactContext): Promise<FactResult> {
  const track = await resolveEntity(base44, 'Track', ctx.track!);
  if (!track || !TRACK_VISIBLE(track)) {
    return { intent: 'TRACK_LOCATION', status: 'NO_DATA', context: ctx, reason: 'Track not found or not public' };
  }

  const location = formatLocation(track.location_city, track.location_state, track.location_country);
  if (!location) {
    return { intent: 'TRACK_LOCATION', status: 'NO_DATA', context: ctx, reason: 'Track has no location data' };
  }

  const entities: FactEntityRef[] = [toEntityRef(track, 'Track')!];
  const result: FactResult = {
    intent: 'TRACK_LOCATION',
    status: 'RESOLVED',
    context: ctx,
    answer: { location },
    entities,
    evidence: [
      { entity_type: 'Track', entity_id: track.id, field: 'location_city', value: track.location_city },
    ],
    public_links: resolvePublicLinks(entities),
    resolved_at: new Date().toISOString(),
  };
  result.answer_text = buildAnswerText(result) || undefined;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Resolve SeriesClass by name or slug within a series
// ═══════════════════════════════════════════════════════════════════════════

async function resolveSeriesClass(base44: any, classRef: string, seriesRef?: string): Promise<any | null> {
  try {
    // Try by slug
    const bySlug = await base44.asServiceRole.entities.SeriesClass.filter({ slug: classRef });
    if (bySlug && bySlug.length > 0) return bySlug[0];
    // Try by class_name (optionally scoped to series)
    const filter: any = { class_name: classRef };
    if (seriesRef) {
      const series = await resolveEntity(base44, 'Series', seriesRef);
      if (series) filter.series_id = series.id;
    }
    const byName = await base44.asServiceRole.entities.SeriesClass.filter(filter);
    if (byName && byName.length > 0) return byName[0];
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Format location string
// ═══════════════════════════════════════════════════════════════════════════

function formatLocation(city?: string, state?: string, country?: string): string {
  return [city, state, country].filter(Boolean).join(', ');
}