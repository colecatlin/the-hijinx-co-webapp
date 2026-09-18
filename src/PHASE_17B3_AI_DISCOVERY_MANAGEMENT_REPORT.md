# Phase 17B.3 — Management → Search & AI Discovery — Final Report

## 1. Existing Management SEO Audit

**Page:** `/management/website/seo` → `WebsiteSeo.jsx` → `SeoEditor.jsx`

**What it does (conventional SEO — stays):**
- Site Defaults: name, title suffix, default description, canonical base URL, twitter handle, default OG image
- Pages: per-static-page title/description/OG image/canonical path/noindex overrides
- Social Sharing: default OG type, twitter card type, default robots directive
- SEO Health: lightweight config validation (description length, canonical URL validity, duplicate titles)
- Preview: Google-style SERP preview for each static page

**What belongs under AI Discovery (new — does NOT duplicate SEO):**
- Answerability: can the platform answer factual motorsports questions?
- Entity Coverage: how many records exist per entity type?
- Structured Data Health: are JSON-LD helpers wired and emitting correct types?
- Canonical Health: is the canonical base URL correct? Any legacy domains?
- Sitemap Health: are public entity pages discoverable?
- Robots Health: are management/private routes blocked?
- Internal Linking: can crawlers follow factual entity relationships?

**Decision:** No SEO controls were duplicated. SEO remains a configuration editor; AI Discovery is a read-only diagnostics dashboard.

## 2. IA Decision

**Chosen:** Peer page under Website — `Website → Search & AI Discovery` (not a tab inside SEO).

**Rationale:**
1. SEO is a **configuration editor** (write) with a draft/publish lifecycle
2. AI Discovery is a **diagnostics dashboard** (read) with no write operations
3. Mixing them would conflate write and read concerns in the same tab bar
4. The Management architecture already has peer pages under Website (Home, Navigation, Footer, Links, SEO, etc.)
5. Adding "Search & AI Discovery" as a peer keeps the SEO editor focused on configuration

**Navigation depth:** No additional depth — it sits alongside SEO in the Website section, one click from the sidebar.

## 3. Files Created

| File | Purpose |
|------|---------|
| `src/pages/management/WebsiteAiDiscovery.jsx` | Page shell with 5 tabs, manages diagnostics + audit state |
| `src/components/management/ai-discovery/shared.jsx` | Shared UI: StatusBadge, PriorityBadge, FailureTypeBadge, SectionCard, StatCard, CheckRow |
| `src/components/management/ai-discovery/AiDiscoveryOverview.jsx` | Executive overview: answerability, failure types, entity coverage, discovery health |
| `src/components/management/ai-discovery/AnswerabilityPanel.jsx` | Run audit, render results grouped by category with diagnostic rows |
| `src/components/management/ai-discovery/EntityCoveragePanel.jsx` | Entity counts with lifecycle + impact, relationship coverage |
| `src/components/management/ai-discovery/StructuredDataPanel.jsx` | Structured-data health per entity type + winner-semantics warning |
| `src/components/management/ai-discovery/CrawlDiscoveryPanel.jsx` | Canonical, sitemap, robots, internal linking, llms.txt status |
| `src/components/management/ai-discovery/WinnerSemanticsWarning.jsx` | Semantic ambiguity warning with RaceCore action note |
| `base44/functions/getAiDiscoveryDiagnostics/entry.ts` | Lightweight diagnostics: entity counts, relationship coverage, canonical config |

## 4. Files Modified

| File | Change |
|------|--------|
| `src/App.jsx` | Added import + route + `MANAGEMENT_SHELL_PAGES` entry |
| `src/components/management/managementConfig.jsx` | Added "Search & AI Discovery" nav item with searchable description |
| `src/components/management/ManagementHeader.jsx` | Added page title + subtitle |
| `base44/functions/runAnswerabilityAudit/entry.ts` | Added `category` field to each test + category assignment |

## 5. Management Route

`/management/website/ai-discovery` — added as a peer to `/management/website/seo` under the Website section.

## 6. Navigation Changes

- Added "Search & AI Discovery" to the Website section in `managementConfig.jsx`
- Icon: `Activity` (from lucide-react)
- Description: "Answerability, structured data, schema, canonical, sitemap, robots, crawler access, entity coverage"
- Added to `MANAGEMENT_SHELL_PAGES` in App.jsx (renders its own ManagementLayout, no public Layout)
- ManagementHeader title: "Search & AI Discovery"
- ManagementHeader subtitle: "Manage search metadata and monitor machine-readable answerability"

