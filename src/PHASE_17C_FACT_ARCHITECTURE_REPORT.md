# Phase 17C — Motorsport Fact & Answer Architecture

## Overview

Phase 17C establishes a **deterministic Factual Knowledge Layer** for INDEX46 where data determines the answer and AI never fabricates facts. Fact-resolution is derived from authoritative entity relationships, not a duplicate fact database.

## Core Principle

> **Facts are derived from authoritative entity relationships. The AI never generates facts — it only reads them.**

Every fact answer is:
1. **Deterministic** — the same query always produces the same answer from the same data
2. **Traceable** — every answer includes evidence (entity, field, value) and provenance
3. **Statused** — RESOLVED, AMBIGUOUS, INSUFFICIENT_CONTEXT, NO_DATA, UNSUPPORTED, or ERROR
4. **Sentence-built** — deterministic sentence builders produce consistent natural language

## Architecture Components

### 1. Fact Type Taxonomy (`base44/shared/factTypes.ts`)
- 25 intents across 8 categories: RESULTS, STANDINGS, CHAMPIONSHIP, RACERS, EVENTS, TEAMS, SERIES, TRACKS
- 6 fact statuses with clear semantics
- Intent → required context mapping

### 2. Deterministic Sentence Builders (`base44/shared/factSentenceBuilders.ts`)
- Pure functions that convert resolved data into natural language
- No LLM involvement — sentences are template-driven
- Consistent phrasing across all consumers

### 3. Fact Resolver (`base44/functions/resolveMotorsportFact/entry.ts`)
- HTTP handler that resolves a single fact from authoritative entities
- Returns: intent, status, context, answer, entities, evidence, public_links, answer_text
- Enforces required-context validation before querying
- Returns UNSUPPORTED for fact types requiring non-existent schema fields

### 4. Test Suite (`base44/functions/runFactResolverTests/entry.ts`)
- 27 representative test cases across all categories
- No fabricated data — tests report actual status from real database state
- Validates that the resolver never crashes and always returns a valid status

## Fact Ownership & Precedence Rules

The fact resolver traverses an authoritative entity chain. Precedence is deterministic:

### Entity Chain (highest → lowest authority)

```
Series (governing body)
  └── SeriesClass (class definition within a series)
       └── Event (competition instance)
            └── EventClass (class running at an event)
                 └── Session (race session within an event)
                      └── Results (finishing positions)
                           └── Entry (driver/vehicle entry)
                                └── RacerProfile (driver identity)
                                     └── PersonIdentity (real person)
```

### Precedence Rules

1. **Class identity**: `SeriesClass.class_name` is canonical. `EventClass` references it. Results resolve class via `EventClass → SeriesClass` chain.
2. **Event identity**: `Event.slug` is the public canonical identifier. `Event.name` is display only.
3. **Track identity**: `Track.slug` is canonical. Track location uses `location_city + location_state + location_country`.
4. **Series identity**: `Series.slug` is canonical. Series classes come from `SeriesClass` records filtered by `series_id`.
5. **Racer identity**: `RacerProfile.slug` is canonical. `PersonIdentity` is the real-person layer; `RacerProfile` is the public racing identity.
6. **Result identity**: `Results.position = 1` defines the winner. Results are scoped by `session_id → EventClass → Event` and `class_name`.
7. **Standings identity**: `Standings` records are scoped by `series_id + season_year + class_name`. Position 1 = championship leader.

### Ambiguity Rules

- **Winner semantics**: "Who won [Event]?" is AMBIGUOUS unless a `class` is specified — an Event runs multiple classes, each with its own winner. The resolver requires `class` context for RESULT_WINNER.
- **Championship designation**: "Is [Event] a championship round?" is UNSUPPORTED — no `championship_designation` field exists on Event or Session. This is a required RaceCore schema addition (see below).
- **Season scoping**: Standings queries require `season` context to avoid cross-year ambiguity.

## Required RaceCore Schema Additions (Non-Breaking)

These additions are **required** to unlock unsupported fact types. They are additive (optional fields) and do not break existing behavior.

### 1. `championship_designation` on Event (REQUIRED for CHAMPION_SPECIAL_EVENT)

```jsonc
// base44/entities/Event.jsonc — add to properties:
"championship_designation": {
  "type": "string",
  "enum": ["regular_round", "special_event", "championship_round", "season_finale", "all_star"],
  "default": "regular_round",
  "description": "Determines whether this event is a regular round, special event, championship round, season finale, or all-star event. Drives CHAMPION_SPECIAL_EVENT fact resolution."
}
```

**Why**: Currently the resolver cannot distinguish a championship round from a regular round. This field makes the fact deterministic.

### 2. `championship_round_number` on Event (OPTIONAL — for round-scoped queries)

```jsonc
"championship_round_number": {
  "type": "number",
  "description": "If this event is a championship round, which round number (1-N). Null for non-championship events."
}
```

### 3. `is_points_round` on Event (OPTIONAL — for standings impact)

```jsonc
"is_points_round": {
  "type": "boolean",
  "default": true,
  "description": "Whether this event awards championship points. Non-points events (exhibition, all-star) do not affect standings."
}
```

These fields are **additive** — existing code that doesn't reference them continues to work unchanged. The fact resolver will return UNSUPPORTED until they exist, then RESOLVED once populated.

## Test Results (Initial Run)

```
Total: 27 tests
  RESOLVED: 2 (SERIES_CLASSES, TRACK_LOCATION — real data exists)
  AMBIGUOUS: 0
  INSUFFICIENT_CONTEXT: 4 (missing required class/racer/season)
  NO_DATA: 20 (no published results/standings in database yet)
  UNSUPPORTED: 1 (CHAMPION_SPECIAL_EVENT — missing championship_designation)
  ERROR: 0
  Hint matches: 25/27 (2 resolved against NO_DATA hints — real data found)
```

### Key Findings

1. **Resolver is stable** — 0 errors across 27 tests. No crashes.
2. **Context validation works** — INSUFFICIENT_CONTEXT correctly fires when `class` or `racer` is missing.
3. **Real data resolves** — SERIES_CLASSES returns 19 classes for Championship Off-Road; TRACK_LOCATION returns "Crandon, WI, United States" with a public link.
4. **No fabricated facts** — NO_DATA is returned honestly when no published results exist. The resolver never invents a winner.
5. **One unsupported fact type** — CHAMPION_SPECIAL_EVENT requires the `championship_designation` schema addition.

## Integration Points

### AI Discovery Management (`/management/website/ai-discovery`)
- Fact Architecture card in Overview tab
- Shows supported/unsupported intent counts
- "Run Fact Tests" button invokes the test suite
- Displays test summary and unsupported fact types

### Answerability Audit (`runAnswerabilityAudit`)
- The fact resolver is a peer to the answerability audit
- The audit checks whether public pages CAN answer questions
- The fact resolver checks whether the DATA CAN answer questions
- Together they provide complete answerability coverage

## Future Phases

- **Phase 17D**: Add `championship_designation` to Event schema, populate for existing events, re-run tests
- **Phase 17E**: Integrate fact resolver into public profile pages as "Factual Summary" sections
- **Phase 17F**: Expose fact resolver via App MCP for AI client consumption