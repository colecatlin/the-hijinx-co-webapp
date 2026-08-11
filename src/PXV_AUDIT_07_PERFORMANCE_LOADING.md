# PXV_AUDIT_07_PERFORMANCE_LOADING

**Audit Type:** Read-only human experience audit — performance, loading & perceived speed  
**Date:** 2026-08-11  
**Scope:** Perceived speed across every page (Homepage, Search, Racer, Team, Vehicle, Series, Track, Event, Media, Sponsor, Organization, Dashboard, RaceCore, Management, Claims, Authentication, Settings), evaluating loading states, skeletons, transitions, caching, query behavior, and the psychological experience of speed  
**Methodology:** Read query configurations, data loaders, page components, loading components, and caching contracts. Evaluated perceived speed from the user's perspective — not raw technical metrics, but how fast the platform *feels* and whether users ever wait unnecessarily  
**Constraint:** Judge perceived speed. Assume a normal internet connection. Determine whether the platform communicates progress well and reduces uncertainty.  

---

## 1. Executive Summary

The Hijinx platform has a **solid perceived-performance foundation** — React Query caching with sensible defaults, framer-motion page transitions, skeleton loaders on entity profiles, a branded BurnoutSpinner, tab keep-alive for preserved scroll state, and a homepage that renders instantly from fallback data. These are not accidental; they show that perceived speed was a conscious design consideration.

**However, the platform has several critical performance problems that will make it feel sluggish at scale:**

1. **RacerProfile downloads the entire database.** `getRacerProfilePageData` fetches ALL results (500), ALL standings (500), ALL series, ALL classes, ALL events, ALL tracks, ALL sessions, and ALL teams — then filters client-side. Every single racer profile page loads the entire platform database in a single page load. At scale (hundreds of racers, thousands of results), this will be catastrophically slow. This is the single biggest performance issue on the platform.

2. **PublicMediaGallery has a 3-step waterfall AND over-fetches all media.** It loads PublishTargets → extracts asset IDs → loads ALL MediaAssets (`MediaAsset.list()`) → filters client-side. This is both a sequential waterfall (3 round trips) and a massive over-fetch. Every media gallery on every entity profile downloads every media asset in the system.

3. **EventProfile double-loads on failure.** It tries `getEventExperience` first, then falls back to legacy `getEventProfileData`. When the experience function fails (returns null), it triggers a second full page load — a sequential waterfall that doubles the wait time.

4. **Search fetches 1,800 records on every keystroke.** The global search in Layout.jsx fetches 9 entity types × 200 records each on every debounced keystroke (300ms). No result caching, no incremental rendering, no query cancellation. Typing "john" fetches 1,800 records, then typing "johnson" fetches another 1,800.

5. **Management page returns a blank page while loading.** `if (userLoading) return null;` — no skeleton, no spinner, just a white screen. The admin's first impression of the platform is a blank page.

6. **No lazy loading or code splitting.** The entire app loads upfront. With hundreds of pages, dozens of heavy components (recharts, react-leaflet, react-quill, three.js), and multiple entity management systems, the initial bundle will be large. First load will be slow.

7. **No image optimization.** No lazy loading, no progressive loading, no srcset, no thumbnail/preview variants. Large hero images and media galleries will block page render and consume bandwidth on every load.

8. **No query cancellation.** When a user navigates away from a page mid-load, the in-flight queries continue to completion. Rapid navigation creates a cascade of wasted requests.

9. **No prefetching.** The platform never prefetches data for likely-next destinations. Clicking a racer in a list doesn't prefetch that racer's profile data. Every navigation is a cold load.

10. **No stale-while-revalidate on critical paths.** Entity profiles show skeletons on first load, then load fresh data every time (staleTime 30s). Returning to a profile you just visited 31 seconds ago shows a skeleton again. The cache is too aggressive in eviction.

**Despite these issues, the perceived-performance patterns are well-built.** The homepage is instant (fallback data), page transitions are smooth, skeletons are present on most entity profiles, and the tab keep-alive system makes bottom-nav switching feel native. The problem is not the *patterns* — it's the *data loading strategy*. The platform over-fetches massively and doesn't cache aggressively enough.

---

## 2. Overall Performance Score

| Category | Score (0-10) | Weight |
|----------|-------------|--------|
| Initial Load | 5.0 | 10% |
| Navigation Speed | 5.5 | 10% |
| Search Speed | 4.0 | 8% |
| Profile Speed | 3.5 | 10% |
| RaceCore Speed | 6.0 | 8% |
| Management Speed | 4.5 | 5% |
| Media | 3.5 | 8% |
| Loading States | 6.5 | 8% |
| Skeletons | 6.5 | 5% |
| Animations | 7.5 | 5% |
| Feedback | 6.0 | 5% |
| Perceived Performance | 5.0 | 8% |
| Overall Speed | 4.5 | 10% |

