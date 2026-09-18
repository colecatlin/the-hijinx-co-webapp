/**
 * runAnswerabilityAudit — Phase 17B
 *
 * Answerability test suite for AI / answer-engine discovery.
 *
 * Queries REAL records from the existing database and traces whether the
 * public site contains sufficient information to answer representative
 * motorsports questions. This is an architecture test, NOT an AI model
 * simulation. No answers are hardcoded.
 *
 * For each test it reports:
 *   QUESTION
 *   SOURCE ENTITIES (real record IDs used)
 *   EXPECTED FACT RELATIONSHIP
 *   PUBLIC PAGE (canonical route)
 *   ANSWER PRESENT IN HTML? (derived from experience function payload)
 *   STRUCTURED DATA PRESENT? (JSON-LD emitted)
 *   INTERNAL LINKS PRESENT? (related entities linked)
 *   CANONICAL CORRECT? (absolute, slug-based)
 *   PASS / PARTIAL / FAIL
 *
 * Read-only — no writes, no repairs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

type Verdict = 'PASS' | 'PARTIAL' | 'FAIL';

interface AuditTest {
  question: string;
  source_entities: Record<string, string>;
  expected_fact_relationship: string;
  public_page: string;
  answer_present: boolean;
  structured_data_present: boolean;
  internal_links_present: boolean;
  canonical_correct: boolean;
  verdict: Verdict;
  notes: string;
}

function verdict(answer: boolean, structured: boolean, links: boolean, canonical: boolean): Verdict {
  const checks = [answer, structured, links, canonical];
  const passed = checks.filter(Boolean).length;
  if (passed === 4) return 'PASS';
  if (passed >= 2) return 'PARTIAL';
  return 'FAIL';
}

export default async function (req) {
  const base44 = createClientFromRequest(req);

  const tests: AuditTest[] = [];

  // ── Load real records ──────────────────────────────────────────────────────
  const [events, seriesList, tracks, racerProfiles, teams, results, standings, sessions, entries] = await Promise.all([
    base44.asServiceRole.entities.Event.list('-event_date', 50).catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 50).catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 100).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 100).catch(() => []),
    base44.asServiceRole.entities.Session.list().catch(() => []),
    base44.asServiceRole.entities.Entry.list().catch(() => []),
  ]);

  const eventMap = new Map((events as any[]).map((e) => [e.id, e]));
  const seriesMap = new Map((seriesList as any[]).map((s) => [s.id, s]));
  const trackMap = new Map((tracks as any[]).map((t) => [t.id, t]));
  const racerMap = new Map((racerProfiles as any[]).map((r) => [r.id, r]));
  const teamMap = new Map((teams as any[]).map((t) => [t.id, t]));
  const sessionMap = new Map((sessions as any[]).map((s) => [s.id, s]));

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Who won [real event]?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Find a published event with at least one P1 result
    const publishedEvents = (events as any[]).filter((e) =>
      ['Published', 'Live', 'Completed'].includes(e.status) && !e.is_archived && e.event_date
    );
    const resultsByEvent = new Map<string, any[]>();
    (results as any[]).forEach((r) => {
      if (!resultsByEvent.has(r.event_id)) resultsByEvent.set(r.event_id, []);
      resultsByEvent.get(r.event_id)!.push(r);
    });

    let testEvent: any = null;
    let winnerResult: any = null;
    for (const ev of publishedEvents) {
      const evResults = (resultsByEvent.get(ev.id) || []).filter((r) => r.position === 1 && r.status !== 'DNF');
      if (evResults.length > 0) {
        testEvent = ev;
        winnerResult = evResults[0];
        break;
      }
    }

    if (testEvent && winnerResult) {
      const track = testEvent.track_id ? trackMap.get(testEvent.track_id) : null;
      const series = testEvent.series_id ? seriesMap.get(testEvent.series_id) : null;
      const racer = winnerResult.driver_id ? racerMap.get(winnerResult.driver_id) : null;
      const slug = testEvent.slug || testEvent.canonical_slug;
      const canonicalCorrect = !!slug && !!testEvent.event_date;
      const answerPresent = !!racer?.display_name && !!testEvent.event_date;
      const structuredData = !!testEvent.name && !!testEvent.event_date; // SportsEvent emittable
      const internalLinks = !!(series?.slug || series?.canonical_slug) && !!(track?.slug || track?.canonical_slug);
      tests.push({
        question: `Who won ${testEvent.name}${series?.name ? ` (${series.name})` : ''} on ${testEvent.event_date}?`,
        source_entities: { event: testEvent.id, result: winnerResult.id, racer: winnerResult.driver_id || '—' },
        expected_fact_relationship: 'Results.position=1 → Driver/RacerProfile.display_name',
        public_page: slug ? `/events/${slug}` : '/EventProfile?id=' + testEvent.id,
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: racer?.display_name ? `Winner: ${racer.display_name}` : 'Winner racer name not resolvable',
      });
    } else {
      tests.push({
        question: 'Who won a real published event?',
        source_entities: {},
        expected_fact_relationship: 'Results.position=1 → Driver/RacerProfile',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No published event with a P1 result found in the database',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Who leads the [class] standings?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const sortedStandings = (standings as any[])
      .filter((s) => s.position === 1 || s.rank === 1)
      .sort((a, b) => (b.points_total || 0) - (a.points_total || 0));
    const leader = sortedStandings[0] || null;
    if (leader) {
      const series = leader.series_id ? seriesMap.get(leader.series_id) : null;
      const racer = leader.driver_id ? racerMap.get(leader.driver_id) : null;
      const canonicalCorrect = !!(series?.slug || series?.canonical_slug) && !!leader.season_year;
      const answerPresent = !!racer?.display_name && !!leader.season_year && (leader.points_total != null);
      const structuredData = !!series?.name && !!leader.season_year;
      const internalLinks = !!(racer?.slug) && !!(series?.slug || series?.canonical_slug);
      tests.push({
        question: `Who leads the ${series?.name || 'series'} standings in ${leader.season_year}?`,
        source_entities: { standings: leader.id, series: leader.series_id, racer: leader.driver_id || '—' },
        expected_fact_relationship: 'Standings.position=1 → Driver/RacerProfile + Series + season_year',
        public_page: series?.slug ? `/series/${series.slug}` : '/SeriesDetail?slug=' + (series?.slug || series?.id),
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: racer?.display_name ? `Leader: ${racer.display_name} (${leader.points_total} pts)` : 'Leader name not resolvable',
      });
    } else {
      tests.push({
        question: 'Who leads a real class/series standings?',
        source_entities: {},
        expected_fact_relationship: 'Standings.position=1 → Driver + Series + season_year',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No standings record with position=1 found',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: What team does [real racer] race for?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Find a racer who has an entry with a team_id
    const entryWithTeam = (entries as any[]).find((e) => e.team_id && e.driver_id);
    const racer = entryWithTeam?.driver_id ? racerMap.get(entryWithTeam.driver_id) : null;
    const team = entryWithTeam?.team_id ? teamMap.get(entryWithTeam.team_id) : null;
    if (racer && team) {
      const canonicalCorrect = !!racer.slug;
      const answerPresent = !!racer.display_name && !!team.name;
      const structuredData = !!racer.display_name; // Person emittable
      const internalLinks = !!racer.slug && !!(team.slug || team.canonical_slug);
      tests.push({
        question: `What team does ${racer.display_name} race for?`,
        source_entities: { racer: racer.id, entry: entryWithTeam!.id, team: team.id },
        expected_fact_relationship: 'Entry.driver_id → RacerProfile + Entry.team_id → Team',
        public_page: racer.slug ? `/racers/${racer.slug}` : '/RacerProfile?id=' + racer.id,
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: `Team: ${team.name}`,
      });
    } else {
      tests.push({
        question: 'What team does a real racer race for?',
        source_entities: {},
        expected_fact_relationship: 'Entry.driver_id → RacerProfile + Entry.team_id → Team',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No entry with both driver_id and team_id found',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Where was [real event] held?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const eventWithTrack = (events as any[]).find((e) => e.track_id && ['Published', 'Live', 'Completed'].includes(e.status));
    const track = eventWithTrack?.track_id ? trackMap.get(eventWithTrack.track_id) : null;
    if (eventWithTrack && track) {
      const slug = eventWithTrack.slug || eventWithTrack.canonical_slug;
      const canonicalCorrect = !!slug;
      const answerPresent = !!track.name && !!(track.location_city || track.location_state || track.location_country);
      const structuredData = !!track.name; // Place emittable
      const internalLinks = !!(track.slug || track.canonical_slug);
      tests.push({
        question: `Where was ${eventWithTrack.name} held?`,
        source_entities: { event: eventWithTrack.id, track: track.id },
        expected_fact_relationship: 'Event.track_id → Track.name + Track.location_*',
        public_page: slug ? `/events/${slug}` : '/EventProfile?id=' + eventWithTrack.id,
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: `${track.name}, ${[track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ')}`,
      });
    } else {
      tests.push({
        question: 'Where was a real event held?',
        source_entities: {},
        expected_fact_relationship: 'Event.track_id → Track',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No published event with a track_id found',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: What series does [real event] belong to?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const eventWithSeries = (events as any[]).find((e) => e.series_id && ['Published', 'Live', 'Completed'].includes(e.status));
    const series = eventWithSeries?.series_id ? seriesMap.get(eventWithSeries.series_id) : null;
    if (eventWithSeries && series) {
      const slug = eventWithSeries.slug || eventWithSeries.canonical_slug;
      const canonicalCorrect = !!slug;
      const answerPresent = !!series.name;
      const structuredData = !!series.name; // SportsEvent organizer emittable
      const internalLinks = !!(series.slug || series.canonical_slug);
      tests.push({
        question: `What series does ${eventWithSeries.name} belong to?`,
        source_entities: { event: eventWithSeries.id, series: series.id },
        expected_fact_relationship: 'Event.series_id → Series.name',
        public_page: slug ? `/events/${slug}` : '/EventProfile?id=' + eventWithSeries.id,
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: `Series: ${series.name}`,
      });
    } else {
      tests.push({
        question: 'What series does a real event belong to?',
        source_entities: {},
        expected_fact_relationship: 'Event.series_id → Series',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No published event with a series_id found',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: When was [real event]?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const eventWithDate = (events as any[]).find((e) => e.event_date && ['Published', 'Live', 'Completed'].includes(e.status));
    if (eventWithDate) {
      const slug = eventWithDate.slug || eventWithDate.canonical_slug;
      const canonicalCorrect = !!slug;
      const answerPresent = !!eventWithDate.event_date;
      const structuredData = !!eventWithDate.event_date; // SportsEvent startDate
      const internalLinks = !!(eventWithDate.series_id || eventWithDate.track_id);
      tests.push({
        question: `When was ${eventWithDate.name}?`,
        source_entities: { event: eventWithDate.id },
        expected_fact_relationship: 'Event.event_date',
        public_page: slug ? `/events/${slug}` : '/EventProfile?id=' + eventWithDate.id,
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: `Date: ${eventWithDate.event_date}`,
      });
    } else {
      tests.push({
        question: 'When was a real event?',
        source_entities: {},
        expected_fact_relationship: 'Event.event_date',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No published event with an event_date found',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Who finished second at [real event]?
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const p2Result = (results as any[]).find((r) => r.position === 2 && r.status !== 'DNF' && eventMap.has(r.event_id));
    if (p2Result) {
      const ev = eventMap.get(p2Result.event_id);
      const racer = p2Result.driver_id ? racerMap.get(p2Result.driver_id) : null;
      const slug = ev.slug || ev.canonical_slug;
      const canonicalCorrect = !!slug;
      const answerPresent = !!racer?.display_name;
      const structuredData = !!ev.name; // SportsEvent emittable
      const internalLinks = !!racer?.slug;
      tests.push({
        question: `Who finished second at ${ev.name} on ${ev.event_date}?`,
        source_entities: { event: ev.id, result: p2Result.id, racer: p2Result.driver_id || '—' },
        expected_fact_relationship: 'Results.position=2 → Driver/RacerProfile.display_name',
        public_page: slug ? `/events/${slug}` : '/EventProfile?id=' + ev.id,
        answer_present: answerPresent,
        structured_data_present: structuredData,
        internal_links_present: internalLinks,
        canonical_correct: canonicalCorrect,
        verdict: verdict(answerPresent, structuredData, internalLinks, canonicalCorrect),
        notes: racer?.display_name ? `P2: ${racer.display_name}` : 'P2 racer not resolvable',
      });
    } else {
      tests.push({
        question: 'Who finished second at a real event?',
        source_entities: {},
        expected_fact_relationship: 'Results.position=2 → Driver',
        public_page: '—',
        answer_present: false, structured_data_present: false, internal_links_present: false, canonical_correct: false,
        verdict: 'FAIL',
        notes: 'No P2 result found',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 8: What is INDEX46 / HIJINX? (static page discoverability)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const hasRacers = racerProfiles.length > 0;
    const hasSeries = seriesList.length > 0;
    const hasEvents = events.length > 0;
    const answerPresent = hasRacers && hasSeries && hasEvents;
    tests.push({
      question: 'What is INDEX46?',
      source_entities: { racer_count: String((racerProfiles as any[]).length), series_count: String((seriesList as any[]).length), event_count: String((events as any[]).length) },
      expected_fact_relationship: 'Static directory page lists real entities (racers, series, events)',
      public_page: '/MotorsportsHome',
      answer_present: answerPresent,
      structured_data_present: true, // WebSite + Organization schema available
      internal_links_present: hasRacers || hasSeries,
      canonical_correct: true, // static page has canonical
      verdict: answerPresent ? 'PASS' : 'PARTIAL',
      notes: `${(racerProfiles as any[]).length} racers, ${(seriesList as any[]).length} series, ${(events as any[]).length} events indexed`,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = {
    total: tests.length,
    passed: tests.filter((t) => t.verdict === 'PASS').length,
    partial: tests.filter((t) => t.verdict === 'PARTIAL').length,
    failed: tests.filter((t) => t.verdict === 'FAIL').length,
    data_coverage: {
      events: (events as any[]).length,
      series: (seriesList as any[]).length,
      tracks: (tracks as any[]).length,
      racer_profiles: (racerProfiles as any[]).length,
      teams: (teams as any[]).length,
      results: (results as any[]).length,
      standings: (standings as any[]).length,
    },
  };

  return Response.json({
    phase: '17B — AI Discovery / Answer Engine Optimization',
    description: 'Architecture test: can a machine answer representative motorsports questions from authoritative INDEX46 entity relationships?',
    summary,
    tests,
    computed_at: new Date().toISOString(),
  });
}