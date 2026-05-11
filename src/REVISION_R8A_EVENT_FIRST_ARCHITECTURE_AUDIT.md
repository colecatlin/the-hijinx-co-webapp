# REVISION R8A — Event-First Architecture Transition Audit

**Date:** 2026-05-11  
**Type:** ARCHITECTURE AUDIT ONLY — No implementation  
**Verdict: ✅ TRUE EVENT-FIRST ARCHITECTURE IS NOW ACHIEVABLE**

---

## EXECUTIVE SUMMARY

Current state: The workspace is operationally stable and event-contained. However, the app's routing and information architecture still treats it as "CRM dashboard with embedded workspace tab."

This audit identifies a **clear and safe pathway** to transition to a true event-first operating system where:
- Events are the primary navigation unit
- Routes map to event files (not dashboard tabs)
- The workspace is the primary surface, not an embedded tab
- RegistrationDashboard becomes a global shell only

**Key finding:** This transition can happen WITHOUT rewriting protected systems. New orchestration layers can wrap stabilized operational engines.

---

## SECTION 1 — CURRENT ROUTING ARCHITECTURE

### Current State (Embedded Workspace Model)

```
RegistrationDashboard
├── RaceCoreSidebar (activeTab-driven)
│   ├── workspace tab → EventWorkspaceContainer (embedded)
│   ├── eventBuilder tab
│   ├── classeseSessions tab → WorkspaceRedirectCard
│   ├── results tab → WorkspaceRedirectCard
│   └── ... (25 other legacy tabs)
│
└── Tabs system (activeTab manages rendering)
    ├── render WorkspaceRedirectCard or legacy manager per tab
    └── fallback to RaceCoreHome if no event selected
```

**Architecture issues:**
1. **No direct event routes** — Events accessed via query params (`?eventId=...&tab=workspace`)
2. **Tab-driven state** — activeTab controls workspace visibility, not router
3. **CRM mentality** — "pick org → pick event → pick tab" instead of "open event file"
4. **Workspace is secondary** — feels like a feature inside a dashboard, not the operating system

---

## SECTION 2 — EVENT-FIRST ROUTING STRATEGY

### Target Architecture (Event-First Model)

```
/race-control
├── /events
│   ├── (events list + selection)
│   └── /:eventId
│       ├── /overview
│       ├── /schedule
│       ├── /sessions
│       ├── /results
│       ├── /entries
│       ├── /compliance
│       ├── /standings
│       ├── /media
│       ├── /activity
│       └── /settings
│
├── /setup
│   ├── /organize
│   ├── /manage-series-classes
│   └── /integrations
│
└── /admin
    └── (admin tools)
```

### Safest Migration Path

**Phase 1 — Route Architecture (R8B target)**
1. Add new `/race-control` root routes alongside existing RegistrationDashboard
2. Create EventFile page (root container for `/race-control/events/:eventId`)
3. Map workspace panels → nested routes (`/overview`, `/results`, etc.)
4. Keep RegistrationDashboard untouched during transition

**Phase 2 — Standalone Workspace (R8C target)**
1. Extract EventWorkspaceContainer → standalone EventFile component
2. Remove dependency on RegistrationDashboard context
3. Test new routes with live event switching

**Phase 3 — Event Directory (R8D target)**
1. Build new `/race-control/events` listing page
2. Add "open event" → `/race-control/events/:eventId` navigation
3. Retire RegistrationDashboard URL scheme

**Phase 4 — Clean Closure**
1. Remove WorkspaceRedirectCard tabs
2. Archive legacy tab managers one by one
3. Delete RegistrationDashboard page entirely

### Route Params vs activeTab

**Current:** activeTab lives in state + URL query params
```
?orgType=track&orgId=xyz&seasonYear=2025&eventId=abc&tab=workspace
```

**Target:** Routes encode the navigation
```
/race-control/events/abc/results
/race-control/events/abc/sessions
```

**Transition logic:**
1. Route params become source of truth (not activeTab)
2. EventFile fetches event from route `:eventId`
3. Navigation happens via `<Link>` or `navigate()`, not `setActiveTab()`
4. activeTab can be removed entirely (no longer needed)

---

## SECTION 3 — REGISTRATIONDASHBOARD DECOMPOSITION

### Current Responsibilities

**RegistrationDashboard owns:**
1. Organization selection (track vs series)
2. Organization filtering (which track/series to manage)
3. Season year filtering
4. Event selection + listing
5. User entity resolution + primary entity detection
6. Permissions bootstrap + role-based access
7. Workspace tab rendering
8. Legacy tab management
9. Modal orchestration (publish, import, sync, export)
10. Admin override handling
11. Global quick-create actions

