# PHASE 5B5: Historical Results Verification & Standings Trigger Polish
## Planning Audit (No Implementation)

**Date:** 2026-05-10  
**Status:** PLANNING PHASE ONLY — NO CODE CHANGES YET  
**Previous Phases:** 5B1–5B4 (Paste, Enhanced Paste, Quick-Create Driver, CSV Import)  
**Scope:** Verification checklist, standings confirmation, public visibility feedback, OperationLog exposure

---

## EXECUTIVE SUMMARY

Phase 5B5 will add **pre-Official confirmation workflows** and **post-import verification UI** to ensure admins understand the consequences of marking historical results as Official before committing. Key features:

1. **Pre-Official Checklist:** Admin-facing verification tasks before session status change
2. **Confirmation Modal:** Clear copy explaining standings recalc, public visibility, and PointsConfig usage
3. **Impact Indicators:** Visual badges showing standings update eligibility and public visibility
4. **OperationLog Feedback:** Exposed import history and validation results
5. **Pre-Flight Warnings:** Missing PointsConfig, non-Final sessions, missing series_class_id

---

## 1. CURRENT END-TO-END HISTORICAL RESULTS FLOW

### A. Data Entry Phase (Historical Mode ON)

**Entry Method 1: Paste Dialog**
```
1. Admin selects Event + Session
2. Admin toggles Historical Mode ON
3. Admin clicks "Paste Results" button
4. ResultsPasteDialog opens
5. Admin pastes tab-separated data
6. Dialog shows preview: matched/unmatched/ambiguous/invalid rows
7. Admin selects which unmatched drivers to quick-create
8. Admin clicks "Add X Rows"
9. Dialog creates missing Driver entities (draft status)
10. Dialog creates Result rows (status_state: Draft, published: false)
11. ResultsQuickEntryTable displays new rows
```

**Entry Method 2: CSV Import (Phase 5B4)**
```
1. Admin selects Event + Session
2. Admin toggles Historical Mode ON (optional)
3. Admin clicks "CSV Upload" tab
4. Admin pastes/uploads CSV file
5. Dialog auto-detects columns
6. Dialog shows preview: matched/unmatched/ambiguous/invalid rows
7. Admin selects which unmatched drivers to quick-create
8. Admin clicks "Import X Rows"
9. Dialog creates missing Driver entities (draft status)
10. Dialog creates Result rows (status_state: Draft, published: false)
11. ResultsQuickEntryTable displays new rows
```

**Entry Method 3: Manual Quick-Entry (Historical Mode)**
```
1. Admin selects Event + Session
2. Admin toggles Historical Mode ON
3. Admin uses ResultsQuickEntryTable to manually enter rows
4. Each row can be edited inline
5. Each row has a Save/Discard button
```

### B. Manual Verification Phase (Same Across All Methods)

**Current State (Implicit):**
```
1. Results are created in Draft status (status_state: 'Draft', published: false)
2. Admin can view and edit rows in ResultsQuickEntryTable
3. No explicit verification checklist
4. No pre-Official warnings about:
   - Whether standings will recalculate
   - Whether results will become public
   - Missing PointsConfig
   - Non-Final session type
   - Missing series_class_id on session
5. Admin manually clicks "Publish Official" button
```

### C. Session Status Transition Phase

**Current Workflow (from ResultsManager):**
```
Draft
  ↓ [Mark Provisional] OR [Publish Official in Historical Mode]
Provisional
  ↓ [Publish Official]
Official
  ↓ [Lock]
Locked

Triggers on Official transition:
- Session.status → 'Official'
- All Result.status_state → 'Official'
- Result.published → true
- Result.is_public → true (if session is Official or Locked)
- OperationLog entry created
- syncResultsVisibilityFromSession() called
- recomputeStandingsForFinalSession() called (if session.session_type === 'Final')
```

### D. Standings Recalculation Phase

**Current Behavior:**
```
IF session.session_type === 'Final' AND session.status === 'Official':
  - recomputeStandingsForFinalSession() executes
  - Recalculates standings for all drivers in session
  - Updates Standing entity records
  - Trigger is AUTOMATIC, non-optional
  
IF session.session_type !== 'Final':
  - Standings NOT recalculated
  - No warning shown to admin
  - Admin may be unaware standings won't update
```

### E. Public Visibility Phase