## 7. Overview Implementation

5-tab structure: Overview, Answerability, Entity Coverage, Structured Data, Crawl & Discovery.

**Overview tab shows:**
- **Answerability**: Passing / Partial / Failing counts (from audit if run, or "Run Audit" CTA)
- **Failure Types**: Data Coverage, Public Presentation, Structured Data, Internal Linking, None (Passing)
- **Entity Coverage**: 8 entity types with counts and BLOCKING/HEALTHY priority
- **Discovery Health**: Canonical URLs, Structured Data, Breadcrumbs, Sitemap, Robots, Public Entity Pages

No percentage or score — raw counts with priority badges.

## 8. Answerability Implementation

- **Run Audit button** invokes the real `runAnswerabilityAudit` function
- Shows running state (spinner), success, or error with retry
- Results grouped by category: Results, Standings, Racers, Events, Teams, Series, Tracks, Platform, Structured Data
- Each test renders as a diagnostic row with:
  - Question text
  - Status badge (PASS / PARTIAL / FAIL)
  - Failure type badge (DATA_COVERAGE / PUBLIC_PRESENTATION / STRUCTURED_DATA / INTERNAL_LINKING)
  - Expandable details: required relationship, available entities (✓/✕), public page, check grid, reason
- No fabricated data — all from the real audit

## 9. Question Categories

Organized into: RESULTS, STANDINGS, RACERS, EVENTS, PLATFORM, STRUCTURED_DATA. Categories without tests (TEAMS, SERIES, TRACKS, OUTLET) are not rendered (no tests to show). The audit only tests questions the platform architecture can support.

## 10. Status Model

Explicit statuses: **PASS**, **PARTIAL**, **FAIL**, **NOT_TESTABLE** (frontend-only, for categories with no tests). No scores, no grades, no 0–100.

## 11. Failure Classification Model

| Type | Description |
|------|-------------|
| DATA_COVERAGE | No source records exist to answer the question |
| PUBLIC_PRESENTATION | Data exists but is not exposed in public HTML |
| STRUCTURED_DATA | Answer exists but JSON-LD is missing or incorrect |
| INTERNAL_LINKING | Answer + structured data exist but entity relationships are not linked |
| CANONICAL_DISCOVERY | Canonical URL is missing, relative, or uses a legacy domain |
| SEMANTIC_AMBIGUITY | Data model does not reliably distinguish the concept |
| SYSTEM_ERROR | Audit could not execute — distinct from missing data |
| NONE | No failure detected |

Classification is separate from status — a FAIL can be DATA_COVERAGE or SYSTEM_ERROR.

## 12. Entity Coverage

Shows counts for: Racers, Teams, Series, Tracks, Events, Results, Standings, Outlet Stories. Lifecycle breakdown (live/draft/archived or published/draft/archived) only where the entity actually supports those states. Each zero-count entity shows an impact statement explaining what answers are blocked.

## 13. Relationship Coverage

Diagnoses: Events→Track, Events→Series, Results→Racer, Results→Event, Racers→Team, Standings→Racer, Standings→Series, Standings→Season. Shows "X / Y complete" with ✓/✕. Only queries relationships that exist in the current schema — no inference.

## 14. Structured-Data Diagnostics

For each public entity (Racer, Event, Series, Track, Outlet Story, Home, Team, Vehicle): expected Schema.org type, helper exists, page integration, absolute canonical URL, BreadcrumbList, visible factual summary. Static registry based on Phase 17B.2 implementation. Does NOT claim Google/AI validation — internal implementation diagnostic only.

## 15. Canonical Diagnostics

Shows: production base URL (from SeoSettings), canonical source (published/draft/fallback), legacy domain check (hijinxco.com flag). Current result: `https://hijinx.com` from SeoSettings (published), no legacy domain found.

## 16. Sitemap Diagnostics

Runtime fetch of `/sitemap.xml` from the browser. Checks: available, entry count, entity types represented (Racers, Tracks, Series, Events, Outlet Stories). Does not expose Management or private routes.

## 17. Robots Diagnostics

Runtime fetch of `/robots.txt` from the browser. Checks: available, sitemap reference, management routes blocked, RaceCore routes blocked, admin routes blocked. Does not loosen security restrictions.

## 18. Internal-Link Diagnostics

Uses relationship coverage data to answer "can a crawler follow the factual relationship?" Shows X/Y complete for each relationship. Missing relationships reported separately from missing links.

