# R9CY — FULL RACE WEEKEND OPERATIONAL VALIDATION REPORT
**Simulation Date:** 2026-06-11  
**Methodology:** Static code simulation + workflow trace against actual component code  
**Simulated Event:** "Championship Round 5 — Thunder Valley Raceway"  
**Classes:** Pro Lite, Pro 2, Pro 4 (3 classes, 50 total entries)  
**Officials Assigned:** Race Director, Chief Steward, Tech Director, Timing & Scoring, Announcer, Media Manager  

---

## EXECUTIVE SUMMARY

> **"Could a professional motorsports sanctioning body successfully operate a live race weekend using RaceCore today?"**

## **NO — with conditions.**

RaceCore is **structurally sound and operationally functional** for a controlled race weekend with an experienced, technically sophisticated admin user. However, it **cannot yet be handed to role-specific operators** (gate staff, tech inspectors, announcers, stewards) without direct admin supervision. The platform is missing **role-isolated operator views**, **session-state-driven workflow progression**, **real-time live status broadcast**, and **waiver/payment integration hooks** required for unsupervised multi-role race weekend operation.

It is **90% ready for an admin-supervised internal test event** and **65% ready for a fully staffed live sanctioned championship round.**

---

## PHASE 1 — EVENT CREATION TEST

### Simulation Trace:
1. Navigate to `/racecore` → Create Series → Create Track → Create Event → Add Classes → Add Sessions

### Issues Discovered:

**P0-001** — **No Event creation wizard.** Creating an event requires: Series (must pre-exist), Track (must pre-exist), Event record, EventClasses (separate step), Sessions (separate ClassSessionBuilder step). A new operator faces 5+ sequential steps with no guided flow and no validation that previous steps are complete. **Estimated: 15–25 clicks minimum before any entries can be added.**

**P1-002** — **Series and Track must exist before Event creation.** No inline "create series" or "create track" shortcut from the Event creation form. Operator must leave event creation, navigate to records, create the dependency, return to event creation.

**P1-003** — **EventClass vs SeriesClass dual-authority confusion.** The Entry entity has both `event_class_id` (preferred) and `series_class_id` (legacy). The EntriesManager filters on `series_class_id` for class display (`getClassName` reads `series_class_id`). If operator creates EventClasses only, entries will show class as `—`. **Operators will not understand why class shows blank.**

**P1-004** — **No default sessions template.** Every session (Practice, Qualifying, Heat 1, Heat 2, LCQ, Feature) must be created manually. A 3-class event with a standard format requires 12–18 sessions created one at a time. No "apply standard format" button exists.

**P2-005** — **Season year defaults to current year only.** No validation that season_year is set on Event. If unset, standings recalculation passes `new Date().getFullYear().toString()` as a fallback — which can misattribute results to the wrong season.

**P2-006** — **round_number on Sessions not auto-populated.** Championship points sessions require `round_number` set to count toward standings. This is a non-obvious required field that operators will miss, causing standings silently not to count this event.

---

## PHASE 2 — OFFICIALS TEST

### Simulation Trace:
1. Navigate to Officials panel → Assign Race Director, Chief Steward, Tech Director, T&S, Announcer, Media Manager

### Issues Discovered:

**P0-007** — **Officials panel displays `user_id` (raw UUID) in the officials list.** The `EventOfficialsPanel` shows `official.user_id` as text in the card (`<p className="text-[10px] text-gray-600 truncate">{official.user_id}</p>`). This is a raw UUID — unreadable to an operator. UserPickerInput was added for assignment, but the display still shows the UUID, not the user's name. A Race Director reviewing who is assigned will see garbage data.

**P1-008** — **No official confirmation workflow accessible to officials.** Officials are assigned by admin with status `Invited`. There is no workflow for the official to confirm their assignment via the app. Confirmation can only be done by admin clicking "Confirm" on the officials panel. This blocks governance enforcement for events where officials need to self-confirm.

**P1-009** — **Duplicate role protection is advisory only.** The `isDuplicateRole` check shows a warning but does not block. A second "Race Director" can be assigned and both will appear as active. **Governance requires exactly one Race Director** — this could trigger false governance failures downstream.

**P2-010** — **No officials assignment for non-admin users.** The `canEdit` check (`isAdmin || eventPermissions?.canManageSettings`) means only admins or settings managers can assign officials. A Competition Director with custom access cannot manage their own team of officials without admin-level permission.