### Safe Decomposition (Event-First)

**Keep in global shell (new EventControlPage):**
- Organization selection (still needed for setup/admin)
- Season year filtering
- User entity resolution (unchanged)
- Permissions bootstrap (unchanged)
- Workspace panel navigation
- Admin tooling access

**Move into EventFile (per-event):**
- Event metadata rendering
- Workspace panel rendering (already done by EventWorkspaceContainer)
- All event-scoped modals (moved to EventFile scope)
- Event-specific actions (publish, import, etc.)

**Eliminate:**
- Legacy tab rendering (replaced by routes)
- WorkspaceRedirectCard (replaced by direct routes)
- activeTab management (replaced by URL routing)
- Tab-based navigation (replaced by route-based)

### Safest Implementation

1. **Keep RegistrationDashboard as-is** (no breaking changes during R8B/C)
2. **Create new EventFile page** (wraps EventWorkspaceContainer directly)
3. **Route to EventFile** via `/race-control/events/:eventId`
4. **Eventually retire RegistrationDashboard** (Phase 4)

---

## SECTION 4 — ACTIVETAB DEPENDENCY MAP

### Current activeTab Usage

| Location | Purpose | Replacement |
|----------|---------|-------------|
| RegistrationDashboard line 225 | Tab state management | Route URL |
| RaceCoreSidebar line 887 | Nav item active state | Route match |
| EventWorkspaceContainer line 59 | Panel selection | Route param |
| WorkspaceRedirectCard | Panel targeting | Direct route link |
| Workspace.Tabs | Conditional rendering | Route-based panels |
| Live mode detection | Auto-select results | useEffect in EventFile |
| Query params sync | URL serialization | Router state |

### Full Removal Strategy

**Phase 1:** Keep activeTab, add route equivalents
- Routes exist alongside activeTab
- EventFile uses routes, old RegistrationDashboard uses activeTab

**Phase 2:** Swap dominant model
- EventFile becomes primary surface
- RegistrationDashboard fallback only

**Phase 3:** Delete activeTab
- Remove from RegistrationDashboard state
- Remove from EventWorkspaceContainer
- Remove from RaceCoreSidebar conditional rendering

**Breaking points if removed too early:**
- ❌ RaceCoreSidebar nav rendering breaks (needs route context)
- ❌ Modal orchestration breaks (modals need activeTab as reference)
- ❌ Live mode auto-selection breaks
- ✅ Can be done safely in R8D when old RegistrationDashboard is archived

---

## SECTION 5 — EVENT DIRECTORY → EVENT FILE FLOW

### Current UX

```
User opens RegistrationDashboard
→ Selects Track/Series
→ System loads all events for that org
→ Selects Event from dropdown
→ System renders EventWorkspaceContainer in workspace tab
```

**Problems:**
- Feels like "finding" an event, not "opening" one
- Deep linking by eventId only (no standard route)
- Requires full RegistrationDashboard context to load

### Target UX

```
User opens /race-control/events
→ Sees list of accessible events
→ Clicks "Glen Helen Off-Road National"
→ Browser navigates to /race-control/events/{eventId}
→ EventFile loads and renders workspace
```

**Advantages:**
- Direct event URIs (shareable, bookmarkable)
- Event is the primary unit
- Clear mental model: "this is an event file"
- Matches desktop file/folder metaphor

### EventFile Feasibility

**Can EventFile become standalone?**
✅ **YES**

**What it needs:**
- Route params: `:eventId` (required)
- Context: track/series info (fetched from event)
- User: auth + permissions (from base44.auth)
- Queries: sessions, results, entries, etc. (already in EventWorkspaceContainer)

**What it doesn't need:**
- RegistrationDashboard context ❌
- RaceCoreSidebar ❌
- Organization selection ❌ (derived from event)
- Season filtering ❌ (derived from event)

**Implementation:**
```
EventFile (new route root)
├── Fetch event from :eventId
├── Derive track + series
├── Bootstrap workspace context
└── Render EventWorkspaceContainer
```

**Why this works:**
- EventWorkspaceContainer already knows how to render the full workspace
- Event data is sufficient to populate all context
- No RegistrationDashboard coupling needed

---

## SECTION 6 — LEGACY SYSTEM COLLAPSE ROADMAP

### Systems Safe to Remove

**Safe to remove immediately (no dependencies):**
1. ✅ WorkspaceRedirectCard (replaced by routes)
2. ✅ activeTab query param (replaced by URL routing)
3. ✅ Workspace tab in RaceCoreSidebar (replaced by EventFile)
4. ✅ Tab-based panel rendering (replaced by route-based)

