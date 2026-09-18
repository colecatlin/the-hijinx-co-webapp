# Phase 17B.2 — AI Discovery: Public Machine-Readable Layer — Final Report

## 1. Existing JSON-LD Audit

| Location | Type | Status |
|----------|------|--------|
| `getRacerProfileExperience/entry.ts` | Person (inline) | REPLACED with shared helper |
| `getEventExperience/entry.ts` | SportsEvent (inline) | REPLACED with shared helper |
| `getSeriesExperience/entry.ts` | SportsOrganization (inline) | REPLACED with shared helper |
| `getTrackExperience/entry.ts` | SportsVenue (inline) | REPLACED with shared helper |
| `RacerProfile.jsx` | Script tag injection | REPLACED with `<JsonLd>` component |
| `EventProfile.jsx` | Script tag injection | REPLACED with `<JsonLd>` component |
| `SeriesDetail.jsx` | Script tag injection | REPLACED with `<JsonLd>` component |
| `TrackProfile.jsx` | **Missing** | ADDED `<JsonLd>` component |
| `OutletStoryPage.jsx` | **Missing** | ADDED `<JsonLd>` with NewsArticle + Breadcrumb |
| `Home.jsx` | **Missing** | ADDED WebSite + Organization |
| `getTeamExperience` | No SEO object | NOT TESTED (no data) — deferred |
| `getVehicleExperience` | No SEO object | NOT TESTED (no data) — deferred |
| `SeoMeta.jsx` | Meta tags only (no JSON-LD) | UNCHANGED — correct, no duplication |

## 2. Duplicate Structured-Data Implementations Found

**Eliminated:** All four experience functions (Racer, Event, Series, Track) previously built JSON-LD inline with hardcoded `https://hijinxco.com` canonical base. Now all use `base44/shared/structuredDataHelpers.ts` — one authoritative source.

**Fixed:** `https://hijinxco.com` → `https://hijinx.com` (via shared helper fallback matching `seoDefaults.ts`).

**Fixed:** Relative URLs (`/racers/${slug}`) → absolute URLs (`https://hijinx.com/racers/${slug}`).

## 3. Files Created

| File | Purpose |
|------|---------|
| `src/components/shared/JsonLd.jsx` | Shared renderer for one or more JSON-LD `<script>` tags (object or array) |
| `src/components/shared/EntityFactualSummary.jsx` | Conditional direct-answer HTML summary sentences for entity pages |

## 4. Files Modified

| File | Change |
|------|--------|
| `base44/shared/structuredDataHelpers.ts` | (Created prior turn) Centralized Schema.org builders |
| `base44/functions/getRacerProfileExperience/entry.ts` | Replaced inline Person with `buildPersonSchema` + `buildBreadcrumbSchema` |
| `base44/functions/getEventExperience/entry.ts` | Replaced inline SportsEvent with `buildSportsEventSchema` + breadcrumb |
| `base44/functions/getSeriesExperience/entry.ts` | Replaced inline SportsOrganization with `buildSeriesSchema` + breadcrumb |
| `base44/functions/getTrackExperience/entry.ts` | Replaced inline SportsVenue with `buildTrackSchema` + breadcrumb |
| `base44/functions/runAnswerabilityAudit/entry.ts` | V2: enrichment tests + failure-type classification |
| `src/pages/RacerProfile.jsx` | JsonLd + EntityFactualSummary |
| `src/pages/EventProfile.jsx` | JsonLd + EntityFactualSummary |
| `src/pages/SeriesDetail.jsx` | JsonLd + EntityFactualSummary |
| `src/pages/TrackProfile.jsx` | JsonLd + EntityFactualSummary (was missing JSON-LD) |
| `src/pages/OutletStoryPage.jsx` | JsonLd with NewsArticle + Breadcrumb (was missing JSON-LD) |
| `src/pages/Home.jsx` | WebSite + Organization JSON-LD (was missing) |

## 5. Canonical Utility Behavior

`buildCanonicalUrl(canonicalBase, path)` in `structuredDataHelpers.ts`:
- Fallback: `https://hijinx.com` (matches `seoDefaults.ts` `canonical_base_url`)
- Always produces absolute URLs
- Rejects null/empty paths (returns null)
- Never includes preview domains, localhost, or query strings

All four experience functions pass `null` for canonicalBase, using the fallback. This is intentional — the spec says "Do NOT add additional public entity queries merely to produce JSON-LD." A future enhancement can wire SeoSettings canonical_base_url through.

## 6. Homepage WebSite JSON-LD

`Home.jsx` now emits:
```json
{
  "@type": "WebSite",
  "name": "HIJINX",
  "url": "https://hijinx.com",
  "potentialAction": { "@type": "SearchAction", "target": ".../Directory?q={search_term_string}" }
}
```

