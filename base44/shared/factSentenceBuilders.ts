/**
 * factSentenceBuilders.ts — Phase 17C
 *
 * Deterministic sentence builders for resolved motorsport facts.
 *
 * These produce human-readable answer text FROM authoritative data only.
 * No LLM is used. If data is missing, the clause is omitted — never fabricated.
 *
 * Imported by backend functions (resolveMotorsportFact, runFactResolverTests)
 * and potentially by frontend components that display fact answers.
 */

import type { FactResult, FactEntityRef, FactContext, PublicLink } from './factTypes';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function entityName(entities: FactEntityRef[] | undefined, type: string): string | null {
  const e = entities?.find((e) => e.type === type);
  return e?.name || null;
}

function entitySlug(entities: FactEntityRef[] | undefined, type: string): string | null {
  const e = entities?.find((e) => e.type === type);
  return e?.slug || null;
}

function formatLocation(city?: string, state?: string, country?: string): string {
  return [city, state, country].filter(Boolean).join(', ');
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ═══════════════════════════════════════════════════════════════════════════
// SENTENCE BUILDERS BY INTENT
// ═══════════════════════════════════════════════════════════════════════════

type Builder = (result: FactResult) => string | null;

const builders: Record<string, Builder> = {

  // ── RESULT_WINNER ──────────────────────────────────────────────────────
  RESULT_WINNER: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const event = entityName(r.entities, 'Event');
    const className = r.context.class;
    const sessionType = r.context.session_type;
    if (!racer) return null;

    const competitionLabel = sessionType && sessionType !== 'Final' && sessionType !== 'Feature'
      ? `${sessionType} ${className || ''}`.trim()
      : className || 'the race';

    if (event) {
      return `${racer} won the ${competitionLabel} at ${event}.`;
    }
    return `${racer} won the ${competitionLabel}.`;
  },

  // ── RESULT_POSITION ────────────────────────────────────────────────────
  RESULT_POSITION: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const event = entityName(r.entities, 'Event');
    const pos = r.answer?.position;
    if (!racer || pos == null) return null;

    const posLabel = pos === 1 ? 'won' : `finished ${ordinal(pos)}`;
    if (event) {
      return `${racer} ${posLabel} at ${event}.`;
    }
    return `${racer} ${posLabel}.`;
  },

  // ── RESULT_PODIUM ──────────────────────────────────────────────────────
  RESULT_PODIUM: (r) => {
    const event = entityName(r.entities, 'Event');
    const className = r.context.class;
    const podium = r.answer?.podium;
    if (!podium || podium.length === 0) return null;

    const parts = podium.map((p: any, i: number) =>
      `${ordinal(i + 1)}: ${p.racer_name || '—'}`
    ).join(', ');

    const where = event ? ` at ${event}` : '';
    const what = className ? ` ${className}` : '';
    return `Podium${what}${where}: ${parts}.`;
  },

  // ── STANDINGS_LEADER ───────────────────────────────────────────────────
  STANDINGS_LEADER: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const series = entityName(r.entities, 'Series');
    const className = r.context.class;
    const season = r.context.season;
    const points = r.answer?.points_total;
    if (!racer) return null;

    const seriesLabel = series || 'the series';
    const classLabel = className ? ` ${className}` : '';
    const seasonLabel = season ? ` ${season}` : '';
    const pointsLabel = points != null ? ` with ${points} points` : '';

    return `${racer} leads the ${seriesLabel}${classLabel} standings${seasonLabel}${pointsLabel}.`;
  },

  // ── STANDINGS_POSITION ─────────────────────────────────────────────────
  STANDINGS_POSITION: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const series = entityName(r.entities, 'Series');
    const className = r.context.class;
    const season = r.context.season;
    const pos = r.answer?.position || r.answer?.rank;
    if (!racer || pos == null) return null;

    const seriesLabel = series || 'the series';
    const classLabel = className ? ` ${className}` : '';
    const seasonLabel = season ? ` ${season}` : '';

    return `${racer} is ${ordinal(pos)} in the ${seriesLabel}${classLabel} standings${seasonLabel}.`;
  },

  // ── STANDINGS_POINTS ───────────────────────────────────────────────────
  STANDINGS_POINTS: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const series = entityName(r.entities, 'Series');
    const className = r.context.class;
    const season = r.context.season;
    const points = r.answer?.points_total;
    if (!racer || points == null) return null;

    const seriesLabel = series || 'the series';
    const classLabel = className ? ` ${className}` : '';
    const seasonLabel = season ? ` ${season}` : '';

    return `${racer} has ${points} points in the ${seriesLabel}${classLabel} standings${seasonLabel}.`;
  },

  // ── CHAMPION_SEASON ────────────────────────────────────────────────────
  CHAMPION_SEASON: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const series = entityName(r.entities, 'Series');
    const className = r.context.class;
    const season = r.context.season;
    if (!racer) return null;

    const seriesLabel = series || 'the series';
    const classLabel = className ? ` ${className}` : '';
    const seasonLabel = season ? ` ${season}` : '';

    return `${racer} is the ${seriesLabel}${classLabel} champion${seasonLabel}.`;
  },

  // ── CHAMPION_SPECIAL_EVENT ─────────────────────────────────────────────
  CHAMPION_SPECIAL_EVENT: (r) => {
    // Currently UNSUPPORTED — no championship_designation field exists
    return null;
  },

  // ── RACER_PROFILE ──────────────────────────────────────────────────────
  RACER_PROFILE: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    if (!racer) return null;
    const discipline = r.answer?.primary_discipline;
    const hometown = r.answer?.hometown;
    const parts: string[] = [racer];
    if (discipline) parts.push(`is a ${discipline} racer`);
    else parts.push('is a racer');
    if (hometown) parts.push(`from ${hometown}`);
    return parts.join(' ') + '.';
  },

  // ── RACER_TEAM ─────────────────────────────────────────────────────────
  RACER_TEAM: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const team = entityName(r.entities, 'Team');
    if (!racer || !team) return null;
    const event = entityName(r.entities, 'Event');
    if (event) {
      return `${racer} races for ${team} at ${event}.`;
    }
    return `${racer} races for ${team}.`;
  },

  // ── RACER_NUMBER ───────────────────────────────────────────────────────
  RACER_NUMBER: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const number = r.answer?.number;
    if (!racer || !number) return null;
    const event = entityName(r.entities, 'Event');
    if (event) {
      return `${racer} runs #${number} at ${event}.`;
    }
    return `${racer} runs #${number}.`;
  },

  // ── RACER_CLASS ────────────────────────────────────────────────────────
  RACER_CLASS: (r) => {
    const racer = entityName(r.entities, 'RacerProfile');
    const className = r.answer?.class_name;
    if (!racer || !className) return null;
    const series = entityName(r.entities, 'Series');
    if (series) {
      return `${racer} competes in ${className} in the ${series}.`;
    }
    return `${racer} competes in ${className}.`;
  },

  // ── EVENT_DATE ─────────────────────────────────────────────────────────
  EVENT_DATE: (r) => {
    const event = entityName(r.entities, 'Event');
    const date = r.answer?.date;
    if (!event || !date) return null;
    return `${event} takes place on ${date}.`;
  },

  // ── EVENT_LOCATION ─────────────────────────────────────────────────────
  EVENT_LOCATION: (r) => {
    const event = entityName(r.entities, 'Event');
    const track = entityName(r.entities, 'Track');
    const location = r.answer?.location;
    if (!event) return null;
    if (track && location) {
      return `${event} takes place at ${track} in ${location}.`;
    }
    if (track) {
      return `${event} takes place at ${track}.`;
    }
    return `${event} location is not available.`;
  },

  // ── EVENT_SERIES ───────────────────────────────────────────────────────
  EVENT_SERIES: (r) => {
    const event = entityName(r.entities, 'Event');
    const series = entityName(r.entities, 'Series');
    if (!event || !series) return null;
    return `${event} is part of the ${series}.`;
  },

  // ── EVENT_TRACK ────────────────────────────────────────────────────────
  EVENT_TRACK: (r) => {
    const event = entityName(r.entities, 'Event');
    const track = entityName(r.entities, 'Track');
    if (!event || !track) return null;
    return `${event} is hosted by ${track}.`;
  },

  // ── EVENT_CLASSES ──────────────────────────────────────────────────────
  EVENT_CLASSES: (r) => {
    const event = entityName(r.entities, 'Event');
    const classes = r.answer?.classes;
    if (!event || !classes || classes.length === 0) return null;
    return `${event} features ${classes.join(', ')}.`;
  },

  // ── TEAM_ROSTER ────────────────────────────────────────────────────────
  TEAM_ROSTER: (r) => {
    const team = entityName(r.entities, 'Team');
    const racers = r.answer?.racers;
    if (!team || !racers || racers.length === 0) return null;
    if (racers.length <= 3) {
      return `${team} roster: ${racers.join(', ')}.`;
    }
    return `${team} has ${racers.length} racers including ${racers.slice(0, 3).join(', ')} and more.`;
  },

  // ── SERIES_EVENTS ──────────────────────────────────────────────────────
  SERIES_EVENTS: (r) => {
    const series = entityName(r.entities, 'Series');
    const count = r.answer?.count;
    if (!series) return null;
    if (count != null) {
      return `${series} has ${count} event${count === 1 ? '' : 's'}${r.context.season ? ` in ${r.context.season}` : ''}.`;
    }
    return `${series} events${r.context.season ? ` in ${r.context.season}` : ''}.`;
  },

  // ── SERIES_CLASSES ─────────────────────────────────────────────────────
  SERIES_CLASSES: (r) => {
    const series = entityName(r.entities, 'Series');
    const classes = r.answer?.classes;
    if (!series || !classes || classes.length === 0) return null;
    return `${series} classes: ${classes.join(', ')}.`;
  },

  // ── SERIES_CHAMPIONS ────────────────────────────────────────────────────
  SERIES_CHAMPIONS: (r) => {
    const series = entityName(r.entities, 'Series');
    const champions = r.answer?.champions;
    if (!series || !champions || champions.length === 0) return null;
    const parts = champions.map((c: any) =>
      `${c.class_name || 'Overall'}: ${c.racer_name || '—'}`
    );
    return `${series} champions: ${parts.join(', ')}.`;
  },

  // ── TRACK_EVENTS ────────────────────────────────────────────────────────
  TRACK_EVENTS: (r) => {
    const track = entityName(r.entities, 'Track');
    const count = r.answer?.count;
    if (!track) return null;
    if (count != null) {
      return `${track} hosts ${count} event${count === 1 ? '' : 's'}${r.context.season ? ` in ${r.context.season}` : ''}.`;
    }
    return `${track} events${r.context.season ? ` in ${r.context.season}` : ''}.`;
  },

  // ── TRACK_LOCATION ──────────────────────────────────────────────────────
  TRACK_LOCATION: (r) => {
    const track = entityName(r.entities, 'Track');
    const location = r.answer?.location;
    if (!track) return null;
    if (location) {
      return `${track} is located in ${location}.`;
    }
    return `${track} location is not available.`;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC LINK RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

export function resolvePublicLinks(entities: FactEntityRef[] | undefined): PublicLink[] {
  const links: PublicLink[] = [];
  if (!entities) return links;

  for (const e of entities) {
    if (!e.slug) continue;
    switch (e.type) {
      case 'RacerProfile':
        links.push({ label: e.name, url: `/racers/${e.slug}` });
        break;
      case 'Event':
        links.push({ label: e.name, url: `/events/${e.slug}` });
        break;
      case 'Series':
        links.push({ label: e.name, url: `/series/${e.slug}` });
        break;
      case 'Track':
        links.push({ label: e.name, url: `/tracks/${e.slug}` });
        break;
      case 'Team':
        links.push({ label: e.name, url: `/Directory?cat=teams` });
        break;
    }
  }
  return links;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildAnswerText(result: FactResult): string | null {
  const builder = builders[result.intent];
  if (!builder) return null;
  return builder(result);
}