**Current Behavior:**
```
IF session.status === 'Official' OR session.status === 'Locked':
  - Result.is_public → true (derived field, synced by syncResultsVisibilityFromSession)
  - Results appear on public EventResults page
  
IF session.status === 'Draft' OR session.status === 'Provisional':
  - Result.is_public → false
  - Results NOT visible to public
```

---

## 2. WHAT ADMINS STILL NEED TO MANUALLY VERIFY

### Pre-Official Verification Tasks

1. **Driver Matching & Quick-Create Accuracy**
   - Did all imported drivers resolve correctly?
   - Did quick-created drivers have correct first/last names?
   - Are there any ambiguous or invalid rows that should have been fixed?
   - **Current:** No explicit checklist shown

2. **Standings Impact Assessment**
   - Is this a Final session? (Standings will recalc if Final)
   - Does the Series have a valid PointsConfig for this season/class?
   - Are standings already calculated? (May need revert if re-importing)
   - **Current:** No indication shown; admin must know standings behavior

3. **Public Visibility Confirmation**
   - Should these results become public? (They will if session → Official)
   - Are all driver profiles ready to be public? (May have draft status)
   - **Current:** No warning shown

4. **Data Quality Checks**
   - Are positions unique (no duplicates)?
   - Are all drivers actually present? (No missing/null driver_ids)
   - Do lap counts make sense?
   - Are status values correct?
   - **Current:** Validation only at row creation time

5. **Session Configuration Checks**
   - Does session have series_class_id? (Optional but recommended)
   - Is session.session_type one of: Practice, Qualifying, Heat, LCQ, Feature, Final?
   - Is this the correct event/track/series?
   - **Current:** No validation

---

## 3. RECOMMENDED CHECKLIST BEFORE MARKING OFFICIAL

### Pre-Official Modal Workflow

```
User clicks "Publish Official" button
  ↓
Modal appears: "Publish Session as Official"
  ├─ Title: "Confirm: Publish [Session Label] as Official"
  ├─ Subtitle: "This action will affect standings, visibility, and cannot be easily undone."
  │
  ├─ SECTION 1: Data Quality Summary
  │   ├─ ✅ X results imported/entered (green if > 0)
  │   ├─ ✅ X drivers matched/created (green if all resolved)
  │   ├─ ⚠️ X rows with warnings (amber if any)
  │   └─ ❌ X invalid rows remain (red if any, disable Official unless fixed)
  │
  ├─ SECTION 2: Standings Impact
  │   ├─ Session Type: [Practice|Qualifying|Heat|LCQ|Feature|Final]
  │   ├─ IF session_type === 'Final':
  │   │   └─ 🟢 "Standings will recalculate for [Series] [Season]"
  │   │      └─ "Points will be awarded based on: [PointsConfig name or 'default']"
  │   │      └─ [Link: "View PointsConfig"]
  │   ├─ IF session_type !== 'Final':
  │   │   └─ 🔵 "Standings will NOT recalculate (non-Final session)"
  │   └─ [Checkbox] "I've verified the correct PointsConfig will be used"
  │
  ├─ SECTION 3: Public Visibility
  │   ├─ 🌐 "Results will become PUBLIC and visible on [Track] event page"
  │   ├─ "Drivers with draft profiles will still be visible"
  │   └─ [Checkbox] "I'm ready to make these results public"
  │
  ├─ SECTION 4: Missing Configuration Warnings (Conditional)
  │   ├─ IF !session.series_class_id:
  │   │   └─ ⚠️ "Yellow: Session has no series_class_id (optional but recommended)"
  │   ├─ IF !pointsConfigFound:
  │   │   └─ 🔴 "Red: No PointsConfig found for this series/season/class"
  │   │      └─ "Create one before publishing Official"
  │   └─ IF missing Entry roster in Live Mode:
  │       └─ ⚠️ "Yellow: Some drivers not in Entry roster (OK in Historical Mode)"
  │
  ├─ SECTION 5: OperationLog (Preview)
  │   ├─ "Previous imports/changes:"
  │   ├─ [List last 3 OperationLog entries for this session]
  │   │   - "2026-05-10 14:22 - CSV import: 12 rows, 2 new drivers"
  │   │   - "2026-05-10 14:10 - Paste import: 8 rows, 0 new drivers"
  │   │   - "2026-05-10 13:45 - Manual entry: 1 row added"
  │
  ├─ SECTION 6: Action Buttons
  │   ├─ [Cancel]
  │   ├─ [Review Results] (navigate to session view)
  │   └─ [Publish Official] (disabled if any red warnings)
```