## 7. Homepage Organization JSON-LD

`Home.jsx` now emits:
```json
{
  "@type": "Organization",
  "name": "HIJINX",
  "url": "https://hijinx.com",
  "logo": "<fallback image URL>"
}
```

No fabricated social accounts, founding dates, or addresses. Only known platform identity.

## 8. Racer Person Implementation

`buildPersonSchema(racer, canonicalBase)` emits: name, description, image, jobTitle, knowsAbout, birthPlace (only if hometown exists), url (absolute), sameAs (only real social URLs).

**Status: CODE-VERIFIED.** 0 racer profiles in this environment — NOT TESTED with real records.

## 9. Team SportsOrganization Implementation

`buildTeamSchema(team, canonicalBase)` exists in shared helpers. `getTeamExperience` does not currently emit `seo.structured_data` — wiring is deferred (no team data to test).

**Status: CODE-VERIFIED (helper exists), NOT WIRED (no data).**

## 10. Series SportsOrganization Implementation

`buildSeriesSchema` emits: name, alternateName, description, sport, url (absolute), logo, image, sameAs. Verified with real record "Championship Off-Road" — PASS.

## 11. Track Place Implementation

`buildTrackSchema` emits: name, description, url (absolute), image, address (only if components exist), geo (only if lat+lng exist), hasMap. Verified with real record "Glen Helen Raceway" — PASS.

## 12. Event SportsEvent Implementation

`buildSportsEventSchema` emits: name, startDate, endDate, description, eventStatus, image, url (absolute), location (Place + address + geo), organizer (SportsOrganization), offers, broadcastUrl. Verified with real record "Glen Helen Off-Road National" — PASS.

## 13. Outlet NewsArticle Implementation

`OutletStoryPage.jsx` now emits NewsArticle JSON-LD inline (story data is already loaded on the page — no extra query). Properties: headline, description, datePublished, dateModified, image, url (absolute), author (only if exists), articleSection, keywords, publisher. Plus BreadcrumbList.

## 14. BreadcrumbList Implementation

Added to all four main entity experience functions + OutletStoryPage:
- Racer: INDEX46 → Racers → [Name]
- Event: INDEX46 → Events → [Name]
- Series: INDEX46 → Series → [Name]
- Track: INDEX46 → Tracks → [Name]
- Outlet: The Outlet → [Story Title]

All URLs are absolute canonical. No legacy aliases exposed.

## 15. Results ItemList Implementation

`buildResultListSchema` exists in shared helpers. NOT WIRED — 0 results in this environment. The helper requires authoritative position data (never infers ordering from created_date or alphabetical). **CODE-VERIFIED only.**

## 16. Standings ItemList Implementation

Same as Results — helper exists, NOT WIRED. 0 standings in environment. **CODE-VERIFIED only.**

## 17. Direct-Answer Summaries Implemented

`EntityFactualSummary` component renders conditional factual sentences:
- **Racer**: "[Name] competes in [Discipline] for [Team] in [Series]." — omits missing clauses
- **Event**: "[Name] is a [Series] event held at [Track] on [Date]."
- **Series**: "[Name] is a [Discipline] racing series sanctioned by [Body]. [Season] season."
- **Track**: "[Name] is a [Type] track with [Surface] surface located in [Location]."
- **Team**: "[Name] is a [Discipline] racing team."

All degrade gracefully — no "undefined" leaks. Rendered as visible `<p>` with `user-select: text`.

## 18. Winner Semantics Audit

**REPORT (no RaceCore modification):** The platform currently identifies winners through:
- **Race winner**: `Results.position === 1` (single session result)
- **Class winner**: Highest position in a class's feature/final session
- **Event winner**: Not explicitly stored — derived from feature session results
- **Championship leader**: `Standings.position === 1` in a current/active season
- **Championship winner**: `Standings.position === 1` in a completed (non-current) season — distinguished in `buildChampions()` via `getCurrentSeasonYear()` check

**Missing RaceCore distinction:** The platform does not currently distinguish:
- **Round winner** vs **event winner** (no explicit round_winner field)
- **World championship winner** vs **cup winner** (no championship_type field)

These are RaceCore architecture gaps. **Recommended future RaceCore work:** Add `championship_type` enum to Series/PointsConfig and `round_winner_id` to Event/Session. **Affected question types:** "Who won the [round] at [event]?" and "Who is the [series] world champion?" **Affected public pages:** Event profile, Series champions tab.

## 19. Season-Context Audit