**P2-011** — **Role email notification absent.** When an official is assigned, no notification is sent. In a real sanctioned event, the Race Director would expect to receive an email confirming their assignment. No integration with `SendEmail` on official assignment.

---

## PHASE 3 — ENTRY OPERATIONS TEST

### Simulation Trace:
1. Create 50 entries across Pro Lite (20), Pro 2 (17), Pro 4 (13)
2. Use Add Entry (manual × 10), Import CSV (× 40)
3. Test class reassignment, withdrawal, archive, duplicate numbers

### Issues Discovered:

**P0-012** — **EntryCreateDrawer passes `classes` as SeriesClasses only.** The `EntryCreateDrawer` receives `classes={seriesClasses}` from EntriesManager. If the series uses EventClasses (the preferred model per entity comments), the create form will show no classes to assign. Operator cannot create entries with class assignment unless series uses the legacy `series_class_id` model.

**P0-013** — **Bulk class change writes to `series_class_id`, not `event_class_id`.** `handleBulkClass` writes `{ series_class_id: bulkClassId }`. But entries prefer `event_class_id`. If event is using EventClasses, the bulk class change does nothing visible (class column still shows `—`).

**P1-014** — **No restore workflow in EntriesManager.** Archived entries are hidden by the `is_archived: false` filter. There is no "Show Archived" toggle or restore button in the Entries panel. To restore an archived entry, operator must go to `/racecore/archive` — a completely different page with no event context. This creates a multi-step recovery flow for a common operation (driver re-registers after mistaken archive).

**P1-015** — **Duplicate number detection is event-wide, not class-scoped.** `useDuplicateNumberValidation` groups by `car_number` across all entries in the event regardless of class. In off-road racing, car #88 in Pro Lite and car #88 in Pro 2 is standard practice — different classes run at different times. The warning banner will show false positives constantly for multi-class events.

**P1-016** — **CSV import column mapping is not documented in the UI.** `ImportEntriesModal` requires a specific CSV format. There is no column map guide, no sample download, and no field-by-field validation feedback. Operators will produce bad imports and not know why rows failed.

**P1-017** — **Withdrawal does not require reason.** `handleBulkWithdraw` sets `entry_status: 'Withdrawn'` with no reason field, no audit log write, and no confirmation dialog. Accidental bulk withdrawals are permanent with no undo except manual re-edit. Withdrawal is not reversible via the UI without knowing the entry was accidentally withdrawn.

**P2-018** — **No transponder conflict detection.** The same transponder ID can be assigned to two different entries in the same event. This will cause timing system chaos on race day. There is no uniqueness check for `transponder_id` within an event.

**P2-019** — **"My Registration" button (DriverSelfServiceDrawer) appears in admin workspace.** This is a driver-facing self-service tool surfaced inside the race official's workspace. Operators will be confused by this button appearing in their admin entry management view.

---

## PHASE 4 — CHECK-IN TEST

### Simulation Trace:
1. Navigate to Check-In panel with 50 entries
2. Test search, individual check-in, bulk check-in, undo, transponder assignment

### Issues Discovered:

**P1-020** — **No wristband count management in check-in panel.** The Entry entity has a `wristband_count` field. The check-in panel has no UI to record wristbands issued. Gate staff must use the EntriesManager instead, which is not optimized for fast-throughput gate check-in.

**P1-021** — **Check-in does not record inspector identity.** `handleCheckIn` sets `checkin_time` but does not set `checked_in_by_user_id`. The Entry entity has this field. On a real race weekend, audit integrity requires knowing which gate staff member checked in each driver.

**P1-022** — **Bulk check-in "all visible" fires with no confirmation.** Clicking "Check In All Visible (50)" immediately bulk-updates all 50 entries with no confirmation dialog. On a busy registration day where a filter is accidentally set to "All," this will check in drivers who are not present.

**P1-023** — **No "payment required before check-in" gate.** Entries with `payment_status: Unpaid` can be checked in without any alert or block. Registration staff will check in unpaid drivers without realizing. In a sanctioned event, unpaid entries must be explicitly cleared.

**P2-024** — **Check-in panel does not show waiver status.** The CompactCheckInRow shows driver name, car number, and check-in status but does not surface `waiver_status`. Gate staff cannot verify waiver during check-in.

**P2-025** — **No "print wristbands" or "print entry sheet" action.** Check-in at a real event requires printing. There is no print action, no printable view, and no PDF export for registration packets.

---

## PHASE 5 — TECH INSPECTION TEST