### Checklist Items (Checkboxes)

- [ ] Data Quality: All rows are valid (no invalid/ambiguous drivers)
- [ ] Standings: Verified PointsConfig is correct
- [ ] Standings: Aware standings will/won't recalculate based on session type
- [ ] Visibility: Ready for results to become public
- [ ] Series/Class: Session has correct series_class_id (if applicable)

---

## 4. RECOMMENDED CONFIRMATION MODAL COPY

### Modal Title & Subtitle

```
Title: "Publish [Event Name] - [Session Label] as Official"

Subtitle: "This action will:
  • Mark all results as Official and Published
  • Make results visible to the public
  • Recalculate standings (if Final session)
  • Lock the session status to Official (editable until Locked)
  
This cannot be undone — you can revert to Provisional if needed."
```

### Data Quality Summary

```
✅ Results: 12 valid rows ready to publish
✅ Drivers: 10 matched + 2 new (draft status)
⚠️  Warnings: 1 single-word driver name

Ready to publish: 12 rows
```

### Standings Impact (Non-Final)

```
Session Type: Practice

🔵 Standings Impact: NOT APPLICABLE
This is a Practice session. Standings will NOT be recalculated.
Only Final sessions trigger standings recalculation.

[Link] Learn more about standings
```

### Standings Impact (Final)

```
Session Type: Final

🟢 Standings Impact: WILL RECALCULATE
This is a Final session. Standings will be recalculated for:
  • Series: [Series Name]
  • Season: [2026]
  • Class: [Class Name or "All Classes"]

Using PointsConfig: Standard 2026 Final Points
  • Position 1: 50 pts
  • Position 2: 44 pts
  • ...

[Link] View full PointsConfig
[Link] Change PointsConfig (admin only)
```

### Public Visibility

```
🌐 PUBLIC VISIBILITY

Results will be visible on the public [Track Name] event page:
  • Drivers will see their results
  • Non-authenticated users can view final standings
  • Driver profiles (draft or live) will be linked

Ready to publish publicly? 
  [☐] Yes, I've confirmed all data is accurate
```

### Missing Configuration Warnings

```
⚠️  Missing Series Class ID
This session does not have a series_class_id. 
Standings may group results by session_type instead.

Recommendation: Set series_class_id before publishing if this is a specific class.
```

```
🔴 No PointsConfig Found
This series/season/class combination has no configured points table.
Standings cannot be recalculated without it.

Action Required: Create a PointsConfig or standings will be skipped.
[Link] Create PointsConfig
```

### OperationLog Section

```
Previous Import/Entry History

📋 2026-05-10 14:22 — CSV import
   12 rows imported, 2 new drivers created
   Data source: historical_csv_import

📋 2026-05-10 14:10 — Paste import
   8 rows imported, 0 new drivers
   Data source: historical_paste_import

📋 2026-05-10 13:45 — Manual entry
   1 row added
   Data source: manual entry
```

---

## 5. HOW TO SHOW WHETHER STANDINGS WILL UPDATE

### Location 1: Session Info Card (ResultsManager sidebar)

**Current:**
```
Type: Final
Laps: 45 (if applicable)
Results: 12 rows
Updated: 2026-05-10 14:22
```

**Enhanced (Add this):**
```
Type: Final
Laps: 45
Results: 12 rows
Updated: 2026-05-10 14:22
Standings Impact: ✅ Will recalculate on Official
  ├─ Series: Superkarts United
  ├─ PointsConfig: Standard 2026 Final
  └─ [View]
```

### Location 2: Pre-Official Modal (Primary location)

As described in section 4 above — show full PointsConfig details and "Will/Won't Recalculate" banner.

### Location 3: Status Transition Warning Banner

**When clicking "Publish Official":**

```
Before the modal opens, show an inline warning:

🔵 [For Non-Final Sessions]
"This is a Practice session. Standings will NOT be recalculated.
Only Final sessions update standings."

🟢 [For Final Sessions]
"This is a Final session. Standings WILL be recalculated.
Using PointsConfig: [Name]"
```

### Location 4: Workflow Button Tooltip

```
Hover over "Publish Official" button:
  Tooltip: "Mark official (Final sessions will recalculate standings)"
```