- **Series pages**: `selected_season` / `current_season` exposed in experience payload + visible in season selector UI
- **Event pages**: `event.season` exposed in structured data `startDate` context and visible in hero
- **Standings**: `season_year` field present in Standings entity — exposed in `buildStandingEntry`
- **URLs**: Season is NOT in the URL (e.g., `/series/champ-off-road` not `/series/champ-off-road/2026`). Per spec, routes are NOT redesigned. Season context is visible in page title, H1, and structured data.

**No confusion risk:** 2025 vs 2026 standings are distinguishable via the season selector and `season_year` field in structured data.

## 20. Results Semantic HTML Audit

Results renderers (e.g., `EventResultsView`, `ResultsPanel`) currently use div-based responsive layouts. The spec says "Do not redesign the UI." Semantic `<table>` markup could be introduced without visual change via CSS, but this is a larger refactor. **Deferred** — current JSON-LD ItemList helper is ready for when results data exists.

## 21. Standings Semantic HTML Audit

Same as Results — `SeriesStandings` uses div-based layout. Semantic table refactor deferred.

## 22. Internal-Linking Audit

- **Event → Series**: Linked (series profile_url in experience payload)
- **Event → Track**: Linked (track profile_url in experience payload)
- **Racer → Team**: Linked (team_history with team_slug)
- **Racer → Series**: Linked (statistics.by_series with series_name)
- **Series → Events**: Linked (schedule with profile_url)
- **Series → Standings**: Linked (standings tab)
- **Outlet → entities**: Only explicit structured references (driver_id, event_id) — NOT keyword-linked. ✓ Correct per spec.

## 23. Crawlable HTML Audit

Core factual relationships (event name, date, track, series; racer name, discipline, team; series name, discipline, season) are rendered as textual HTML in the DOM — not canvas, images, PDFs, or chart geometry. The `EntityFactualSummary` component adds explicit textual sentences. ✓ PASS.

## 24. llms.txt Audit Result

**Researched** llmstxt.org convention. llms.txt is a proposed Markdown file at `/llms.txt` providing an LLM-readable site overview. It is NOT an official standard — adoption is growing primarily among documentation sites (Mintlify, GitBook).

**Assessment for HIJINX:**
- The platform is NOT a documentation site — it's a dynamic entity-driven motorsports platform
- The machine-readable layer is already well-served by comprehensive JSON-LD + sitemap.xml
- llms.txt would be a static, manually-maintained file duplicating information available through structured data
- Evidence for meaningful benefit over existing JSON-LD is insufficient

**Decision: DEFER implementation.** If adopted later, proposed structure:
```
# HIJINX
Motorsports, culture, and competition platform.

## INDEX46
Motorsports directory — racers, teams, tracks, series, events.
https://hijinx.com/MotorsportsHome

## The Outlet
Short course off-road media and editorial.
https://hijinx.com/OutletHome

## Directory
https://hijinx.com/Directory
```

## 25. Answerability Audit V2 Changes

Extended `runAnswerabilityAudit` with:
- 3 enrichment tests that invoke experience functions and verify: structured-data @type, absolute canonical URL, BreadcrumbList presence, season context
- `failure_type` classification: `DATA_COVERAGE` | `PUBLIC_PRESENTATION` | `STRUCTURED_DATA` | `LINKING` | `NONE`
- New fields: `absolute_canonical`, `breadcrumb_present`, `season_context`, `failure_type`

**Current result: 11 tests, 5 PASS, 2 PARTIAL, 4 FAIL**
- Failure types: 4 DATA_COVERAGE, 1 PUBLIC_PRESENTATION, 0 STRUCTURED_DATA, 0 LINKING
- The 3 enrichment tests (Event, Series, Track structured-data quality) all PASS

## 26. Real Records Tested

| Category | Records | Tested |
|----------|---------|--------|
| Events | 8 | ✓ (Glen Helen Off-Road National) |
| Series | 16 | ✓ (Championship Off-Road) |
| Tracks | 7 | ✓ (Glen Helen Raceway) |
| Racer Profiles | 0 | NOT TESTED — NO REAL RECORDS |
| Teams | 0 | NOT TESTED — NO REAL RECORDS |
| Results | 0 | NOT TESTED — NO REAL RECORDS |
| Standings | 0 | NOT TESTED — NO REAL RECORDS |
| Entries | 0 | NOT TESTED — NO REAL RECORDS |

## 27. Categories Not Tested (Absent Data)

- Racer Profiles (0) — Person schema CODE-VERIFIED only
- Teams (0) — SportsOrganization schema CODE-VERIFIED only
- Results (0) — ItemList schema CODE-VERIFIED only
- Standings (0) — ItemList schema CODE-VERIFIED only
- Entries (0) — team/racer relationship test could not run

## 28. Query/Performance Impact