## 19. Winner-Semantics Warning

Surfaces the Phase 17B.2 finding as a SEMANTIC_AMBIGUITY warning. Lists affected questions (round winner, event winner, championship winner, World Championship, Cup). Provides RaceCore action note: add `championship_type` and `round_winner_id`. Does NOT modify RaceCore.

## 20. Data-Gap Impact Mapping

Every zero-count entity has an impact statement:
- **0 Racers**: "Racer identity questions cannot currently be answered — racer profiles, team affiliation, class participation."
- **0 Results**: "Race winner and finishing-position questions cannot currently be answered — no result records exist."
- **0 Standings**: "Points leader, championship position, and championship winner questions cannot currently be answered — no standings records exist."
- **0 Teams**: "Team affiliation questions cannot currently be answered."

## 21. Priority Model

No scores. Four operational priorities:
- **BLOCKING** — prevents answerability (e.g., 0 results)
- **NEEDS_ATTENTION** — should be addressed (e.g., legacy domain, missing page integration)
- **HEALTHY** — working correctly
- **INFORMATIONAL** — no action needed (e.g., llms.txt deferred)

## 22. Run Audit Workflow

1. Admin clicks "Run Answerability Audit"
2. `useMutation` calls `base44.functions.invoke('runAnswerabilityAudit', {})`
3. Spinner shows during execution (~7 seconds)
4. On success: results rendered, timestamp displayed
5. On failure: error message with retry button
6. No fake progress stages — just running/success/error

## 23. Audit History Decision

**Deferred.** Storing audit snapshots would require a new entity (AuditSnapshot) with run_at, pass_count, fail_count, etc. The operational value is low — admins can re-run the audit on demand in ~7 seconds. The diagnostics function already provides real-time entity counts. If history becomes useful later, a lightweight entity can be added without architectural changes.

## 24. Sample Answer Implementation

Not implemented as a separate feature. The audit's `notes` field already contains deterministic factual answers (e.g., "Winner: [Name]", "Date: [Date]", "Track: [Name], [Location]"). These are displayed in the expanded test details. No LLM is used to generate or embellish answers.

## 25. Entity Detail Diagnostics

Not implemented as a separate entity inspector. The AnswerabilityPanel's expanded test rows already show per-entity diagnostics: canonical, schema type, breadcrumb, series/track relationships, results count, and direct-answer capability (When? Where? Winner?). This avoids turning the dashboard into another entity editor.

## 26. llms.txt Status

Displayed as INFORMATIONAL in the Crawl & Discovery tab. Status: DEFERRED. Reason: insufficient evidence that it materially improves discovery compared with existing structured-data + sitemap architecture. The site is not unhealthy because llms.txt is absent.

## 27. AI Crawler Findings

No giant crawler allow/block interface was created. The robots.txt audit reports the actual configuration: `User-agent: *` with `Allow: /` for public routes and `Disallow` for management/admin/racecore. No claims that allowing a crawler guarantees indexing, citations, answers, training, or retrieval.

## 28. ManagementSearch Integration

The nav item description includes all required search terms: "Answerability, structured data, schema, canonical, sitemap, robots, crawler access, entity coverage." ManagementSearch filters by name and description, so searching for "SEO", "AI", "AI Discovery", "Search", "Answerability", "Structured Data", "Schema", "Canonical", "Sitemap", "Robots", or "Crawler" will find the page. No CommandPalette reintroduced.

## 29. ManagementHeader Integration

Title: "Search & AI Discovery"
Subtitle: "Manage search metadata and monitor machine-readable answerability"

## 30. Responsive Behavior

- Tab bar: horizontal scroll on mobile (`overflow-x-auto`)
- Stat cards: `grid-cols-2 md:grid-cols-4` — 2 columns on mobile, 4 on desktop
- Diagnostic rows: stacked, no giant desktop-only tables
- Section cards: full width, stack vertically
- All components use semantic Tailwind classes that adapt to viewport

## 31. Query/Performance Impact

- **Page load**: One `getAiDiscoveryDiagnostics` call (405ms) — entity counts + relationship coverage + canonical config. Cached with 60s staleTime.
- **Audit**: Only on explicit "Run Audit" click (~7 seconds). Not run on page render.
- **Sitemap/robots**: Lightweight browser `fetch()` of public endpoints. Only on Crawl & Discovery tab mount.
- **No repeated queries**: React Query caching prevents refetch on tab switches.