### Visual Indicators

- **🟢 Green Badge:** Standings will recalculate (Final session + valid PointsConfig)
- **🔵 Blue Badge:** Standings won't recalculate (non-Final session)
- **🟡 Yellow Badge:** Standings may not recalculate (Final but no PointsConfig found)
- **🔴 Red Badge:** Standings cannot recalculate (Final + PointsConfig missing, block Official)

---

## 6. HOW TO SHOW WHETHER RESULTS WILL BECOME PUBLIC

### Location 1: Public Visibility Card (Pre-Official Modal)

```
🌐 PUBLIC VISIBILITY

When you publish this session as Official:
  • Results will be visible on the public event page
  • Non-authenticated users can view results and standings
  • Results will show on the driver profile (if driver is public)
  • Track and series pages will list these results

Current visibility: DRAFT (not public)
After Official: PUBLIC ✓
```

### Location 2: Session Info Card (ResultsManager sidebar)

**Add a visibility badge:**

```
Status: Draft
Visibility: 🔒 Private (draft session)

[When Official:]
Status: Official
Visibility: 🌐 Public (visible to all)
```

### Location 3: Result Row Styling

**In ResultsQuickEntryTable, add a subtle indicator:**

```
Row background (Draft): #1A1A1A (dark, muted)
Row background (Official): #1A1A1A with 🌐 badge in corner
Row text (Official): Slightly brighter (indicates public-bound)
```

### Location 4: OperationLog Entry

```
[After publishing Official]

📋 2026-05-10 14:30 — Published Official
   Session marked Official, 12 results published
   Results are now public on event page
   Standings recalculated for [Series]
```

### Warnings

```
⚠️  These results will become PUBLIC
Make sure all driver data is accurate before publishing.
Once public, results are discoverable by search engines and public users.
```

---

## 7. HOW TO EXPOSE OPERATIONLOG FEEDBACK

### Location 1: Pre-Official Modal (Section 5)

Show last 3 OperationLog entries as described in section 4:

```
Previous Import/Entry History

📋 CSV Import (2 hours ago)
   12 rows, 2 new drivers

📋 Paste Import (2.5 hours ago)  
   8 rows, 0 new drivers

📋 Manual Entry (3 hours ago)
   1 row added

[View Full History] → Opens dedicated OperationLog panel
```

### Location 2: Post-Publish Success Toast

```
✅ Session published as Official

12 results now public
2 new drivers created
Standings recalculated for [Series]

[View OperationLog] [Dismiss]
```

### Location 3: Dedicated OperationLog Tab (New)

**In ResultsManager tabs, add "Activity Log" tab:**

```
Tabs: Manual Entry | CSV Upload | API Sync | Activity Log

Activity Log shows:
  ├─ 2026-05-10 14:30 — Published Official
  │   Session marked Official, results published
  │   Standings: ✅ Recalculated (Final session, Standard 2026 config)
  │   Visibility: ✅ Results now public
  │   Metadata: {session_id, series_id, imported_count, drivers_created}
  │
  ├─ 2026-05-10 14:22 — CSV Import
  │   12 rows imported, 2 new drivers created
  │   Source: historical_csv_import
  │   Metadata: {driver_created_count: 2}
  │
  ├─ 2026-05-10 14:10 — Paste Import
  │   8 rows imported, 0 new drivers
  │   Source: historical_paste_import
  │   Metadata: {}
  │
  └─ 2026-05-10 13:45 — Manual Entry
      1 row added
      Source: manual_entry
      Metadata: {}
```

### Location 4: Session Info Card Expandable

```
Current: "Updated: 2026-05-10 14:22"
Enhanced: "Updated: 2026-05-10 14:22 [📋 View Activity Log]"

Click reveals last 5 operations in a dropdown.
```

---

## 8. WARNINGS FOR MISSING POINTSCONFIG

### When to Show

- Session.status transitioning to "Official"
- Session.session_type === "Final"
- No PointsConfig found for (series_id, season, series_class_id)

### Warning Types

**Red (Blocking):**
```
🔴 Cannot Publish: No PointsConfig Found

Series: Superkarts United
Season: 2026
Class: [Class] OR [All Classes]

A PointsConfig is required for Final sessions to recalculate standings.

Actions:
[Create PointsConfig] [Cancel Publish] [Publish Anyway (No Standings)]
```