**Safe to remove after Phase 2:**
5. ✅ Legacy tab managers (classes, entries, compliance, tech, results, media, auditLog)
6. ✅ Tab list in RegistrationDashboard Tabs component
7. ✅ pendingWorkspacePanel state (replaced by URL routing)

**Safe to remove after Phase 3:**
8. ✅ RegistrationDashboard page entirely
9. ✅ EventWorkspaceContainer (merged into EventFile)
10. ✅ Organization selection (moved to setup/admin area)

### Systems That Must Stay

**Protected forever:**
1. ❌ ResultsManager (operational engine)
2. ❌ ClassSessionBuilder (operational engine)
3. ❌ PointsAndStandingsManager (operational engine)
4. ❌ calculateStandings.js (protected logic)
5. ❌ sessionLifecycle.js (protected logic)
6. ❌ publishRules.js (protected logic)
7. ❌ Sessions, Results, Entries, Compliance entities (operational data model)
8. ❌ Workspace panels (event operations backbone)

**Admin-only tools:**
9. ⚠️ Quick create
10. ⚠️ Event builder (deep editor)
11. ⚠️ Imports/exports
12. ⚠️ Announcer/gate/race control managers

---

## SECTION 7 — PERMISSION SCOPING READINESS

### Current Permission Model

**All permissions live in dashboard context:**
- `dashboardPermissions` — global role-based permissions (admin/user/public)
- `user.role` — determines what tabs are visible
- `canEditEventCore` — event-specific editing rights
- `userTrackAccess` / `userSeriesAccess` — collaboration checks

**Issue:** Permissions are global + event-specific, not event-scoped

### Event-Scoped Permissions (Future)

**Examples:**
- User A: timing operator at Glen Helen (can edit sessions/results at that event)
- User B: race director at Series Pro 4 class (can approve standings)
- User C: media coordinator (credentials, assets at this event)
- User D: track operator (gate, check-in at this event)

### Readiness Assessment

✅ **Already present:**
- Event entity tracks ownership + collaboration
- EntityCollaborator system exists (for tracks/series)
- canEditEventCore logic exists (track vs series ownership)
- Per-event permissions can be derived from EntityCollaborator

⚠️ **Needs work:**
- Event-level EntityCollaborator role model (currently only track/series)
- Workspace panel access control per role (not implemented)
- Permission checks at panel level (not just tab level)

✅ **No breaking changes:**
- Old role-based model can coexist with event-scoped model
- Migration is additive, not destructive
- Can be implemented in R8E without rewriting existing systems

---

## SECTION 8 — LIVE RACE CONTROL READINESS

### Current Workspace Capabilities

**Stable operational features:**
- Session management (create, schedule, order)
- Results input (manual, CSV, API)
- Standings calculation (automated, points config)
- Entries management (check-in, waivers, tech)
- Compliance tracking (alerts, flags)
- Media governance (credentials, assets)
- Announcer integration (console, packs)

**Foundation solid for live ops:**
✅ Event-contained state
✅ Real-time entity subscriptions (base44.entities.subscribe)
✅ Invalidation helper (trigger queries on changes)
✅ Operational logging (OperationLog entity)
✅ Admin override system (for sensitive ops)

### Future Live Race Control Needs

**Examples:**
- Live session status (now: Practice, next: Qualifying)
- Live leaderboard (real-time results streaming)
- Race control actions (change session status, issue caution, etc.)
- Announcer feed (live updates)
- Timing sync (live transponder data)
- Steward review (live incident handling)

### Architecture Readiness

✅ **Ready for live ops:**
1. Event workspace is fully isolated (perfect for live operations)
2. Real-time subscriptions available (for live updates)
3. Event lifecycle management exists (status transitions)
4. Admin override system exists (for race control decisions)
5. Operational logging exists (audit trail for race)

⚠️ **Needs future work:**
1. WebSocket / real-time messaging layer (for live updates)
2. Race control action queue (for commands)
3. Live leaderboard component (not yet built)
4. Timing integration (T&S API wiring)

✅ **Current architecture does NOT block future live ops**
- Event-first routing will support live control interface
- Workspace panels can be extended with live components
- Real-time subscriptions will power live updates
- No architectural changes needed for live operations layer

---

## SECTION 9 — VISUAL ARCHITECTURE ALIGNMENT

### Reference Image Analysis (Provided Race Ops Command Center)