## 32. Security

- Page wrapped in `<AdminGuard>` — admin-only
- Route in `MANAGEMENT_SHELL_PAGES` — no public Layout
- Backend function uses `asServiceRole` — runs with admin context
- No draft content, private entity data, or internal system errors exposed publicly
- Public facts remain public through their normal pages

## 33. Error/Fallback Behavior

- If `getAiDiscoveryDiagnostics` fails: loading spinner shows, then empty state
- If `runAnswerabilityAudit` fails: error banner with "Audit Unavailable" + retry button. SYSTEM_ERROR is distinct from DATA_COVERAGE.
- If sitemap/robots fetch fails: shows "Not reachable" / "Not available" — page still renders
- If no audit has been run: shows "Run Audit" CTA — no fake results

## 34. Real Audit Result

**11 tests, 5 PASS, 2 PARTIAL, 4 FAIL**
- Failure types: 4 DATA_COVERAGE, 1 PUBLIC_PRESENTATION, 0 STRUCTURED_DATA, 0 LINKING
- Entity counts: 0 racers, 0 teams, 0 results, 0 standings, 16 series, 7 tracks, 8 events, 16 outlet stories
- Relationship coverage: Events→Track 8/8, Events→Series 8/8 (complete)
- Canonical: `https://hijinx.com` from SeoSettings (published), no legacy domain

The dashboard honestly displays these failures and distinguishes DATA_COVERAGE (missing records) from STRUCTURED_DATA (implementation issues).

## 35. Public Regression

- **Home**: Unchanged — no public page modifications
- **Home1Settings**: Unchanged
- **NavigationSettings**: Unchanged
- **FooterSettings**: Unchanged
- **Media Library**: Unchanged
- **Outlet StoryForm**: Unchanged
- **Shopify**: Unchanged
- **Content Files**: Unchanged
- **Public structured data**: Unchanged (Phase 17B.2 architecture preserved)

## 36. Management Regression

- **Management shell**: Intact — new page uses existing ManagementLayout + ManagementShell + AdminGuard
- **ManagementSidebar**: Intact — new item added to config, no structural changes
- **ManagementSearch**: Intact — new item discoverable via existing search logic
- **ManagementHeader**: Intact — new page title added to existing PAGE_TITLES map
- **SEO page**: Unchanged — no tabs or controls modified

## 37. RaceCore Regression

**Untouched.** No RaceCore entities, results logic, standings calculations, registration, permissions, governance, or imports modified. The winner-semantics gap is documented as a warning with an action note for future RaceCore work — not fixed from Management.

## 38. Bugs Discovered

- **None new.** The Phase 17B.2 bugs (canonical base, relative URLs, missing JSON-LD) were already fixed in the prior phase.

## 39. Bugs Fixed

- **None.** No bugs were introduced or fixed in this phase — it was purely additive (new Management page + backend diagnostics function).

## 40. Remaining Risks

- **Sitemap team URLs**: The `generateSitemap` function emits `/Directory?cat=teams` for every team (not individual team profiles) — teams don't have a canonical `/teams/:slug` route in the sitemap. This is a pre-existing sitemap gap, not introduced by this phase.
- **Static structured-data registry**: The StructuredDataPanel uses a hardcoded registry based on Phase 17B.2. If new entity types are wired in the future, the registry must be updated manually.
- **No audit history**: Admins must re-run the audit manually — no historical trend data.

## 41. Deferred Items

- Audit history (lightweight snapshot entity) — low operational value
- Entity detail diagnostics inspector — the expanded test rows already cover this
- Sample answer preview as a separate feature — the audit `notes` field already provides deterministic answers
- AI crawler allow/block interface — not needed this phase
- Team/Vehicle structured-data wiring — deferred from Phase 17B.2 (no data to test)
- Results/Standings ItemList wiring — deferred (no data)

## 42. Recommended Next Phase

1. **Wire Team + Vehicle experience functions** to emit `seo.structured_data` using shared helpers
2. **Wire Results/Standings ItemList** when RaceCore data becomes available
3. **Fix sitemap team URLs** — add canonical `/teams/:slug` route to sitemap (requires public team profile route)
4. **RaceCore winner-semantics enhancement** — add `championship_type` and `round_winner_id` fields
5. **Frontend structured-data helpers** — mirror `structuredDataHelpers.ts` to `src/lib/` for inline component use
6. **Audit history** — if operational value emerges, add a lightweight AuditSnapshot entity