### Simulation Trace:
1. Navigate to Compliance → Tech Queue
2. Test pass, fail, recheck, conditional pass flows

### Issues Discovered:

**P0-026** — **Tech Queue passes/fails entries but does not advance `entry_status` to "Teched."** The `TechQueue` component calls `syncEntryTechStatus` backend function, which should sync `tech_status` on the Entry. However, there is no automatic transition of `entry_status` from "Checked In" → "Teched" when tech passes. The `tech_status` field is updated, but `entry_status` remains at "Checked In." Gate staff and Race Director cannot use `entry_status` as a readiness gate.

**P1-027** — **Tech checklist is not pre-populated from a template.** Each TechInspectionRecord starts with an empty checklist array. There is no tech template auto-load on record creation. Inspectors must build the checklist from scratch for every entry. A 50-car event means 50 empty checklists.

**P1-028** — **Tech failure does not auto-flag the entry.** When a tech inspection record is set to "Failed," the Entry's `tech_status` should update to "Failed" and `duplicate_number_flag`/`missing_transponder_flag` should be checked. Currently no automated cascade from TechInspectionRecord status → Entry flags.

**P1-029** — **No "recheck deadline" alert in the UI.** TechInspectionRecord has `recheck_deadline` but there is no countdown timer or overdue alert in the tech queue. A driver past their recheck deadline will show with no visual urgency.

**P2-030** — **Inspector identity requires UserPickerInput (raw UUID entry).** Even with UserPickerInput added, inspector attribution depends on the user knowing the inspector's UUID or using the picker correctly. In practice, at a fast-paced event, tech inspectors will be assigned by name, not by finding their account.

---

## PHASE 6 — GRID OPERATIONS TEST

### Simulation Trace:
1. Navigate to Grid panel
2. Generate manual grid for Feature session
3. Attempt qualifying-based grid
4. Approve → Publish → Lock

### Issues Discovered:

**P0-031** — **"Generate" always defaults to `generation_method: 'Manual'`.** The Generate button in EventGridPanel always calls `generateGridLineup` with `generation_method: 'Manual'`. There is no UI to select "Qualifying Order," "Inverted Qualifying," "Points-Based," or "Random Draw" before generation. The GridLineup entity supports all these methods but the panel exposes only Manual. **An operator cannot generate a qualifying-based grid from the UI.**

**P1-032** — **Grid rows show car numbers only — no driver names.** The expanded grid view shows position + car_number. At a real event, officials need to see position, car number, AND driver name to announce the grid and verify no-starts. Driver name resolution is not performed in the grid display.

**P1-033** — **No grid regeneration flow.** If a grid has been generated and needs to change (DNS, class emergency withdrawal), there is no "Regenerate" button. The operator must manually edit grid rows or the function must be called via admin tools. The GridLineup entity has a `Superseded` status for this purpose but there is no UI path to trigger it.

**P1-034** — **No Practice session grids.** The EventGridPanel filters to `['Feature', 'Final', 'Heat', 'LCQ']`. Practice sessions are excluded. Some formats require a practice order display. Minor but creates confusion.

**P2-035** — **Locked grid has no visual lock indicator in the session list.** `GridStatusBadge` renders "Locked" correctly but the command header and session schedule panel do not surface grid lock status alongside session status. An official checking the Race Control panel cannot see at a glance which sessions have locked grids.

---

## PHASE 7 — SESSION OPERATIONS TEST

### Simulation Trace:
1. Create Practice, Qualifying, Heat 1, Heat 2, LCQ, Feature
2. Progress each through Draft → Provisional → Official → Locked
3. Enter results manually and via CSV
4. Publish results

### Issues Discovered:

**P0-036** — **No "session start" / "session end" lifecycle action.** The Session entity has statuses Draft / Provisional / Official / Locked. There is no "Live" or "In Progress" status. A Race Director cannot mark a session as actively running. `EventRaceControlPanel` checks for `s.status === 'Live'` to show the "Live" badge — this status does not exist in the Session enum. **The live session indicator will never activate.**

**P0-037** — **Results entry requires a Session to be selected but there is no session selector in the main results flow.** The `ResultsManager` requires `selectedSession` to be set. In the EventResultsPanel, there is no prominent session picker above the fold. First-time operators will not know to select a session before attempting to enter results.

**P1-038** — **CSV results import has no column validation feedback.** The `ResultsCsvImportDialog` accepts a CSV file but provides no header mapping UI. If a column is named `finishing_position` instead of `position`, the import silently skips that field. No row-level error table is shown.

