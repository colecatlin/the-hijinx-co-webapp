# Phase 13: Event Platform — Implementation Report

## Objective
Unify the race-weekend public experience around a canonical Event profile at `/events/:slug`, aggregating schedule, entries, classes, results, standings impact, venue info, media, and timeline into a single read-only payload served by a dedicated backend function.

## Architecture

### Canonical Routing
- **Route:** `/events/:slug` → `EventProfileRouteWrapper` → `EventProfile`
- **Slug resolution:** `EventProfileRouteWrapper` resolves slug → Event entity, falls back to legacy `/EventProfile?id=` query param for backward compatibility.
- **Legacy preservation:** All existing `/EventProfile?id=` links continue to work (wrapper handles both slug and id resolution).
- **Global search:** Updated `src/Layout.jsx` to link events to `/events/:slug` when a slug exists, falling back to `/EventProfile?id=` for slugless events.
- **Backfill:** 8 existing events backfilled with `slug = canonical_slug` so all current events resolve via the canonical route.

### Backend Functions
1. **`getEventExperience`** (read-only aggregator)
   - Input: `{ event_id }`
   - Returns a single composite payload: event, series, track, schedule (grouped by EventDay with nested sessions), event classes, entry list (with driver/team/vehicle lookups), results (grouped by session), standings impact, timeline, media, and venue/spectator info.
   - Uses `base44/shared/eventExperienceHelpers.ts` for all computation logic (shared with the audit function).
   - Respects public visibility: only returns data for events with `published_flag === true` or `public_status` in `['published','live','completed']`.

2. **`auditEventExperience`** (read-only health check)
   - Input: `{ event_id }`
   - Returns `{ is_public, is_complete, total_issues, error_count, warning_count, info_count, counts, issues[] }`.
   - Categories: `broken_session` (orphaned EventClass refs), `broken_standings`, `broken_media`, `broken_sponsor`, `missing_ticket_url`, `missing_broadcast_url`, `broken_seo`.
   - Severity levels: `error` (blocking), `warning` (should fix), `info` (nice-to-have).

### Shared Logic
- **`base44/shared/eventExperienceHelpers.ts`** — single source of truth for event experience computation, imported by both `getEventExperience` and `auditEventExperience`. Avoids logic duplication and ensures audit checks match what the experience function actually returns.

### Frontend Components (all under `src/components/events/`)
- `EventOverview` — hero summary, dates, series/track links, description, CTAs.
- `EventScheduleView` — day-grouped session schedule with session type, status, times.
- `EventEntryList` — registered entries with car number, driver, team, vehicle, entry status.
- `EventClassesGrid` — competing classes with entry counts.
- `EventResultsView` — session-grouped results with positions, status, points.
- `EventStandingsImpact` — series/class standings snapshot affected by this event.
- `EventTimeline` — chronological event-day/session timeline.
- `EventVenueInfo` — track details, location, map, spectator info.
- `EventMediaSection` — cover image, logo, gallery, promo video.
- `EventRacerCard` — reusable racer summary card used across sections.

### Page Integration
- **`src/pages/EventProfile.jsx`** — refactored to fetch via `getEventExperience` and compose the new section components. Handles loading, not-found, and unpublished states.
- **`src/pages/EventProfileRouteWrapper.jsx`** — slug → id resolver wrapping `EventProfile`.

## Verification
- `getEventExperience` tested against "Dirt City Off-Road National" (69 sessions, 6 entries): returned 132KB composite payload in 515ms. ✅
- `auditEventExperience` tested against same event: 0 errors, 2 warnings (orphaned EventClass refs, missing SEO description), 5 info items. ✅
- Slug backfill: 8 events now have `slug` populated. ✅
- Route registered in `src/App.jsx` alongside existing routes. ✅
- Global search updated to prefer canonical `/events/:slug` links. ✅

## Backward Compatibility
- Legacy `/EventProfile?id=<event_id>` links continue to resolve via the wrapper.
- No existing Event entity fields were removed; only `slug`, `description`, `ticket_url`, `broadcast_url`, `registration_url`, `event_notes`, `spectator_info`, and `weather_info` were added (Phase 13 schema extension).
- RaceCore operational workflows (`/racecore/event-files/:eventId`) are untouched — Phase 13 is purely the public-facing read layer.

## Files Created
- `base44/shared/eventExperienceHelpers.ts`
- `base44/functions/getEventExperience/entry.ts`
- `base44/functions/auditEventExperience/entry.ts`
- `src/components/events/EventOverview.jsx`
- `src/components/events/EventScheduleView.jsx`
- `src/components/events/EventEntryList.jsx`
- `src/components/events/EventClassesGrid.jsx`
- `src/components/events/EventResultsView.jsx`
- `src/components/events/EventStandingsImpact.jsx`
- `src/components/events/EventTimeline.jsx`
- `src/components/events/EventVenueInfo.jsx`
- `src/components/events/EventMediaSection.jsx`
- `src/components/events/EventRacerCard.jsx`
- `src/pages/EventProfileRouteWrapper.jsx`
- `src/PHASE_13_EVENT_PLATFORM_REPORT.md`

## Files Modified
- `base44/entities/Event.jsonc` — added Phase 13 public-profile fields.
- `src/pages/EventProfile.jsx` — integrated new section components and backend data fetching.
- `src/App.jsx` — added `/events/:slug` route.
- `src/Layout.jsx` — global search now links events to canonical `/events/:slug`.

## Open Items
- Regression testing of RaceCore operational workflows (no code changes, but verify no routing conflicts).
- Populate `description`, `ticket_url`, `broadcast_url`, `spectator_info` on events to clear audit warnings.
- Repair 5 sessions with orphaned EventClass references (operational data fix, not a Phase 13 code issue).