**Zero additional queries.** Structured data is generated from data the experience functions already load. The shared helpers are pure functions — no I/O. `OutletStoryPage` builds NewsArticle from the story it already loaded. `Home.jsx` uses hardcoded constants. No N+1 queries introduced.

## 29. Fallback Behavior

- `JsonLd` component: renders nothing if `data` is null/empty. Never throws.
- `EntityFactualSummary`: renders nothing if insufficient data. Try/catch returns null.
- `buildPersonSchema` etc.: return null if required fields (name) are missing. Omit null properties via `compact()`.
- Experience functions: `structured_data_extra` is an array that may be empty — `JsonLd` handles gracefully.

## 30. Public Regression

- **Home**: Unchanged visually — WebSite/Organization JSON-LD is invisible script tags. Home1Settings untouched.
- **Entity pages**: Unchanged visually — JsonLd replaces script tags (same DOM output), EntityFactualSummary adds a small `<p>` below the header.
- **NavigationSettings**: Untouched.
- **FooterSettings**: Untouched.
- **SeoSettings**: Untouched (consumed only as fallback canonical base via seoDefaults.ts).

## 31. Management Regression

Management shell, ManagementLayout, ManagementSidebar, all management pages — untouched. No Management AI Discovery panel built (per spec — deferred to next phase).

## 32. RaceCore Regression

**Untouched.** No RaceCore data architecture, results logic, standings logic, registration, permissions, or governance modified. Only read-only experience functions' SEO output was enhanced. RaceCore operational routes, RaceCoreLayout, RaceControlProvider — all unchanged.

## 33. Data-Coverage Gaps

- 0 RacerProfiles — Person schema cannot be tested with real data
- 0 Results — ItemList for results cannot be tested
- 0 Standings — ItemList for standings cannot be tested
- 0 Teams — SportsOrganization for teams cannot be tested
- 0 Entries — racer→team relationship test cannot run

## 34. Presentation Gaps

- Results/Standings semantic HTML tables not refactored (div-based layout preserved per "do not redesign UI" constraint)
- Team and Vehicle experience functions do not emit `seo.structured_data` (no existing implementation to replace; no data to test)

## 35. Structured-Data Gaps

- `getTeamExperience` and `getVehicleExperience` do not return a `seo` object — wiring shared helpers is deferred
- Results ItemList and Standings ItemList helpers exist but are not wired (no data)
- Season is not in the URL (per spec — not redesigned)

## 36. Bugs Discovered

- **Canonical base bug (FIXED):** All four experience functions used `https://hijinxco.com` instead of `https://hijinx.com` in structured-data URLs. Fixed by replacing with shared helpers that use the correct fallback.
- **Relative URL bug (FIXED):** `getRacerProfileExperience` used relative URL `/racers/${slug}` in Person schema. Fixed by `buildCanonicalUrl` producing absolute URLs.
- **Missing JSON-LD (FIXED):** TrackProfile and OutletStoryPage had no JSON-LD injection at all. Added.

## 37. Bugs Fixed

See section 36. Three bugs fixed: canonical base, relative URLs, missing JSON-LD on Track/Outlet pages.

## 38. Remaining Risks

- **Canonical base not wired to SeoSettings:** If admin changes `canonical_base_url` in SeoSettings, structured data won't reflect it (uses fallback `https://hijinx.com`). Low risk — fallback matches default.
- **No real-data testing for Racer/Team/Results/Standings:** Code-verified only. Integration bugs could surface when data arrives.
- **OutletStoryPage JSON-LD is inline:** Not using the shared `buildNewsArticleSchema` helper (which is backend-only). Duplicates logic. Low risk — simple construction.

## 39. Deferred Items

- Wire `getTeamExperience` and `getVehicleExperience` to emit `seo.structured_data` using shared helpers
- Wire Results ItemList and Standings ItemList when data exists
- Refactor results/standings renderers to semantic `<table>` HTML
- Build Management AI Discovery panel (next phase)
- Wire SeoSettings `canonical_base_url` through to experience functions
- llms.txt implementation (insufficient evidence for benefit)
- Frontend mirror of `structuredDataHelpers.ts` for components that build JSON-LD inline (OutletStoryPage)

## 40. Recommended Next Phase

1. **Management AI Discovery panel** — consume `runAnswerabilityAudit` diagnostics, display data-coverage gaps and structured-data health
2. **Wire Team + Vehicle experience functions** to emit structured data using shared helpers
3. **Wire Results/Standings ItemList** when RaceCore data becomes available
4. **Semantic HTML tables** for results and standings renderers
5. **Frontend structured-data helpers** — mirror `base44/shared/structuredDataHelpers.ts` to `src/lib/` for inline use (OutletStoryPage, future components)
6. **RaceCore winner-semantics enhancement** — add `championship_type` and `round_winner_id` fields (RaceCore team work)