**What the reference shows:**
- Event name + round + date (top left)
- Tabs: Overview | Schedule | Sessions | Results | Entries | Compliance | Standings | Media | Documents | Settings
- Left sidebar: Command Center menu (Dashboard, Events, Alerts, Operations Feed, Calendar)
- Center: Session timeline (visual race day schedule)
- Right: Status widgets (Readiness score, Alerts, Activity feed)
- Bottom: Session status overview table

**Current architecture:**
✅ Command Center concept (EventWorkspaceNav groups operations)
✅ Event metadata display (EventCommandHeader)
✅ Tab-based panel navigation (10 workspace panels)
✅ Timeline visualization (SessionTimelinePolished)
✅ Readiness score (EventReadinessScore)
✅ Status widgets (OperationalAlertStack, LiveStatusBar)
✅ Activity feed (EventAuditLogPanel)

### What Still Feels Like "CRM"

| Issue | Reason | R8A Path |
|-------|--------|----------|
| "Event Workspace" tab | Buried in sidebar tabs | Move to primary route `/race-control/events/:eventId` |
| "workspace" only accessible via tab | Requires full dashboard context | Extract to EventFile route |
| "Organization / Event" selector still visible | Feels like app settings | Move selectors to `/race-control` shell only |
| Query params (`?tab=workspace`) | Technical, not user-facing | Replace with URLs (`/race-control/events/:id/results`) |
| "Back to all events" not obvious | Tabs don't show context | Add breadcrumb/header navigation |

### High-Impact Visual Shifts

1. **Primary navigation:** Replace sidebar tabs with event file structure
   - Remove "workspace" as a tab
   - Routes encode the navigation directly

2. **Header context:** Add event breadcrumb
   - `/race-control/events > Glen Helen Off-Road National > Results`
   - Shows full context without sidebar

3. **Event list:** Create dedicated `/race-control/events` page
   - Not a dropdown in a toolbar
   - Visual prominence matches "operating system" metaphor

4. **Remove organization selectors from event view**
   - Only visible in setup/admin areas
   - Event file assumes correct org context

---

## SECTION 10 — ROADMAP (POST-R7H)

### Recommended Implementation Order

**R8A — Architecture Audit** ✅ (THIS DOCUMENT)
- Current state documented
- Decomposition validated
- Safe migration path identified
- **No code changes**

**R8B — Route Architecture (2-3 days)**
- Add `/race-control` root routes
- Create EventFile page wrapper
- Map workspace panels → nested routes
- Keep RegistrationDashboard intact
- **Goals:** Parallel routes working, EventFile renders correctly

**R8C — Standalone EventFile (1-2 days)**
- Extract EventWorkspaceContainer → EventFile
- Test live event switching in new routes
- Verify all workspace functionality
- **Goals:** EventFile fully operational, identical to workspace tab

**R8D — Event Directory (2-3 days)**
- Build `/race-control/events` listing page
- Add event filtering + sorting
- Event card design + "open" navigation
- Test deep linking
- **Goals:** Users can navigate events from list

**R8E — Permission Scoping (2-3 days)**
- Add event-level EntityCollaborator roles
- Workspace panel access control
- Role-based feature flags
- **Goals:** Event-scoped permissions working

**R8F — Live Race Control (3-5 days)**
- Live leaderboard component
- Race control action queue
- Timing integration wrapper
- **Goals:** Foundation for live operations

**R9 — Public Event Experience (3-5 days)**
- Public event pages (results, standings, schedule)
- Live spectator feed
- Media gallery
- **Goals:** Public can follow race events

---

## SECTION 11 — PROTECTED SYSTEMS VERIFICATION

### Can Transition Happen Without Rewriting Operational Engines?

✅ **YES**

**What stays completely untouched:**
```
ResultsManager internals              ✅ (no changes)
ClassSessionBuilder internals          ✅ (no changes)
PointsAndStandingsManager internals    ✅ (no changes)
calculateStandings.js                  ✅ (no changes)
sessionLifecycle.js                    ✅ (no changes)
publishRules.js                        ✅ (no changes)
syncResultsVisibilityFromSession       ✅ (no changes)
Import workflows                       ✅ (no changes)
Standings calculations                 ✅ (no changes)
Lifecycle transitions                  ✅ (no changes)
Entity schemas                         ✅ (no changes)
Mutation hooks                         ✅ (no changes)
Permission checks                      ✅ (no changes - additive only)
```