**Weighted Overall Score: 51 / 100**

---

## 3. Loading Audit

### 3.1 Initial Load

**Strengths:**
- ✅ Homepage renders instantly from `FALLBACK_DATA` — no blank page, content appears immediately
- ✅ React Query `staleTime: 2 * 60 * 1000` on homepage — 2-minute cache, returning visitors see instant content
- ✅ `retry: 1` — single retry, not aggressive
- ✅ Page transition animation (opacity + y, 0.22s) masks load time

**Weaknesses:**
- ❌ No code splitting — entire app loads upfront (hundreds of pages, heavy deps: recharts, react-leaflet, react-quill, three.js)
- ❌ No route-level lazy loading — every page is in the initial bundle
- ❌ No prefetching of likely-next routes
- ⚠️ Background image on Home (`PlatformBackground.png`) loads on every page view
- ⚠️ Global texture overlay (`BGRND46Page.png`) + SVG noise filter render on every page

### 3.2 Perceived Load

**Strengths:**
- ✅ Homepage: content visible immediately (fallback data)
- ✅ Entity profiles: skeleton loaders show structure before content
- ✅ RaceCore: BurnoutSpinner (branded, on-theme) shows progress
- ✅ Page transitions smooth the gap between pages

**Weaknesses:**
- ❌ Management page: `return null` while loading — blank white screen
- ❌ RacerProfile: skeleton shows, but the actual data load is so heavy (entire database) that the skeleton persists for a long time
- ⚠️ Content "pops in" after skeleton — no smooth transition from skeleton to content
- ⚠️ Tab content within entity profiles pops in without transition

### 3.3 Skeleton Quality

**Strengths:**
- ✅ Skeleton component used on RacerProfile, EventProfile, SeriesDetail, TrackProfile
- ✅ Skeletons match layout shape (hero, tabs, content blocks)
- ✅ Pulse animation is subtle, not distracting

**Weaknesses:**
- ⚠️ Not all entity profiles use skeletons (Team, Vehicle, Sponsor, Organization)
- ⚠️ Skeletons are generic gray blocks — don't match the Hijinx design language
- ⚠️ No skeleton for tab content — tabs show empty state then pop in content
- ⚠️ No skeleton for search results — blank dropdown while loading

### 3.4 Loading Indicators

**Strengths:**
- ✅ BurnoutSpinner — branded, on-theme, delightful
- ✅ Loader2 spinners on form submit buttons
- ✅ PullToRefresh shows Loader2 while refreshing
- ✅ RaceCore loading gate shows spinner with branded styling