**Amber (Advisory):**
```
⚠️  Warning: Using Default PointsConfig

Series: Superkarts United
Season: 2026

No class-specific PointsConfig found. Will use series-wide default.
This may not reflect the correct points for this specific class.

[Continue] [Change PointsConfig]
```

---

## 9. WARNINGS FOR NON-FINAL SESSIONS

### When to Show

- Session.session_type !== "Final" (Practice, Qualifying, Heat, LCQ, Feature)
- User clicking "Publish Official"

### Warning Type

**Blue (Informational):**
```
🔵 Standings Won't Update

Session Type: Practice

This is a Practice session. Standings are only recalculated for Final sessions.

This is expected behavior. Continue publishing if this is correct.

[Continue] [Cancel]
```

### Display Always

Even if not blocking, always show in:
- Pre-Official modal (Section 2)
- Session info card (standings impact line)
- Workflow button hover tooltip

---

## 10. WARNINGS FOR MISSING SERIES_CLASS_ID

### When to Show

- Session.series_class_id is null/undefined
- User clicking "Publish Official"
- Only in Final sessions (other session types, less critical)

### Warning Type

**Yellow (Advisory):**
```
⚠️  Recommended: Set Series Class

This session doesn't have a series_class_id set.

Standings may be calculated for the entire series instead of just this class.
If this is a single-class session, consider setting series_class_id.

[Set Now] [Continue Anyway]
```

### Display Always

Show in:
- Pre-Official modal (Section 4)
- Session info card (config section)

---

## 11. IMPLEMENTATION PARTS

### Part A: Pre-Official Confirmation Modal

**File:** `components/registrationdashboard/results/ResultsPublishConfirmDialog.jsx` (NEW)

**Responsibilities:**
- Render multi-section modal with all sections from section 4
- Fetch OperationLog entries for this session
- Fetch PointsConfig for series/season/class
- Detect session type and conditionally show standings impact
- Show warnings (red/amber/yellow badges)
- Render checkboxes for manual verification
- Disable "Publish Official" if any red warnings
- Call `updateSessionStatus.mutate('Official')` on confirm

**Props:**
```javascript
{
  open,
  onOpenChange,
  selectedSession,
  selectedEvent,
  pointsConfig,  // or null
  operationLogs, // last 3 entries
  onConfirm,
  isLoading,
}
```

---

### Part B: Session Info Card Enhancement

**File:** `components/registrationdashboard/results/SessionInfoCard.jsx` (EXTRACT & ENHANCE)

**Current:** SessionInfoCard shown in ResultsManager sidebar

**Enhancements:**
- Add "Standings Impact" section with badge (🟢/🔵/🟡/🔴)
- Add PointsConfig name if found
- Add [View] link to PointsConfig details
- Add visibility badge (🔒 Private / 🌐 Public)
- Add [📋 View Activity Log] link

---

### Part C: OperationLog Exposure

**File:** `components/registrationdashboard/results/SessionActivityLog.jsx` (NEW)

**Responsibilities:**
- Display chronological list of operations for this session
- Show operation type (Import, Manual, Status Change, Standings Recalc)
- Show metadata (rows imported, drivers created, config used)
- Show operation timestamp and source
- Link to relevant details

---

### Part D: Status Transition Flow Modification

**File:** `components/registrationdashboard/ResultsManager.jsx` (MODIFY)

**Changes:**
- When user clicks "Publish Official", show pre-flight checks
- Fetch OperationLog and PointsConfig
- Open confirmation modal instead of direct AlertDialog
- Pass all required data to confirmation modal
- Show inline warning banner before modal
- Conditionally block Official transition if red warnings

---

### Part E: Warning Badges & Status Indicators

**Locations:**
- `SessionInfoCard.jsx`: Add Standings Impact + Visibility badges
- `ResultsPublishConfirmDialog.jsx`: Add all warning sections
- `ResultsManager.jsx`: Add inline warning banner

---

### Part F: OperationLog Creation on Publish

**File:** `components/registrationdashboard/ResultsManager.jsx` (MODIFY)

**Enhancement to existing mutation:**
- When session status → Official, log more details
- Include PointsConfig used (or "none")
- Include standings recalc result (success/skipped/failed)
- Include visibility change (results now public)

---

## 12. TESTING CHECKLIST

### Unit Tests

