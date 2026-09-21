/**
 * factTypes.ts — Phase 17C
 *
 * Deterministic Motorsport Fact & Answer Architecture.
 *
 * THE DATA DETERMINES THE ANSWER.
 * AI MAY EXPLAIN THE ANSWER.
 * AI MUST NEVER DETERMINE THE FACT.
 *
 * This module defines the canonical intent taxonomy, fact status model,
 * context dimensions, and required-context rules for every fact type
 * the platform can resolve from authoritative entity relationships.
 *
 * It is a SHARED module — imported by backend functions (resolveMotorsportFact,
 * runFactResolverTests, runAnswerabilityAudit) and potentially by frontend
 * components that need to display fact statuses or intent categories.
 *
 * No facts are stored here. This is a relationship layer, not a database.
 */

// ═══════════════════════════════════════════════════════════════════════════
// INTENT TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════
// Describes FACT TYPES — not natural-language wording.
// A future NL layer maps user wording to these intents; it never invents
// new intents or determines facts.

export type FactIntent =
  | 'RESULT_WINNER'          // Who won [competition]?
  | 'RESULT_POSITION'        // Where did [racer] finish?
  | 'RESULT_LIST'            // What were the results?
  | 'RESULT_PODIUM'           // Who was on the podium?
  | 'STANDINGS_LEADER'       // Who leads [class]?
  | 'STANDINGS_POSITION'     // What position is [racer]?
  | 'STANDINGS_POINTS'       // How many points does [racer] have?
  | 'CHAMPION_SEASON'        // Who won the season championship?
  | 'CHAMPION_SPECIAL_EVENT' // Who won a special-event championship race?
  | 'RACER_PROFILE'          // Who is [racer]?
  | 'RACER_TEAM'             // What team does [racer] race for?
  | 'RACER_NUMBER'           // What number does [racer] run?
  | 'RACER_CLASS'            // What class does [racer] compete in?
  | 'EVENT_DATE'             // When is [event]?
  | 'EVENT_LOCATION'         // Where is [event]?
  | 'EVENT_SERIES'           // What series is [event] part of?
  | 'EVENT_CLASSES'          // What classes compete at [event]?
  | 'EVENT_TRACK'            // What track hosts [event]?
  | 'TEAM_ROSTER'            // Who races for [team]?
  | 'SERIES_EVENTS'          // What events are in [series]?
  | 'SERIES_CLASSES'         // What classes compete in [series]?
  | 'SERIES_CHAMPIONS'       // Who are the champions in [series]?
  | 'TRACK_EVENTS'           // What events happen at [track]?
  | 'TRACK_LOCATION';        // Where is [track]?

export const ALL_INTENTS: FactIntent[] = [
  'RESULT_WINNER', 'RESULT_POSITION', 'RESULT_LIST', 'RESULT_PODIUM',
  'STANDINGS_LEADER', 'STANDINGS_POSITION', 'STANDINGS_POINTS',
  'CHAMPION_SEASON', 'CHAMPION_SPECIAL_EVENT',
  'RACER_PROFILE', 'RACER_TEAM', 'RACER_NUMBER', 'RACER_CLASS',
  'EVENT_DATE', 'EVENT_LOCATION', 'EVENT_SERIES', 'EVENT_CLASSES', 'EVENT_TRACK',
  'TEAM_ROSTER',
  'SERIES_EVENTS', 'SERIES_CLASSES', 'SERIES_CHAMPIONS',
  'TRACK_EVENTS', 'TRACK_LOCATION',
];

// ═══════════════════════════════════════════════════════════════════════════
// FACT STATUS MODEL
// ═══════════════════════════════════════════════════════════════════════════

export type FactStatus =
  | 'RESOLVED'              // Fact determined from authoritative records
  | 'AMBIGUOUS'              // Multiple candidate answers exist — disambiguation required
  | 'INSUFFICIENT_CONTEXT'  // Required context dimensions are missing
  | 'NO_DATA'                // No authoritative records exist to derive the fact
  | 'UNSUPPORTED'           // The platform architecture cannot resolve this intent
  | 'ERROR';                 // Resolver execution failed — distinct from NO_DATA