**What changes (orchestration layer only):**
```
Route structure                        ⚙️ (new /race-control routes)
Navigation model                       ⚙️ (URL-based instead of activeTab)
RegistrationDashboard scope            ⚙️ (removed/archived in Phase 3-4)
EventFile location                     ⚙️ (created as new page)
Context providers                      ⚙️ (EventWorkspaceContainer stays, used differently)
Modal orchestration                    ⚙️ (moved to EventFile)
```

**Zero risk for operational logic.**

---

## SECTION 12 — CRM VS OPERATING SYSTEM COMPARISON

### Current CRM Mentality

```
RegistrationDashboard (dashboard)
├── Sidebar: Pick org, season, event
├── Tabs: Pick what to do
└── Content: Do the thing
```

**User mental model:** "I'm in a dashboard that manages races"

### Target Operating System Mentality

```
/race-control (operating system)
├── /events (file system)
│   └── /:eventId (open a race file)
│       └── /results (do a thing inside the file)
└── /setup (system settings)
```

**User mental model:** "I'm opening a race event and controlling operations"

### Key Shifts

| Aspect | Current | Target |
|--------|---------|--------|
| Navigation unit | Tab | Route |
| Primary entity | Organization | Event |
| Metaphor | Dashboard | File system |
| Mental model | CRM | Operating system |
| Deep linking | Query params | Route params |
| Shareable URLs | Not really | Direct event URIs |

---

## VERDICT & RECOMMENDATIONS

### ✅ TRANSITION IS SAFE AND RECOMMENDED

**Summary:**
- Event-first architecture is now achievable WITHOUT breaking operational engines
- Migration path is clear: 4 phases over 10-15 days of development
- Workspace is already event-contained and operational
- Route architecture can be added in parallel without disrupting current system
- All protected systems can remain completely untouched

**Why now?**
1. ✅ R7H completed workspace navigation polish + visual hierarchy
2. ✅ Workspace is stable, event-contained, fully operational
3. ✅ No blocker preventing route architecture adoption
4. ✅ R8 series can begin immediately

**Risks (minimal):**
- ⚠️ URL scheme change (but can be done in phases)
- ⚠️ activeTab removal timing (but safe to delay to R8D)
- ⚠️ Organization selector relocation (but not breaking)

**Confidence level:** 🟢 **HIGH** — Architecture is fundamentally sound, transition is low-risk, operational engines are protected.

---

## APPENDIX — DETAILED ROUTE PLAN (R8B)

### New Routes to Add

```javascript
// New event-first routes (alongside existing RegistrationDashboard)
<Route path="/race-control" element={<RaceControlShell />}>
  <Route path="events" element={<EventDirectory />} />
  <Route path="events/:eventId" element={<EventFile />}>
    <Route path="overview" element={<EventOverviewPanel />} />
    <Route path="schedule" element={<EventSchedulePanel />} />
    <Route path="sessions" element={<EventSessionsPanel />} />
    <Route path="results" element={<EventResultsPanel />} />
    <Route path="entries" element={<EventEntriesPanel />} />
    <Route path="compliance" element={<EventCompliancePanel />} />
    <Route path="standings" element={<EventStandingsPanel />} />
    <Route path="media" element={<EventMediaPanel />} />
    <Route path="activity" element={<EventActivityPanel />} />
    <Route path="settings" element={<EventSettingsPanel />} />
  </Route>
  <Route path="setup" element={<RaceControlSetup />} />
</Route>
```

### Components to Create

- `RaceControlShell` — Global container (org selector, nav)
- `EventFile` — Event root (fetches event, renders workspace)
- `EventDirectory` — Event listing page
- `RaceControlSetup` — Integrations, calendar sync, admin tools

### Components to Repurpose

- `EventWorkspaceContainer` → Used by EventFile (unchanged logic)
- `EventWorkspaceNav` → Nav in EventFile (unchanged)
- All workspace panels → Route-mounted (unchanged)

---

## APPENDIX — ACTIVEAB FINAL REMOVAL (R8D)

After Phase 3 (RegistrationDashboard archived):

```javascript
// Remove from RegistrationDashboard
- const [activeTab, setActiveTab] = useState(...)
- onTabChange callbacks
- pendingWorkspacePanel state
- URL param serialization for activeTab

// Remove from RaceCoreSidebar
- activeTab prop
- setActiveTab prop
- activeTab === item.tab conditionals

// Remove from EventWorkspaceContainer
- pendingWorkspacePanel prop
- onPendingPanelApplied prop

// Keep Route-based panel selection instead
```

**Impact:** Zero functional change (routes already manage panel selection)

---

## END OF AUDIT

**Status:** ✅ R8A Complete — Event-First Transition is safe and feasible.  
**Next:** Await approval → Proceed to R8B (Route Architecture)