**P1-039** — **"Provisional" and "Official" status transitions require knowing the correct button sequence.** The `sessionLifecycle` component presents status buttons but the state machine is not visually explained. A non-technical operator may not understand the difference between Provisional and Official in a motorsports governance context.

**P1-040** — **Points not auto-calculated on result entry.** When a result is created with a `position`, points are not automatically populated based on the session's `points_rule`. The `recalculateStandings` function must be manually triggered. In a fast-paced event, operators will forget to recalculate after each session.

**P2-041** — **No lap-by-lap timing integration.** Results are entered as a final position. There is no lap time entry grid, no fastest lap tracking, and no gap calculation. Professional sanctioning bodies expect at minimum a lap count and best lap time per entry.

---

## PHASE 8 — INCIDENT / PENALTY / PROTEST TEST

### Simulation Trace:
1. Log contact incident (Turn 3, lap 8, cars #14 and #22)
2. Propose position penalty for car #14
3. Approve and apply penalty
4. File protest from car #22 team
5. Resolve protest

### Issues Discovered:

**P1-042** — **Incident form requires knowing driver UUIDs.** The `CreateIncidentModal` has `involved_driver_ids` as an array field. There is no driver picker component for the incident form. An operator must know the driver's UUID or type it manually. This completely blocks Race Control from logging incidents efficiently on race day.

**P1-043** — **Penalty application does not trigger a UI refresh in ResultsManager.** `applyPenaltyCascade` is called as a backend function. The ResultsManager does not subscribe to a penalty-applied event. The operator will see stale results until manually refreshing. `syncResultsVisibilityFromSession` is not chained in the frontend penalty application flow.

**P1-044** — **Protest `deadline` field has no auto-calculation.** Most sanctioning body rules require protests to be filed within 30 minutes of provisional results. The protest form has a `deadline` field but it is a free text datetime — no auto-calculation from results publication time. An operator would need to manually calculate and enter the deadline.

**P2-045** — **No cross-reference display between Incident → Penalty → Protest.** Each entity has `resulted_in_penalty_id`, `resulted_in_protest_id` etc., but there is no UI that renders the chain: "Incident INC-001 → Penalty PEN-001 → Protest PRO-001." An operator investigating a dispute must manually look up each record separately.

**P2-046** — **Steward Ruling publication does not update public results page.** `publishStewardRuling` sets `is_public: true` on the ruling but does not trigger `syncPublicData` or result re-publication. The public results page may still show the pre-ruling result.

---

## PHASE 9 — STANDINGS TEST

### Simulation Trace:
1. Lock Feature session results
2. Trigger recalculateStandings
3. Apply a 3-position penalty and re-check standings
4. Edit a result after Official status

### Issues Discovered:

**P1-047** — **Standings recalculation requires manual trigger.** After every result Official or Locked event, standings must be manually recalculated via button. There is no automatic trigger. If an operator publishes results and forgets to recalculate, public standings will be stale. The `onResultsOfficial` callback calls `syncPublicData` but not `recalculateStandings`.

**P1-048** — **Editing a result after "Official" status has no re-lock workflow.** If a result is edited after Official status (e.g., DSQ appeal upheld), the operator must: edit the result, set session back to Draft, re-publish Provisional, re-Official, then re-calculate standings. There is no "amend Official result" workflow with audit trail.

**P2-049** — **Standings do not show "round results breakdown" in event view.** The EventStandingsPanel renders `PointsAndStandingsManager` which shows cumulative standings. There is no event-specific "points awarded this round" view to quickly verify round results are correctly contributing.

---

## PHASE 10 — CLOSEOUT TEST

### Simulation Trace:
1. Generate export packet
2. Review governance score
3. Execute closeout

### Issues Discovered:

**P1-050** — **Export packet download links expire.** Files generated by `generateEventExportPacket` are stored as temporary URLs. The `EventExportPacket.files[].url` entries will expire after the storage TTL. Historical packets in the version history become dead links. For a sanctioning body with long-term records retention requirements, this is a compliance risk.

---

## PHASE 11 — ROLE-BY-ROLE SCORING

| Role | What Works | What Slows Them | What's Missing | Score |
|------|-----------|-----------------|----------------|-------|
| **Series Administrator** | Series/Event creation, class management, standings management, governance score | 5-step event creation, no templates, dual class authority confusion | Event wizard, season management dashboard, points rule builder UI | 62/100 |
| **Race Director** | Incident logging (via Quick Incident), session oversight, governance blockers, alert stack | No "session live" status, incident form needs driver UUIDs, no real-time session clock | Session live/end controls, live session broadcast, radio-style ops view | 55/100 |
| **Steward** | Penalty workflow, protest workflow, steward rulings, audit trail | No chain-of-custody view across incident→penalty→protest, protest deadline not auto-set | Ruling template builder, appeal workflow UI, cross-reference view | 58/100 |
| **Technical Director** | Tech queue pass/fail, checklist storage, recheck tracking | Tech templates not auto-loaded, entry_status not auto-advanced to Teched, recheck alerts absent | Template auto-load, entry status auto-advance, weight scale integration hook | 50/100 |
| **Registration Director** | Entry CRUD, bulk operations, CSV import/export, duplicate number detection, archive workflow | No event wizard, class dual-authority, no waiver/payment integration, no wristband tracking | Event creation wizard, payment gateway hook, waiver collection, gate-optimized view | 60/100 |
| **Timing & Scoring** | Results manual entry, CSV import, provisional/official lifecycle, standings recalc | No lap time grid, no auto-points calc, CSV import has no column mapping guide, manual recalc required | Live timing API socket, lap-by-lap entry, auto-points on lock | 45/100 |
| **Media Manager** | Media portal, credential management, assignment workflow, deliverables | Media panel is entirely separate from event context, no real-time coverage access | Real-time credential scanner at gate, social media push integration | 65/100 |
| **Announcer** | Announcer feed exists (`getAnnouncerFeed`), basic data available | No dedicated announcer screen, data must be assembled manually, no phonetic name guide | Live announcer mode with session status, grid read-out, real-time result feed | 40/100 |

---

## PHASE 12 — TOP 50 OPERATIONAL ISSUES

### P0 — DEPLOYMENT BLOCKERS (Cannot run a live event without fixing these)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P0-001 | No event creation wizard — 15+ clicks, no guided flow | RaceCoreLayout / ManageEvents | Cannot onboard operators |
| P0-007 | Officials list shows raw UUID, not user name | EventOfficialsPanel | Officials governance unreadable |
| P0-012 | EntryCreateDrawer only uses SeriesClasses — EventClass entries show class as `—` | EntriesManager → EntryCreateDrawer | Entries created with wrong class |
| P0-013 | Bulk class change writes `series_class_id`, not `event_class_id` | EntriesManager.handleBulkClass | Class reassignment breaks data |
| P0-026 | Tech pass/fail does not advance `entry_status` to "Teched" | TechQueue / syncEntryTechStatus | Entry readiness gate broken |
| P0-031 | Grid generation always uses `method: Manual` — no qualifying/points-based UI | EventGridPanel | Official grid generation impossible |
| P0-036 | No "Live" status in Session enum — Race Control live indicator never activates | Session entity / EventRaceControlPanel | Live race visibility broken |
| P0-037 | No session picker prominently visible in Results entry flow | EventResultsPanel / ResultsManager | Operators cannot find session results entry |
| P0-042 | Incident form requires raw driver UUID — no driver picker | CreateIncidentModal | Race Control cannot log incidents efficiently |

### P1 — HIGH FRICTION (Blocks efficient operation of live event)

| # | Issue | Location |
|---|-------|----------|
| P1-002 | Series and Track must pre-exist — no inline create shortcuts | Event builder |
| P1-003 | EventClass vs SeriesClass dual-authority causes blank class display | Entry display across UI |
| P1-004 | No default session template — 12-18 sessions created manually | ClassSessionBuilder |
| P1-008 | Officials cannot self-confirm assignment | EventOfficialsPanel |
| P1-009 | Duplicate role assignment only advisory — two Race Directors possible | EventOfficialsPanel |
| P1-014 | No restore workflow within Entries panel — must navigate to Archive page | EntriesManager |
| P1-015 | Duplicate number detection is event-wide, not class-scoped — false positives | useDuplicateNumberValidation |
| P1-016 | CSV import has no column mapping guide or validation feedback | ImportEntriesModal |
| P1-017 | Withdrawal has no reason field, no confirmation, no audit log | EntriesManager.handleBulkWithdraw |
| P1-020 | No wristband count in check-in panel | EventCheckInPanel |
| P1-021 | Check-in does not record `checked_in_by_user_id` | EventCheckInPanel.handleCheckIn |
| P1-022 | Bulk check-in all with no confirmation dialog | EventCheckInPanel |
| P1-023 | Unpaid entries can be checked in without alert or block | EventCheckInPanel |
| P1-027 | Tech checklist not pre-populated from template | TechQueue / createTechInspectionRecord |
| P1-028 | Tech failure does not auto-flag entry | TechQueue → Entry cascade |
| P1-029 | Recheck deadline has no alert or countdown | TechQueue |
| P1-032 | Grid rows show car number only — no driver name | EventGridPanel expanded view |
| P1-033 | No grid regeneration flow (DNS handling) | EventGridPanel |
| P1-038 | CSV results import has no column mapping or row-level error feedback | ResultsCsvImportDialog |
| P1-039 | Provisional vs Official status not explained in UI | sessionLifecycle |
| P1-040 | Points not auto-calculated on result lock | ResultsManager / recalculateStandings |
| P1-043 | Penalty application does not trigger ResultsManager refresh | PenaltyManager frontend |
| P1-044 | Protest deadline not auto-calculated from results publication | fileProtest / Protest form |
| P1-047 | Standings not auto-recalculated on results Official/Locked | onResultsOfficial callback |
| P1-048 | No "amend Official result" workflow | ResultsManager |
| P1-050 | Export packet file URLs expire — not permanent archive links | generateEventExportPacket |

### P2 — OPERATIONAL IMPROVEMENT (Would frustrate experienced operators)

| # | Issue | Location |
|---|-------|----------|
| P2-005 | Season year not validated on Event | Event entity |
| P2-006 | round_number not auto-populated on point-scoring sessions | ClassSessionBuilder |
| P2-010 | Non-admin cannot assign officials without full settings access | EventOfficialsPanel |
| P2-011 | No email notification on official assignment | assignEventOfficial |
| P2-018 | No transponder conflict detection within event | Entry create/update |
| P2-019 | "My Registration" self-service button inside admin workspace | EntriesManager |
| P2-024 | Check-in panel does not show waiver status | CompactCheckInRow |
| P2-025 | No print action from check-in | EventCheckInPanel |
| P2-030 | Inspector identity attribution clunky in fast-paced tech | TechQueue |
| P2-035 | Locked grid has no indicator in session list or command header | EventGridPanel / EventCommandHeader |
| P2-041 | No lap time entry — only final position | Results entry |
| P2-045 | No cross-reference chain view: Incident→Penalty→Protest | Race Control panels |
| P2-046 | Steward ruling publication doesn't trigger public results sync | publishStewardRuling |
| P2-049 | No per-round points breakdown in standings view | EventStandingsPanel |

---

## READINESS SCORECARD

| Domain | Score | Status |
|--------|-------|--------|
| **Event Operations Readiness** | 62/100 | 🟡 Amber — Functional but requires admin supervision |
| **Race Weekend Readiness** | 55/100 | 🟡 Amber — P0 session lifecycle and grid generation gaps prevent unsupervised use |
| **Governance Readiness** | 72/100 | 🟡 Amber — Framework complete; enforcement data is real; role-isolation incomplete |
| **Data Integrity Readiness** | 78/100 | 🟢 Green — Archive system, audit logs, authority layer all solid |

---

## CRITICAL PATH TO "YES"

To reach **YES for live sanctioned operation**, the following must ship in priority order:

### Sprint R9CZ-A (Unblock Live Operation):
1. Fix Session enum — add `Live` status and session start/end controls (P0-036)
2. Fix officials display — resolve user_id → full_name in officials list (P0-007)
3. Fix incident form — add driver picker to CreateIncidentModal (P0-042)
4. Scope duplicate number detection to class, not event-wide (P1-015)
5. Auto-advance entry_status → Teched on tech pass (P0-026)

### Sprint R9CZ-B (Remove Major Friction):
6. Unify class authority — EventClass-first throughout all entry forms
7. Add "session live/end" controls to Race Control panel
8. Auto-recalculate standings on results Official/Locked
9. Grid generation method selector (qualifying, points, random)
10. Withdrawal confirmation + reason field + audit log

### Sprint R9CZ-C (Professional Grade):
11. Event creation wizard (5 steps → 1 guided flow)
12. Session template library (standard format auto-populate)
13. Tech template auto-load on inspection record creation
14. Gate-optimized check-in view (mobile-first, wristband count, waiver status)
15. Permanent export packet storage (non-expiring URLs)

---

*Report generated by R9CY Full Race Weekend Operational Validation — Base44 RaceCore Platform*