export const ALL_STATUSES: FactStatus[] = [
  'RESOLVED', 'AMBIGUOUS', 'INSUFFICIENT_CONTEXT', 'NO_DATA', 'UNSUPPORTED', 'ERROR',
];

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT DIMENSIONS
// ═══════════════════════════════════════════════════════════════════════════

export type ContextDimension =
  | 'series'
  | 'season'
  | 'event'
  | 'round'
  | 'class'
  | 'session_type'
  | 'racer'
  | 'team'
  | 'track';

export interface FactContext {
  series?: string;       // series slug or id
  season?: string;       // season year string (e.g. '2026')
  event?: string;       // event slug or id
  round?: number;       // round number
  class?: string;       // class name or SeriesClass slug
  session_type?: string; // Practice | Qualifying | Heat | LCQ | Feature | Final
  racer?: string;       // racer slug or id
  team?: string;       // team slug or id
  track?: string;       // track slug or id
  // Time resolution helpers
  time_filter?: 'current' | 'latest' | 'next' | 'historical';
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUIRED CONTEXT BY INTENT
// ═══════════════════════════════════════════════════════════════════════════
// Defines the minimum context required for each intent.
// If required dimensions are missing → INSUFFICIENT_CONTEXT (not NO_DATA).

export interface ContextRequirement {
  required: ContextDimension[];
  optional: ContextDimension[];
}

export const CONTEXT_REQUIREMENTS: Record<FactIntent, ContextRequirement> = {
  RESULT_WINNER:          { required: ['class'], optional: ['event', 'series', 'season', 'round', 'session_type', 'track'] },
  RESULT_POSITION:       { required: ['racer'], optional: ['event', 'series', 'season', 'class', 'round'] },
  RESULT_LIST:           { required: ['class'], optional: ['event', 'series', 'season', 'round', 'session_type'] },
  RESULT_PODIUM:         { required: ['class'], optional: ['event', 'series', 'season', 'round', 'session_type'] },
  STANDINGS_LEADER:      { required: ['series', 'season', 'class'], optional: ['round'] },
  STANDINGS_POSITION:    { required: ['racer', 'series', 'season'], optional: ['class'] },
  STANDINGS_POINTS:      { required: ['racer', 'series', 'season'], optional: ['class'] },
  CHAMPION_SEASON:       { required: ['series', 'season', 'class'], optional: [] },
  CHAMPION_SPECIAL_EVENT:{ required: ['event', 'class'], optional: ['series', 'season'] },
  RACER_PROFILE:         { required: ['racer'], optional: [] },
  RACER_TEAM:            { required: ['racer'], optional: ['event', 'series', 'season'] },
  RACER_NUMBER:          { required: ['racer'], optional: ['event', 'series', 'season'] },
  RACER_CLASS:           { required: ['racer'], optional: ['series', 'season'] },
  EVENT_DATE:            { required: ['event'], optional: [] },
  EVENT_LOCATION:        { required: ['event'], optional: [] },
  EVENT_SERIES:          { required: ['event'], optional: [] },
  EVENT_CLASSES:         { required: ['event'], optional: [] },
  EVENT_TRACK:           { required: ['event'], optional: [] },
  TEAM_ROSTER:           { required: ['team'], optional: ['series', 'season'] },
  SERIES_EVENTS:         { required: ['series'], optional: ['season'] },
  SERIES_CLASSES:        { required: ['series'], optional: [] },
  SERIES_CHAMPIONS:      { required: ['series'], optional: ['season'] },
  TRACK_EVENTS:          { required: ['track'], optional: ['season'] },
  TRACK_LOCATION:        { required: ['track'], optional: [] },
};

// ═══════════════════════════════════════════════════════════════════════════
// FACT OBJECT SHAPE
// ═══════════════════════════════════════════════════════════════════════════

export interface FactEvidence {
  entity_type: string;   // e.g. 'Results', 'Standings', 'Event'
  entity_id: string;
  field?: string;        // e.g. 'position', 'points_total'
  value?: any;           // e.g. 1, 450
}

export interface FactEntityRef {
  type: string;          // e.g. 'RacerProfile', 'Event', 'Series'
  id: string;
  name: string;          // display name
  slug?: string;         // public slug if available
}

export interface PublicLink {
  label: string;
  url: string;
}

export interface AmbiguityOption {
  label: string;
  context: FactContext;
}

export interface FactResult {
  intent: FactIntent;
  status: FactStatus;
  context: FactContext;
  answer?: any;                    // the resolved factual answer (structured)
  answer_text?: string;           // deterministic sentence
  entities?: FactEntityRef[];     // entities involved in the answer
  evidence?: FactEvidence[];       // provenance chain
  public_links?: PublicLink[];     // public destinations
  ambiguity_options?: AmbiguityOption[]; // present when AMBIGUOUS
  missing_context?: ContextDimension[];  // present when INSUFFICIENT_CONTEXT
  reason?: string;                // human-readable explanation
  unsupported_reason?: string;    // present when UNSUPPORTED
  resolved_at?: string;           // ISO timestamp
}

// ═══════════════════════════════════════════════════════════════════════════
// WINNER SEMANTICS — COMPETITION TYPE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════
// The current schema distinguishes session_type (Practice/Qualifying/Heat/LCQ/Final)
// but does NOT have a championship_designation field to distinguish:
//   - Regular round
//   - World Championship race
//   - Cup race
//   - Special event
//
// This is documented as a REQUIRED RaceCore change. The resolver returns
// UNSUPPORTED for CHAMPION_SPECIAL_EVENT until that field exists.

export const SESSION_TYPES = [
  'Practice', 'Qualifying', 'Heat', 'LCQ', 'Feature', 'Final', 'Time Attack', 'Other',
] as const;

// Sessions that represent actual races (not practice/qualifying)
export const RACE_SESSION_TYPES = ['Heat', 'LCQ', 'Feature', 'Final'];

// Sessions that award championship points (copied from Session.points_type)
export const POINTS_SESSION_TYPES = ['qualifying', 'final'];

// ═══════════════════════════════════════════════════════════════════════════
// FACT OWNERSHIP MATRIX
// ═══════════════════════════════════════════════════════════════════════════
// Documents the authoritative source for every important fact.
// The resolver reads ONLY from these sources — never invents.

export const FACT_OWNERSHIP: Record<string, { entity: string; field: string; relationship?: string }> = {
  'event_date':         { entity: 'Event', field: 'event_date' },
  'event_location':     { entity: 'Event', field: 'track_id', relationship: 'Track' },
  'event_series':       { entity: 'Event', field: 'series_id', relationship: 'Series' },
  'event_track':        { entity: 'Event', field: 'track_id', relationship: 'Track' },
  'event_classes':      { entity: 'EventClass', field: 'class_name', relationship: 'Event' },
  'race_position':      { entity: 'Results', field: 'position' },
  'race_winner':        { entity: 'Results', field: 'position', relationship: 'Entry→RacerProfile' },
  'race_status':        { entity: 'Results', field: 'status' },
  'race_points':        { entity: 'Results', field: 'points' },
  'race_session_type':  { entity: 'Results', field: 'session_type' },
  'standings_position': { entity: 'Standings', field: 'position' },
  'standings_rank':     { entity: 'Standings', field: 'rank' },
  'standings_points':   { entity: 'Standings', field: 'points_total' },
  'standings_leader':   { entity: 'Standings', field: 'position', relationship: 'RacerProfile' },
  'racer_display_name': { entity: 'RacerProfile', field: 'display_name' },
  'racer_slug':         { entity: 'RacerProfile', field: 'slug' },
  'racer_person':       { entity: 'RacerProfile', field: 'person_identity_id', relationship: 'PersonIdentity' },
  'racer_number_event': { entity: 'Entry', field: 'car_number' },
  'racer_number_general':{ entity: 'Driver', field: 'primary_number' },
  'racer_team_event':   { entity: 'Entry', field: 'team_id', relationship: 'Team' },
  'racer_team_general': { entity: 'Driver', field: 'team_id', relationship: 'Team' },
  'track_location':     { entity: 'Track', field: 'location_city' },
  'series_name':        { entity: 'Series', field: 'name' },
  'series_classes':    { entity: 'SeriesClass', field: 'class_name', relationship: 'Series' },
};

// ═══════════════════════════════════════════════════════════════════════════
// FACT PRECEDENCE RULES
// ═══════════════════════════════════════════════════════════════════════════

export const PRECEDENCE_RULES = {
  racer_number: [
    'Event-specific question → Entry.car_number',
    'Season-specific question → SeasonParticipation (no number field currently)',
    'General racer profile → Driver.primary_number (legacy)',
  ],
  racer_team: [
    'Event-specific question → Entry.team_id → Team',
    'General racer profile → Driver.team_id → Team (legacy)',
    'SeasonParticipation has no team_id — team context is event-scoped',
  ],
  standings: [
    'position field = computed rank (may differ from sorted order)',
    'rank field = final rank after tie-breaker sorting',
    'Precedence: rank (if non-null) > position',
    'Cannot distinguish current vs final standings — no is_final flag exists',
  ],
  winner: [
    'Results.position=1 + session_type=Final → race winner',
    'Results.position=1 + session_type=Heat → heat winner',
    'Results.position=1 + session_type=Qualifying → pole winner',
    'Results.position=1 + round_number=X → round X winner',
    'Standings.position=1/rank=1 → points leader (current) or champion (if season final)',
    'NO championship_designation field exists to distinguish special-event winner',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Check required context
// ═══════════════════════════════════════════════════════════════════════════

export function getMissingContext(intent: FactIntent, context: FactContext): ContextDimension[] {
  const req = CONTEXT_REQUIREMENTS[intent];
  if (!req) return [];
  return req.required.filter((dim) => {
    const val = context[dim];
    return val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Intent category for UI grouping
// ═══════════════════════════════════════════════════════════════════════════

export type IntentCategory = 'RESULTS' | 'STANDINGS' | 'CHAMPIONSHIP' | 'RACERS' | 'EVENTS' | 'TEAMS' | 'SERIES' | 'TRACKS';

export function getIntentCategory(intent: FactIntent): IntentCategory {
  switch (intent) {
    case 'RESULT_WINNER':
    case 'RESULT_POSITION':
    case 'RESULT_LIST':
    case 'RESULT_PODIUM':
      return 'RESULTS';
    case 'STANDINGS_LEADER':
    case 'STANDINGS_POSITION':
    case 'STANDINGS_POINTS':
      return 'STANDINGS';
    case 'CHAMPION_SEASON':
    case 'CHAMPION_SPECIAL_EVENT':
      return 'CHAMPIONSHIP';
    case 'RACER_PROFILE':
    case 'RACER_TEAM':
    case 'RACER_NUMBER':
    case 'RACER_CLASS':
      return 'RACERS';
    case 'EVENT_DATE':
    case 'EVENT_LOCATION':
    case 'EVENT_SERIES':
    case 'EVENT_CLASSES':
    case 'EVENT_TRACK':
      return 'EVENTS';
    case 'TEAM_ROSTER':
      return 'TEAMS';
    case 'SERIES_EVENTS':
    case 'SERIES_CLASSES':
    case 'SERIES_CHAMPIONS':
      return 'SERIES';
    case 'TRACK_EVENTS':
    case 'TRACK_LOCATION':
      return 'TRACKS';
  }
}