- [ ] PointsConfig lookup works (found, not found, multiple matches)
- [ ] Session type detection (Final vs non-Final)
- [ ] Warning badge logic (red/amber/yellow/blue)
- [ ] OperationLog fetch returns last 3 entries
- [ ] Checkboxes toggle state correctly
- [ ] "Publish Official" button disables when red warnings exist

---

### Integration Tests

- [ ] Click "Publish Official" → confirmation modal opens
- [ ] Modal shows data quality summary (X valid rows)
- [ ] Modal shows standings impact (will/won't recalculate)
- [ ] Modal shows public visibility warning
- [ ] Modal shows OperationLog history (last 3 entries)
- [ ] Modal shows warnings (missing PointsConfig, non-Final, missing series_class_id)
- [ ] Checking all checkboxes enables "Publish Official" button
- [ ] Red warning present → "Publish Official" button disabled
- [ ] Click "Publish Official" → session status → Official
- [ ] Success toast shows OperationLog summary
- [ ] Results become public (is_public: true)
- [ ] Standings recalc triggered (if Final session)
- [ ] OperationLog entry created with correct metadata

---

### Workflow Tests (Historical Mode)

- [ ] **Paste → Verify → Official:**
  1. Paste 5 rows (3 matched, 2 unmatched)
  2. Select unmatched for quick-create
  3. Click "Publish Official"
  4. Modal shows 5 valid rows ready to publish
  5. Modal shows standings will/won't recalculate (depends on session type)
  6. Modal shows results will become public
  7. Confirm → session → Official
  8. Results visible on public page
  9. Standings updated (if Final)

- [ ] **CSV Import → Verify → Official:**
  1. Upload CSV with 10 rows
  2. Dialog shows 8 matched, 2 unmatched
  3. Select 2 unmatched for quick-create
  4. Click "Import 10 Rows"
  5. Wait for import complete
  6. Click "Publish Official"
  7. Modal shows 10 rows, 2 new drivers
  8. Modal shows OperationLog with CSV import entry
  9. Confirm → session → Official
  10. Results public, standings updated (if Final)

- [ ] **Manual Entry → Verify → Official:**
  1. Manually add 3 rows using ResultsQuickEntryTable
  2. Click "Publish Official"
  3. Modal shows 3 valid rows
  4. Modal shows manual entry in OperationLog
  5. Confirm → Official
  6. Results public, standings updated (if Final)

---

### Edge Case Tests

- [ ] **Missing PointsConfig (Final session):**
  - Red warning shown, "Publish Official" disabled
  - User cannot proceed without addressing

- [ ] **Non-Final session (Practice):**
  - Blue informational banner shown
  - "Publish Official" still enabled (warning is advisory)
  - Standings NOT recalculated

- [ ] **Missing series_class_id:**
  - Yellow advisory warning shown
  - "Publish Official" still enabled
  - Continues with warning

- [ ] **Invalid rows remain:**
  - Red warning shown
  - "Publish Official" disabled
  - User must fix invalid rows first

- [ ] **Ambiguous drivers remain:**
  - Red warning shown
  - "Publish Official" disabled
  - User must remove or fix ambiguous rows

---

### Regression Tests

- [ ] Paste results workflow unchanged (except new confirmation modal)
- [ ] CSV import workflow unchanged (except new confirmation modal)
- [ ] Manual entry workflow unchanged (except new confirmation modal)
- [ ] Session status transitions unchanged (just add pre-flight modal)
- [ ] Standings recalc logic unchanged (just exposed in UI)
- [ ] Public visibility logic unchanged (just exposed in UI)
- [ ] OperationLog logging unchanged (just now exposed)

---

## SUMMARY

Phase 5B5 focuses on **admin education and verification** before marking historical results Official:

1. **Clear consequences:** Admins see exactly what will happen (standings update, public visibility)
2. **Missing config warnings:** Admins alerted to PointsConfig gaps
3. **Verification checklist:** Admins confirm they've validated data quality
4. **OperationLog feedback:** Full history of imports and changes visible
5. **Session type clarity:** Non-Final sessions explicitly noted (standings won't update)
6. **Pre-flight modal:** All checks + confirmations before commit

**No logic changes.** All standings, public visibility, and lifecycle behavior remains identical to current implementation. Phase 5B5 only **exposes and explains** existing behavior.

---

**END OF PHASE 5B5 PLANNING AUDIT**

Ready to lock planning and proceed with Phase 5B5a implementation once approved.