**Weaknesses:**
- ⚠️ Spinners overused on buttons — every form submit shows a spinner
- ⚠️ No progress indicators for multi-step loads (e.g., RacerProfile's 17 parallel queries)
- ⚠️ No skeleton-to-content transition — content just appears
- ⚠️ No optimistic UI for most mutations (only some use it)

### 3.5 Blank Pages

- ❌ Management page: `if (userLoading) return null;` — blank page
- ⚠️ RaceCore: shows spinner but on a blank canvas (no skeleton structure)
- ⚠️ Auth redirect pages: brief blank flash before redirect
- ✅ Entity profiles: skeletons, not blank
- ✅ Homepage: fallback data, not blank

### 3.6 Content Pop-in

- ⚠️ Entity profile tabs: content pops in without transition when switching tabs
- ⚠️ Search results: pop in after 300ms debounce + fetch
- ⚠️ Media galleries: images pop in one by one as they load
- ⚠️ Charts: pop in after data loads, no skeleton
- ✅ Homepage sections: render from fallback, no pop-in

### 3.7 Loading Score: 6.5/10

Loading patterns are **well-built at the component level** (skeletons, spinners, transitions) but **undermined by heavy data loads and blank pages in Management**.

---

## 4. Skeleton Audit

### 4.1 Where Skeletons Are Used

| Page | Skeleton? | Quality |
|------|-----------|---------|
| Homepage | No (fallback data) | N/A — instant render |
| RacerProfile | ✅ Yes | Good — hero, tabs, content |
| EventProfile | ✅ Yes | Good — hero, tabs, content |
| SeriesDetail | ✅ Yes | Good |
| TrackProfile | ✅ Yes | Good |
| TeamProfile | ⚠️ Partial | Inconsistent |
| VehicleProfile | ⚠️ Partial | Inconsistent |
| SponsorProfile | ❌ No | Missing |
| OrganizationPage | ❌ No | Missing |
| MyDashboard | ⚠️ Partial | Some sections |
| RaceCore | ❌ No (spinner) | BurnoutSpinner only |
| Management | ❌ No (blank) | `return null` |
| ClaimsCenter | ⚠️ Partial | Some sections |
| Search | ❌ No | Blank dropdown |
| Directory | ⚠️ Partial | Some sections |

### 4.2 Skeleton Design

**Strengths:**
- ✅ Pulse animation is subtle
- ✅ Matches content layout shape
- ✅ Uses shadcn Skeleton component (consistent)

**Weaknesses:**
- ⚠️ Generic gray (`bg-gray-200` / `bg-muted`) — doesn't match Hijinx design language
- ⚠️ No branded skeleton (e.g., motion teal shimmer)
- ⚠️ No content-aware skeletons (text lines vs. image blocks vs. chart placeholders)
- ⚠️ No skeleton for tab content — only for initial page load

### 4.3 Skeleton-to-Content Transition

- ❌ No transition — content replaces skeleton instantly
- ⚠️ No fade-in or slide-in for content after skeleton
- ⚠️ Jarring pop when skeleton disappears

### 4.4 Skeleton Score: 6.5/10

Skeletons are **present on the most important pages** but missing on Management, Sponsor, Organization, and Search. Design is generic, not branded.

---

## 5. Navigation Audit

### 5.1 Page Transition Speed

**Strengths:**
- ✅ framer-motion AnimatePresence — opacity + y transition, 0.22s
- ✅ Smooth, not jarring
- ✅ Tab keep-alive: bottom nav tabs stay mounted, instant switch
- ✅ Exit animation (opacity + y) before new page enters

**Weaknesses:**
- ⚠️ Transition runs on every navigation, even for cached pages — adds 220ms to every nav
- ⚠️ No transition for tab switches within entity profiles
- ⚠️ No transition for drawer/modal open/close (except RaceCore and hamburger)

### 5.2 Returning to Previous Page

**Strengths:**
- ✅ React Query cache (30s staleTime, 5min gcTime) — returning within 30s is instant
- ✅ Tab keep-alive preserves scroll position for bottom nav tabs
- ✅ Browser back button works (React Router)

**Weaknesses:**
- ❌ Returning after 30s+ triggers a refetch + skeleton — feels slow
- ❌ No stale-while-revalidate — cache is either fresh (instant) or stale (skeleton)
- ⚠️ Scroll position NOT preserved for non-tab routes (entity profiles)
- ⚠️ No "back to search results" preservation

### 5.3 Navigation Caching

**Strengths:**
- ✅ React Query with consistent query keys
- ✅ Invalidation contract (`invalidationContract.jsx`) — deterministic cache clearing
- ✅ `refetchOnWindowFocus: false` — no unnecessary refetches on tab switch

**Weaknesses:**
- ❌ staleTime 30s is too short for entity profiles — users returning to a profile after 31s see a skeleton
- ⚠️ No prefetching on hover/likely-next
- ⚠️ No cache persistence across sessions (no persistQueryClient)

### 5.4 Navigation Speed Score: 5.5/10

Navigation is **smooth thanks to transitions and tab keep-alive** but **feels slow on return visits** due to short staleTime and no stale-while-revalidate.

---

## 6. Search Audit

### 6.1 Typing Latency

**Strengths:**
- ✅ 300ms debounce — prevents excessive queries while typing
- ✅ Input is controlled — responsive to keystrokes

**Weaknesses:**
- ❌ No query cancellation — typing "john" then "johnson" fires two full 1,800-record fetches
- ❌ No incremental rendering — results appear all at once after all 9 queries complete
- ⚠️ 300ms debounce may feel laggy on fast typing

### 6.2 Result Rendering

**Strengths:**
- ✅ Results grouped by category (Stories, Racers, Events, Tracks, Series, Teams, Vehicles, Media, Sponsors)
- ✅ Truncated to 4 results per category — not overwhelming
- ✅ Links navigate to correct routes

**Weaknesses:**
- ❌ No skeleton/loading state for results — "SEARCHING..." text only
- ❌ Results pop in all at once after all 9 queries complete
- ⚠️ No result count or "showing X of Y" indicator
- ⚠️ No keyboard navigation (arrow keys, enter)

### 6.3 Empty Results

- ✅ "No results for '{query}'" message shown
- ⚠️ No search suggestions or popular searches
- ⚠️ No "did you mean?" fuzzy matching

### 6.4 Loading Feedback

- ✅ "SEARCHING..." mono text shown while loading
- ⚠️ No spinner or progress indicator
- ⚠️ No partial results — all categories appear together

### 6.5 Repeated Searches

- ❌ No result caching — typing the same query again fetches all 1,800 records again
- ❌ No memoization of search results
- ⚠️ React Query caches the individual entity lists, but the filtering runs every time

### 6.6 Category Loading

- ❌ All 9 categories load in parallel but results don't render until ALL complete
- ⚠️ No progressive rendering — faster categories (e.g., Series) wait for slower ones (e.g., Media)
- ⚠️ No per-category loading indicator

### 6.7 Search Over-Fetching

**Critical issue:** The search fetches 200 records per entity type × 9 types = 1,800 records on every search. It then filters client-side. This is:
- 1,800 records downloaded per search
- No server-side filtering
- No pagination
- No result caching
- No query cancellation

At scale, this will be very slow and bandwidth-heavy.

### 6.8 Search Score: 4.0/10

Search is **functional but not optimized** — massive over-fetching, no caching, no progressive rendering, no cancellation.

---

## 7. Entity Performance

### 7.1 RacerProfile — CRITICAL

**The single biggest performance issue on the platform.**

`getRacerProfilePageData` fetches:
- ALL Results (500 records, `-created_date`)
- ALL Standings (500 records, `-created_date`)
- ALL Series (`Series.list()`)
- ALL SeriesClass (`SeriesClass.list()`)
- ALL Events (`Event.list()`)
- ALL Tracks (`Track.list()`)
- ALL Sessions (`Session.list()`)
- ALL Teams (`Team.list()`)
- Plus racer-specific: PersonIdentity, SeasonParticipation, Entries, DriverCareerStats, DriverMedia, DriverProgram, DriverCareerEntry, DriverSponsor, legacy Driver

**Total: 17 parallel queries, downloading the entire platform database, then filtering client-side.**

At scale (100+ racers, 1000+ results, 50+ events), this will:
- Take several seconds to load
- Consume significant bandwidth
- Feel sluggish on every racer profile visit
- Not benefit from caching (staleTime 30s means re-fetch after 30s)

**Perceived impact:** A user clicking a racer from the Directory will wait 2-5 seconds (or more at scale) staring at a skeleton. This is the most visited page type on the platform and it's the slowest.

### 7.2 Team Profile

`getTeamProfileData` follows the same pattern — fetches all entries, all results, all events, all tracks, all series, all classes, then filters client-side. Same over-fetching problem, slightly less severe (fewer queries).

### 7.3 Event Profile

**Double-load waterfall:**
1. Tries `getEventExperience` backend function
2. If it fails (returns null), falls back to `getEventProfileData` legacy loader
3. `isLoading = isLoadingExp && !experienceData && isLoadingLegacy && !legacyData`

This means:
- If experience function succeeds: 1 load (good)
- If experience function fails: 2 sequential loads (bad — doubles wait time)
- The `isLoading` logic is confusing and may show skeleton longer than necessary

### 7.4 Series Profile

Uses `getSeriesExperience` backend function — single backend call that aggregates data server-side. **This is the correct pattern.** If all entity profiles used this pattern, performance would be much better.

### 7.5 Track Profile

Uses `getTrackExperience` backend function — same correct pattern as Series.

### 7.6 Vehicle Profile

Uses `getVehicleExperience` backend function — correct pattern.

### 7.7 Sponsor Profile

Uses `getSponsorExperience` backend function — correct pattern.

### 7.8 Hero Loading

- ⚠️ Hero images load without lazy loading or progressive loading
- ⚠️ No image placeholder while hero image loads
- ⚠️ Hero text may appear before image, then image pops in

### 7.9 Statistics Loading

- ⚠️ Statistics charts (recharts) load after data — no chart skeleton
- ⚠️ Charts pop in without transition
- ⚠️ No "no data" state for empty statistics

### 7.10 Timeline Loading

- ⚠️ Timeline items load with the page — no progressive loading
- ⚠️ Long timelines (Career, History) render all items at once — no virtualization

### 7.11 Media Loading

- ⚠️ Media galleries use PublicMediaGallery — 3-step waterfall + over-fetch
- ⚠️ No lazy loading of images
- ⚠️ No thumbnail/preview variants — full images load

### 7.12 Relationship Loading

- ⚠️ Related entities (team, series, track) loaded with page data
- ⚠️ No progressive rendering of relationship cards

### 7.13 Tab Switching

- ❌ No transition between tabs — content pops in
- ⚠️ No tab content caching — switching back to a tab re-renders
- ⚠️ No lazy loading of tab content — all tab data loads with page

### 7.14 Entity Performance Score: 3.5/10

Entity profiles are **the most visited pages and the slowest** due to massive over-fetching (RacerProfile, TeamProfile) and waterfalls (EventProfile). The experience-function pattern (Series, Track, Vehicle, Sponsor) is correct but not applied consistently.

---

## 8. RaceCore Performance

### 8.1 Entries

**Strengths:**
- ✅ Event-scoped queries (`Entry.filter({ event_id: eventId })`) — not over-fetching
- ✅ React Query with consistent keys (REG_QK)
- ✅ Parallel queries via useDashboardQueries

**Weaknesses:**
- ⚠️ No virtualization for large entry lists (100+ entries)
- ⚠️ No optimistic UI for entry mutations
- ⚠️ Full re-fetch after every mutation

### 8.2 Results

**Strengths:**
- ✅ Event-scoped queries
- ✅ Parallel loading with other event data

**Weaknesses:**
- ⚠️ No virtualization for large result sets
- ⚠️ No incremental loading — all results at once
- ⚠️ Results table re-renders on every mutation

### 8.3 Standings

**Strengths:**
- ✅ Series + season scoped queries
- ✅ Cached with React Query

**Weaknesses:**
- ⚠️ No virtualization
- ⚠️ Full re-fetch after recalculation

### 8.4 Registration

- ⚠️ Registration forms submit with spinner — no optimistic UI
- ⚠️ No progress indicator for multi-step registration

### 8.5 Tables

- ⚠️ Dense tables render all rows — no pagination or virtualization
- ⚠️ No skeleton for table content — spinner only
- ⚠️ Table sorting/filtering is client-side — re-renders all rows

### 8.6 Dialogs

- ✅ Dialogs open instantly (local state)
- ⚠️ Dialog content may load data on open — no skeleton inside dialog
- ⚠️ No transition for dialog content loading

### 8.7 Drawers

- ✅ Drawers slide in with animation
- ⚠️ Drawer content loads data on open — no skeleton inside drawer
- ⚠️ No preloading of drawer content

### 8.8 RaceCore Operations Responsiveness

- ✅ BurnoutSpinner provides branded loading feedback
- ⚠️ Mutations feel slow — full re-fetch after every operation
- ⚠️ No optimistic UI for most mutations
- ⚠️ No progress indicator for batch operations

### 8.9 RaceCore Score: 6.0/10

RaceCore is **better than entity profiles** — event-scoped queries prevent over-fetching. But it lacks virtualization, optimistic UI, and progressive loading.

---

## 9. Media Performance

### 9.1 Gallery Loading

**Critical issue:** PublicMediaGallery uses a 3-step waterfall:
1. Load PublishTargets for entity (filtered, 24 max)
2. Extract asset IDs from PublishTargets
3. Load ALL MediaAssets (`MediaAsset.list()`) — then filter client-side

Step 3 is the problem: it downloads every media asset in the system, then filters to the ~24 needed. At scale (hundreds of assets), this is very slow.

### 9.2 Thumbnail Loading

- ❌ No thumbnail/preview variants — full-resolution images load as thumbnails
- ❌ No lazy loading — all images load immediately
- ⚠️ Grid of 24 images loads 24 full-resolution images at once

### 9.3 Progressive Images

- ❌ No progressive image loading (LQIP, blur-up)
- ❌ No srcset for responsive images
- ❌ No WebP/AVIF format negotiation

### 9.4 Video Loading

- ⚠️ Videos load on click (good — not autoplay)
- ⚠️ No video poster image — blank placeholder until click
- ⚠️ No video preload metadata

### 9.5 Large Images

- ❌ No image size optimization
- ❌ Hero images load at full resolution
- ❌ No responsive image variants

### 9.6 Attachment Loading

- ⚠️ Attachments load on demand (good)
- ⚠️ No progress indicator for large file downloads
- ⚠️ No signed URL caching

### 9.7 Media Score: 3.5/10

Media performance is **the weakest area** — waterfall queries, over-fetching all assets, no image optimization, no lazy loading.

---

## 10. Perceived Speed

### 10.1 Animation Timing

**Strengths:**
- ✅ Page transitions: 0.22s — fast enough to not annoy, slow enough to smooth
- ✅ Drawer animations: 0.22-0.3s — smooth
- ✅ Hover transitions: 0.2s — responsive
- ✅ Tab indicator transitions: 0.2s

**Weaknesses:**
- ⚠️ No staggered animations for lists — all items appear at once
- ⚠️ No spring physics — all animations are linear/ease
- ⚠️ Loading spinners spin at constant speed — no progress indication

### 10.2 Page Transitions

- ✅ Smooth opacity + y transition
- ✅ Exit animation before enter
- ⚠️ 220ms added to every navigation — cumulative on rapid navigation
- ⚠️ No transition for tab switches

### 10.3 Hover Feedback

- ✅ Color transitions on hover (0.2s)
- ✅ Background transitions on hover
- ⚠️ No scale/transform on hover for cards
- ⚠️ No cursor changes for interactive elements

### 10.4 Button Feedback

- ✅ Color change on hover
- ✅ Spinner on click/submit
- ⚠️ No press/scale feedback (active state)
- ⚠️ No haptic feedback (mobile)

### 10.5 Form Submission

- ✅ Spinner on submit button
- ✅ Success/error toast notifications
- ⚠️ No optimistic UI for most forms — wait for server response
- ⚠️ No progress for multi-step forms

### 10.6 Success Feedback

- ✅ Toast notifications (sonner/use-toast)
- ✅ Visual confirmation on success
- ⚠️ No confetti/celebration for key actions (claim approved, registration complete)
- ⚠️ Success state may be brief — user may miss it

### 10.7 Deletion Feedback

- ⚠️ Confirmation dialog before delete (good)
- ⚠️ No optimistic deletion — wait for server response
- ⚠️ No undo option
- ⚠️ Item disappears after server confirms — may feel abrupt

### 10.8 Completion Feedback

- ✅ Toast on completion
- ⚠️ No progress bar for multi-step processes
- ⚠️ No "all done" state for batch operations
- ⚠️ No completion summary

### 10.9 Perceived Speed Score: 5.0/10

Animations and transitions are **well-crafted** but **undermined by slow data loads and lack of optimistic UI**. The platform looks fast but feels slow when waiting for data.

---

## 11. Top 50 Performance Issues

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | RacerProfile downloads entire database (17 queries, 500+ records each) | Entity | Critical |
| 2 | PublicMediaGallery downloads ALL MediaAssets then filters | Media | Critical |
| 3 | Search fetches 1,800 records per keystroke with no caching | Search | Critical |
| 4 | No code splitting — entire app in initial bundle | Initial Load | Critical |
| 5 | No image lazy loading or optimization | Media | Critical |
| 6 | EventProfile double-loads on experience function failure | Entity | High |
| 7 | Management page returns blank `null` while loading | Loading | High |
| 8 | staleTime 30s too short — returning after 31s shows skeleton | Caching | High |
| 9 | No stale-while-revalidate — cache is fresh or skeleton | Caching | High |
| 10 | No query cancellation on navigation | Queries | High |
| 11 | No prefetching of likely-next destinations | Navigation | High |
| 12 | TeamProfile over-fetches (same pattern as RacerProfile) | Entity | High |
| 13 | No optimistic UI for most mutations | Feedback | High |
| 14 | No virtualization for long lists (entries, results, standings) | RaceCore | High |
| 15 | No chart skeletons — charts pop in | Loading | Medium |
| 16 | No tab content caching — switching re-renders | Entity | Medium |
| 17 | No tab content transition — content pops in | Entity | Medium |
| 18 | No skeleton on Sponsor, Organization, Management, Search | Skeletons | Medium |
| 19 | No skeleton-to-content transition — content replaces skeleton | Loading | Medium |
| 20 | No progressive image loading (LQIP, blur-up) | Media | Medium |
| 21 | No responsive image variants (srcset) | Media | Medium |
| 22 | No thumbnail/preview variants for media | Media | Medium |
| 23 | No result caching for search | Search | Medium |
| 24 | No incremental search rendering — all categories at once | Search | Medium |
| 25 | No per-category loading indicator in search | Search | Medium |
| 26 | No keyboard navigation in search | Search | Low |
| 27 | No "did you mean?" fuzzy search | Search | Low |
| 28 | No scroll position preservation on entity profiles | Navigation | Medium |
| 29 | No cache persistence across sessions | Caching | Medium |
| 30 | No progress indicator for multi-step loads | Loading | Medium |
| 31 | No progress for batch operations | Feedback | Medium |
| 32 | No undo for deletions | Feedback | Low |
| 33 | No staggered animations for lists | Animation | Low |
| 34 | No spring physics — all animations linear/ease | Animation | Low |
| 35 | No press/scale feedback on buttons | Feedback | Low |
| 36 | No haptic feedback on mobile | Feedback | Low |
| 37 | No video poster images | Media | Low |
| 38 | No video preload metadata | Media | Low |
| 39 | Background texture + noise overlay render on every page | Initial Load | Low |
| 40 | Homepage background image loads on every view | Initial Load | Low |
| 41 | No skeleton for table content in RaceCore | RaceCore | Medium |
| 42 | No skeleton inside dialogs/drawers | RaceCore | Medium |
| 43 | No preloading of drawer content | RaceCore | Low |
| 44 | Full re-fetch after every mutation | RaceCore | Medium |
| 45 | Table sorting/filtering is client-side only | RaceCore | Low |
| 46 | No "no data" state for empty statistics | Entity | Low |
| 47 | No timeline virtualization for long timelines | Entity | Medium |
| 48 | No signed URL caching for attachments | Media | Low |
| 49 | No WebP/AVIF format negotiation | Media | Low |
| 50 | No completion summary for batch operations | Feedback | Low |

---

## 12. Quick Wins

1. **Add `loading="lazy"` to all images** — native lazy loading, zero code changes needed beyond the attribute. (30 min)
2. **Increase staleTime for entity profiles to 2-5 minutes** — users returning within 5 minutes see instant content instead of skeleton. (15 min)
3. **Add a skeleton to Management page** — replace `return null` with a ManagementLayout skeleton. (30 min)
4. **Add query cancellation** — use `AbortController` or React Query's `signal` to cancel in-flight queries on navigation. (1 hour)
5. **Cache search results** — use React Query for search with a 5-minute staleTime. (30 min)
6. **Add `staleTime: Infinity` to experience-function queries** — they're server-aggregated and don't need frequent refetch. (15 min)
7. **Add skeleton-to-content fade transition** — wrap content in a motion.div with opacity transition. (30 min)
8. **Add chart skeletons** — gray placeholder blocks where charts will render. (30 min)
9. **Add progressive image loading** — use `loading="lazy"` + `decoding="async"` + a blur-up placeholder. (1 hour)
10. **Add hover prefetching** — prefetch entity profile data on link hover. (1 hour)

---

## 13. Medium Improvements

1. **Refactor RacerProfile to use a backend experience function** — like `getRacerProfileExperience` (which exists!) as the primary data source, eliminating client-side over-fetching. The function exists but isn't used as the primary loader. (2-3 days)

2. **Refactor PublicMediaGallery to fetch assets by ID** — instead of `MediaAsset.list()` + client filter, fetch only the needed assets. If the SDK doesn't support `filter({ id: { $in: [...] } })`, create a backend function. (1-2 days)

3. **Implement code splitting** — use `React.lazy` + `Suspense` for route-level components. Prioritize heavy deps (recharts, react-leaflet, react-quill, three.js). (2-3 days)

4. **Implement stale-while-revalidate** — use React Query's `keepPreviousData` for paginated lists and increase staleTime for entity profiles. (1 day)

5. **Add optimistic UI for key mutations** — entries, results, claims, profile edits. Show the result immediately, reconcile with server response. (2-3 days)

6. **Add virtualization for long lists** — use `react-window` or similar for entries, results, standings, timelines. (2-3 days)

7. **Add image optimization pipeline** — generate thumbnail/preview variants, use srcset for responsive images, implement blur-up loading. (3-4 days)

8. **Add search result caching and incremental rendering** — cache results, render categories as they complete, cancel previous queries. (1-2 days)

9. **Add scroll position preservation** — use `useScrollRestoration` or manual scroll position caching for entity profiles. (1 day)

10. **Add prefetching on link hover** — prefetch entity profile data when the user hovers over a link for >200ms. (1 day)

11. **Add cache persistence across sessions** — use `persistQueryClient` with localStorage/sessionStorage for non-sensitive data. (1 day)

12. **Add progress indicators for multi-step loads** — show "Loading 3 of 17..." or a progress bar for heavy page loads. (1 day)

---

## 14. Major Improvements

1. **Server-side filtering for all entity profile data.** The root cause of the performance problem is that entity profiles fetch all records and filter client-side. Every entity profile should use a backend experience function (like `getSeriesExperience`, `getTrackExperience`) that aggregates and filters server-side. The functions exist for Series, Track, Vehicle, Sponsor, Event, Team, RacerProfile — but RacerProfile and TeamProfile still use the client-side over-fetching pattern. Migrating these to the experience-function pattern is the single biggest performance improvement. (1 week)

2. **Server-side search.** The current search fetches 1,800 records and filters client-side. A backend search function that accepts a query string and returns filtered results server-side would reduce the payload from 1,800 records to ~40. (3-4 days)

3. **Image CDN with on-the-fly resizing.** A proper image pipeline that generates thumbnails, responsive variants, and WebP/AVIF formats on demand. This would dramatically reduce media load times and bandwidth. (1 week)

4. **Code splitting and lazy loading strategy.** Route-level lazy loading for all pages, with shared chunk splitting for heavy dependencies. This would reduce initial bundle size and improve first load significantly. (1 week)

5. **Optimistic UI framework.** A consistent optimistic UI pattern for all mutations — show the result immediately, reconcile with server, rollback on error. This would make every interaction feel instant. (1 week)

---

## 15. Launch Blockers

1. **RacerProfile downloads the entire database.** The most visited page type on the platform is also the slowest. At scale, every racer profile visit will take several seconds. **Must fix before launch** — use the existing `getRacerProfileExperience` function as the primary loader.

2. **PublicMediaGallery downloads ALL media assets.** Every media gallery on every entity profile over-fetches. **Must fix before launch** — fetch only needed assets by ID.

3. **No image lazy loading.** Pages with many images (media galleries, entity profiles with hero images) will be slow and bandwidth-heavy. **Must fix before launch** — add `loading="lazy"` at minimum.

4. **Search fetches 1,800 records per keystroke.** At scale, search will be sluggish and bandwidth-heavy. **Should fix before launch** — cache results, add query cancellation.

5. **Management page shows blank screen while loading.** Admin's first impression is a blank page. **Must fix before launch** — add skeleton.

6. **No code splitting.** First load will be slow with the entire app in the bundle. **Should fix before launch** — at minimum, lazy-load heavy dependencies (recharts, react-leaflet, three.js).

7. **staleTime 30s is too short for entity profiles.** Users returning to a profile after 31 seconds see a skeleton. **Should fix before launch** — increase to 2-5 minutes for entity profiles.

---

## 16. Production Readiness

### 16.1 Is the Platform Fast Enough for Launch?

**No.** The platform has excellent perceived-performance patterns (transitions, skeletons, tab keep-alive, fallback data) but is undermined by critical data-loading problems. The RacerProfile over-fetching issue alone will make the most visited page type feel sluggish at scale.

### 16.2 What's Fast

- **Homepage** — instant render from fallback data, 2-minute cache
- **Page transitions** — smooth, well-timed
- **Tab keep-alive** — bottom nav tabs switch instantly with preserved state
- **Skeleton loaders** — present on most entity profiles
- **BurnoutSpinner** — branded, on-theme loading indicator
- **RaceCore queries** — event-scoped, not over-fetching
- **Experience functions** — Series, Track, Vehicle, Sponsor, Event use server-side aggregation (correct pattern)
- **Invalidation contract** — deterministic cache clearing
- **React Query defaults** — sensible (retry 1, no refetch on focus)

### 16.3 What's Slow

- **RacerProfile** — downloads entire database, filters client-side
- **TeamProfile** — same over-fetching pattern
- **PublicMediaGallery** — 3-step waterfall + over-fetches all assets
- **Search** — 1,800 records per keystroke, no caching
- **EventProfile** — double-load waterfall on failure
- **Management** — blank page while loading
- **Images** — no lazy loading, no optimization, no progressive loading
- **Initial load** — no code splitting, entire app in bundle
- **Return visits** — staleTime too short, no stale-while-revalidate
- **Mutations** — no optimistic UI, full re-fetch after every operation

### 16.4 The Core Problem

The platform has **two data-loading patterns:**

1. **Experience functions** (correct): `getSeriesExperience`, `getTrackExperience`, `getVehicleExperience`, `getSponsorExperience`, `getEventExperience` — server-side aggregation, single call, filtered data. Fast, scalable, correct.

2. **Client-side over-fetching** (incorrect): `getRacerProfilePageData`, `getTeamProfileData`, `getDriverProfileData`, `PublicMediaGallery` — fetch all records, filter client-side. Slow, not scalable, incorrect.

The fix is clear: **migrate all entity profiles to the experience-function pattern.** The functions already exist (`getRacerProfileExperience`, `getTeamExperience`). They're just not used as the primary loader. RacerProfile has the experience function as a *secondary* query alongside the over-fetching primary query — it should be the *only* query.

### 16.5 Perceived Speed Verdict

**Current state: 51/100 — The platform looks fast but feels slow when data loads.** The animation and transition layer is excellent, but the data layer undermines it. Users will see smooth transitions, then stare at skeletons while the database downloads.

The platform will be fast enough for launch once:
1. RacerProfile and TeamProfile use experience functions as primary loaders
2. PublicMediaGallery fetches only needed assets
3. Images use lazy loading
4. Search caches results and cancels previous queries
5. Management page has a skeleton
6. staleTime is increased for entity profiles
7. At least heavy dependencies are code-split

These require moderate effort but are achievable with the current architecture. The performance patterns are solid; the data-loading strategy needs to be unified around the experience-function pattern that already exists for half the entity types.

### 16.6 Psychological Performance

**Does the platform feel immediate?** No. The transitions feel immediate, but the data loads don't. Users wait for skeletons on entity profiles, wait for search results, and wait for mutations to confirm.

**Does it feel sluggish?** Yes, on entity profiles (especially RacerProfile at scale) and search. The over-fetching pattern means every page load downloads more data than needed, and the short staleTime means returning users re-wait.

**Does it communicate progress?** Partially. Skeletons communicate "loading" but not "how much longer." Spinners communicate "working" but not progress. No multi-step load indicators. No progress bars.

**Does it reduce uncertainty?** Partially. Skeletons show what's coming (structure), but not when. No "loading 3 of 17 queries" indicator. No estimated time. Users don't know if they're waiting 1 second or 10 seconds.

### 16.7 Final Verdict

**The platform has excellent perceived-performance engineering but critical data-loading problems that will make it feel slow at scale.** The gap between the smooth transition/animation layer and the heavy data-loading layer is the biggest performance risk. The fix is not a rewrite — it's migrating the remaining entity profiles to the experience-function pattern that already exists for half the platform.

---

*End of audit. This report is read-only. No code was modified, no files were created (other than this report), no data was written.*