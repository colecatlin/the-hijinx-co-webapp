/**
 * runFactResolverTests — Phase 17C
 *
 * Representative test suite for the Deterministic Motorsport Fact Resolver.
 *
 * Runs a set of representative queries against resolveMotorsportFact and
 * reports whether each resolved to:
 *   RESOLVED, AMBIGUOUS, INSUFFICIENT_CONTEXT, NO_DATA, UNSUPPORTED, ERROR
 *
 * Does NOT fabricate records to make tests pass.
 * Does NOT use an LLM.
 *
 * The test suite is read-only — no writes to any entity.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { type FactIntent, type FactContext, ALL_INTENTS, getIntentCategory } from '../../shared/factTypes.ts';

interface FactTestCase {
  label: string;
  intent: FactIntent;
  context: FactContext;
  expected_status_hint?: string; // 'RESOLVED' | 'NO_DATA' | 'AMBIGUOUS' | etc — just a hint, not enforced
  category?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════

const TEST_CASES: FactTestCase[] = [
  // ── RESULTS ──────────────────────────────────────────────────────────────
  {
    label: 'Who won Pro 4 at Crandon?',
    intent: 'RESULT_WINNER',
    context: { class: 'Pro 4', track: 'crandon' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'Who won Round 13 Pro 4?',
    intent: 'RESULT_WINNER',
    context: { class: 'Pro 4', round: 13 },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'Who finished second in Pro 2?',
    intent: 'RESULT_POSITION',
    context: { class: 'Pro 2' },
    expected_status_hint: 'INSUFFICIENT_CONTEXT',
  },
  {
    label: 'What were the Pro Lite results?',
    intent: 'RESULT_LIST',
    context: { class: 'Pro Lite' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'Who was on the podium in Pro Spec?',
    intent: 'RESULT_PODIUM',
    context: { class: 'Pro Spec' },
    expected_status_hint: 'NO_DATA',
  },

  // ── STANDINGS ─────────────────────────────────────────────────────────────
  {
    label: 'Who leads Pro Spec?',
    intent: 'STANDINGS_LEADER',
    context: { series: 'champ-off-road', season: '2026', class: 'Pro Spec' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'How many points does a racer have?',
    intent: 'STANDINGS_POINTS',
    context: { racer: 'test-racer', series: 'champ-off-road', season: '2026' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What position is a racer in the standings?',
    intent: 'STANDINGS_POSITION',
    context: { racer: 'test-racer', series: 'champ-off-road', season: '2026' },
    expected_status_hint: 'NO_DATA',
  },

  // ── CHAMPIONSHIP ──────────────────────────────────────────────────────────
  {
    label: 'Who won the Pro 4 championship?',
    intent: 'CHAMPION_SEASON',
    context: { series: 'champ-off-road', season: '2026', class: 'Pro 4' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'Who won the Pro 4 World Championship race?',
    intent: 'CHAMPION_SPECIAL_EVENT',
    context: { event: 'crandon-world-championship', class: 'Pro 4' },
    expected_status_hint: 'UNSUPPORTED',
  },

  // ── RACERS ────────────────────────────────────────────────────────────────
  {
    label: 'Who is [racer]?',
    intent: 'RACER_PROFILE',
    context: { racer: 'test-racer' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What team does [racer] race for?',
    intent: 'RACER_TEAM',
    context: { racer: 'test-racer' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What number does [racer] run?',
    intent: 'RACER_NUMBER',
    context: { racer: 'test-racer' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What class does [racer] compete in?',
    intent: 'RACER_CLASS',
    context: { racer: 'test-racer' },
    expected_status_hint: 'NO_DATA',
  },

  // ── EVENTS ────────────────────────────────────────────────────────────────
  {
    label: 'When is the next Champ Off-Road race?',
    intent: 'EVENT_DATE',
    context: { event: 'champ-off-road-next' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'Where is Crandon?',
    intent: 'TRACK_LOCATION',
    context: { track: 'crandon' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What track hosts [event]?',
    intent: 'EVENT_TRACK',
    context: { event: 'test-event' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What series is [event] part of?',
    intent: 'EVENT_SERIES',
    context: { event: 'test-event' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What classes compete at [event]?',
    intent: 'EVENT_CLASSES',
    context: { event: 'test-event' },
    expected_status_hint: 'NO_DATA',
  },

  // ── TEAMS ────────────────────────────────────────────────────────────────
  {
    label: 'Who races for [team]?',
    intent: 'TEAM_ROSTER',
    context: { team: 'test-team' },
    expected_status_hint: 'NO_DATA',
  },

  // ── SERIES ────────────────────────────────────────────────────────────────
  {
    label: 'What events are in Champ Off-Road?',
    intent: 'SERIES_EVENTS',
    context: { series: 'champ-off-road' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'What classes compete in Champ Off-Road?',
    intent: 'SERIES_CLASSES',
    context: { series: 'champ-off-road' },
    expected_status_hint: 'NO_DATA',
  },
  {
    label: 'Who are the champions in Champ Off-Road?',
    intent: 'SERIES_CHAMPIONS',
    context: { series: 'champ-off-road' },
    expected_status_hint: 'NO_DATA',
  },

  // ── TRACKS ────────────────────────────────────────────────────────────────
  {
    label: 'What events happen at Crandon?',
    intent: 'TRACK_EVENTS',
    context: { track: 'crandon' },
    expected_status_hint: 'NO_DATA',
  },

  // ── INSUFFICIENT CONTEXT TESTS ─────────────────────────────────────────────
  {
    label: 'Who won? (no class specified)',
    intent: 'RESULT_WINNER',
    context: {},
    expected_status_hint: 'INSUFFICIENT_CONTEXT',
  },
  {
    label: 'Who leads the standings? (no series/season)',
    intent: 'STANDINGS_LEADER',
    context: { class: 'Pro 4' },
    expected_status_hint: 'INSUFFICIENT_CONTEXT',
  },
  {
    label: 'Where did [racer] finish? (no racer)',
    intent: 'RESULT_POSITION',
    context: { class: 'Pro 4' },
    expected_status_hint: 'INSUFFICIENT_CONTEXT',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════════════════

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const results: any[] = [];

  for (const tc of TEST_CASES) {
    try {
      const res = await base44.asServiceRole.functions.invoke('resolveMotorsportFact', {
        intent: tc.intent,
        context: tc.context,
      });

      const factResult = res?.data || res;
      const status = factResult?.status || 'ERROR';
      const answerText = factResult?.answer_text || null;
      const hintMatch = tc.expected_status_hint === status;

      results.push({
        label: tc.label,
        intent: tc.intent,
        category: getIntentCategory(tc.intent),
        context: tc.context,
        status,
        expected_hint: tc.expected_status_hint,
        hint_match: hintMatch,
        answer_text: answerText,
        reason: factResult?.reason || factResult?.unsupported_reason || undefined,
        missing_context: factResult?.missing_context || undefined,
        ambiguity_options: factResult?.ambiguity_options || undefined,
        evidence_count: factResult?.evidence?.length || 0,
        entities_count: factResult?.entities?.length || 0,
      });
    } catch (err: any) {
      results.push({
        label: tc.label,
        intent: tc.intent,
        category: getIntentCategory(tc.intent),
        context: tc.context,
        status: 'ERROR',
        expected_hint: tc.expected_status_hint,
        hint_match: false,
        reason: err?.message || 'Invocation failed',
      });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const summary = {
    total: results.length,
    resolved: results.filter((r) => r.status === 'RESOLVED').length,
    ambiguous: results.filter((r) => r.status === 'AMBIGUOUS').length,
    insufficient_context: results.filter((r) => r.status === 'INSUFFICIENT_CONTEXT').length,
    no_data: results.filter((r) => r.status === 'NO_DATA').length,
    unsupported: results.filter((r) => r.status === 'UNSUPPORTED').length,
    error: results.filter((r) => r.status === 'ERROR').length,
    hint_matches: results.filter((r) => r.hint_match).length,
    by_category: {
      RESULTS: results.filter((r) => r.category === 'RESULTS').length,
      STANDINGS: results.filter((r) => r.category === 'STANDINGS').length,
      CHAMPIONSHIP: results.filter((r) => r.category === 'CHAMPIONSHIP').length,
      RACERS: results.filter((r) => r.category === 'RACERS').length,
      EVENTS: results.filter((r) => r.category === 'EVENTS').length,
      TEAMS: results.filter((r) => r.category === 'TEAMS').length,
      SERIES: results.filter((r) => r.category === 'SERIES').length,
      TRACKS: results.filter((r) => r.category === 'TRACKS').length,
    },
  };

  return Response.json({
    phase: '17C — Motorsport Fact & Answer Architecture',
    description: 'Representative test suite for the deterministic fact resolver. No fabricated data — tests report RESOLVED, AMBIGUOUS, INSUFFICIENT_CONTEXT, NO_DATA, UNSUPPORTED, or ERROR.',
    summary,
    results,
    computed_at: new Date().toISOString(),
  });
}