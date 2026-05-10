# PHASE 5B4: CSV Historical Result Import
## Implementation Plan (Design Only)

**Date:** 2026-05-10  
**Status:** IMPLEMENTATION DESIGN — NO CODE YET  
**Based on:** Phase 5B4 Planning Audit  
**Constraints:** Existing session, Draft-only results, no standings/lifecycle changes, reuse Phase 5B3 logic  

---

## 1. RECOMMENDED CSV WORKFLOW UX

### Current Workflow (Paste Dialog)
```
1. ResultsManager: Select session
2. Toggle Historical Mode ON
3. Click "📋 Paste Results" button
4. ResultsPasteDialog opens
5. Paste tab-separated data
6. Preview + select drivers to create
7. Click "Add X Rows"
8. Results created + drivers created (if selected)
9. ResultsQuickEntryTable shows rows for manual editing
10. Click individual rows to edit
11. Click "Publish Official" (workflow buttons) or "Revert to Draft"
```

### Proposed CSV Workflow (New)
```
1. ResultsManager: Select session ← PRECONDITION
2. Toggle Historical Mode ON (optional; CSV should work in both modes)
3. Click "CSV Import" tab in ResultsManager
4. Upload CSV file OR drag-drop
5. System auto-detects columns + shows mapping UI
6. User confirms/overrides column mappings
7. System parses rows + validates + displays preview table
8. Preview shows: matched drivers, unmatched (with Create checkbox), ambiguous (skipped), invalid (skipped)
9. User selects which unmatched drivers to quick-create
10. User clicks "Import X Rows"
11. System creates drivers (if selected) + creates result rows
12. Success toast shows import count + driver creation count
13. ResultsQuickEntryTable auto-updates with new rows
14. User can edit rows or proceed to workflow buttons (Save Draft / Publish)
```

### Key UX Differences vs. Paste
| Aspect | Paste | CSV |
|--------|-------|-----|
| Input | Clipboard paste | File upload |
| Column specification | User provides headers | Auto-detected |
| Max rows | ~100 (practical limit) | 500–1000 (configurable) |
| Mapping override | Manual in preview | Yes, before parsing rows |
| Speed | Manual workflow | Batch processing |

---

## 2. REQUIRED SESSION PRECONDITIONS

### Pre-Import Checks
**In ResultsCsvImportDialog:**

```javascript
// Guard: No session selected
if (!selectedSession) {
  return <Card className="...">Select a session first</Card>
}

// Guard: Session is locked (no edits allowed)
if (selectedSession.status === 'Locked') {
  return <Card className="...">Cannot import: session is locked</Card>
}

// Warning: Session is official (will revert to Provisional on import)
if (selectedSession.status === 'Official' && !isHistoricalMode) {
  showWarning('Importing will revert session to Provisional');
}
```

### Decision Tree
```
selectedSession exists?
  ├─ NO: Show "Select a session"
  └─ YES: Can import
  
selectedSession.status === 'Locked'?
  ├─ YES: Show "Cannot import (locked)"
  └─ NO: Can import

selectedSession.status === 'Official' && NOT isHistoricalMode?
  ├─ YES: Show warning
  └─ NO: No warning
```

### Result Behavior
- Results always created with `status_state: 'Draft'`
- No automatic session status change
- No automatic standings recalculation
- User must explicitly call workflow buttons (Save Draft / Publish Official / Mark Provisional)

---

## 3. REQUIRED CSV COLUMNS

### Minimum Set (Must Have)
1. **Position** — Finishing order
   - Aliases: `position`, `pos`, `finishing_position`, `place`, `finish`, `result_position`
   - Type: integer > 0
   - Validation: fail row if missing or invalid
   - Null handling: error

2. **Driver** — Driver name for matching
   - Aliases: `driver`, `driver_name`, `driver_full_name`, `name`, `driver name`, `participant`
   - Type: string
   - Parsing: `splitDriverName()` from pasteDriverUtils
   - Resolution: `resolveDriverMatch()` → matched/unmatched/ambiguous
   - Null handling: error

3. **Status** — Race outcome
   - Aliases: `status`, `finish_status`, `result_status`, `outcome`
   - Type: enum
   - Valid values: `Running`, `DNF`, `DNS`, `DSQ`, `DNP`
   - Case handling: normalize (accept "running", "DNF", etc.)
   - Null handling: error

---

## 4. OPTIONAL CSV COLUMNS

### Commonly Used
1. **Laps** — Laps completed
   - Aliases: `laps`, `laps_completed`, `laps_led`, `laps_finished`
   - Type: integer >= 0
   - Default: null
   - Validation: warn if invalid, skip field

2. **Best Lap Time** — Best lap time
   - Aliases: `best_lap_time`, `best_lap_time_ms`, `fastest_lap`, `best_time`, `lap_time`
   - Type: integer (ms) or time string (`MM:SS.sss`)
   - Parsing: try milliseconds first, fallback to time parsing
   - Default: null
   - Validation: warn if unparseable

3. **Car Number** — Vehicle number/bib
   - Aliases: `car_number`, `car #`, `number`, `bib`, `entry_number`
   - Type: string
   - Default: null
   - Used for: roster matching (fallback if driver name ambiguous)

4. **Notes** — Additional comments
   - Aliases: `notes`, `comment`, `comments`, `remarks`
   - Type: string
   - Default: null
   - Length limit: none (stored as-is)

### Future (Not MVP)
- `heat_number`: for multi-heat sessions
- `points`: pre-calculated points (will be overwritten on Official anyway)
- `best_lap_ms`: alternative time format

---

## 5. CANONICAL INTERNAL RESULT SHAPE

### Input Row (from CSV)
```javascript
{
  // From parse + validation
  _idx: 0,              // Row index in preview
  rawDriver: "John Smith", // Original driver name
  position: 1,
  status: "Running",
  laps: 45,
  best_lap_time_ms: null,
  car_number: "45",
  notes: "",
  
  // From resolution
  driver: DriverRecord | null,    // if matched
  driverStatus: "matched" | "unmatched" | "ambiguous" | "invalid",
  
  // Validation state
  errors: ["position must be > 0"],
  isValid: true,
  canCreate: false, // unmatched + valid position/status
}
```

### Output Row (to Results.create)
```javascript
{
  // Session context (from ResultsManager)
  event_id: selectedEvent.id,
  session_id: selectedSession.id,
  session_type: selectedSession.session_type,
  series_id: selectedEvent.series_id,
  series_class_id: selectedSession.series_class_id,
  
  // Driver resolution
  driver_id: resolvedDriverId, // matched or quick-created
  
  // Race data
  position: 1,
  status: "Running",
  laps_completed: 45,
  best_lap_time_ms: null,
  notes: "",
  
  // Status (always Draft)
  status_state: "Draft",
  
  // Optional (from Entry roster)
  team_id: entryData?.team_id || null,
  program_id: entryData?.id || null,
}
```

---

## 6. DRIVER MATCHING BEHAVIOR

### Resolution Flow
```
For each row:
  1. Extract: firstName, lastName = splitDriverName(rawDriver)
  2. Query: match = resolveDriverMatch(firstName, lastName, drivers)
  
  3. If match.status === "matched":
     ├─ Set driver = match.driver
     ├─ Set driverStatus = "matched"
     └─ Row is valid (if position/status OK)
  
  4. Else if match.status === "unmatched":
     ├─ Set driver = null
     ├─ Set driverStatus = "unmatched"
     ├─ Set canCreate = true (if position/status valid)
     └─ Show "Create?" checkbox in preview
  
  5. Else if match.status === "ambiguous":
     ├─ Set driver = null
     ├─ Set driverStatus = "ambiguous"
     ├─ Add error: "Multiple matches (N found)"
     ├─ Set isValid = false
     └─ NO checkbox (skip on import)
  
  6. Else (error in resolution):
     ├─ Set driverStatus = "invalid"
     ├─ Add error: "Missing driver name"
     └─ Set isValid = false
```

### Matched Driver Example
```
CSV: "John Smith"
→ splitDriverName("John Smith") = {first: "John", last: "Smith"}
→ resolveDriverMatch("John", "Smith", drivers)
→ Found in system: Driver(id: "d123", normalized_name: "john smith")
→ Result: { status: "matched", driver: Driver("d123") }
```

### Unmatched Driver Example
```
CSV: "Alice Wonder"
→ splitDriverName("Alice Wonder") = {first: "Alice", last: "Wonder"}
→ resolveDriverMatch("Alice", "Wonder", drivers)
→ Not found in system
→ Result: { status: "unmatched", driver: null }
→ User checks "Create?" checkbox
→ System calls: buildMinimalDriverPayload("Alice", "Wonder")
→ Creates: Driver { first_name: "Alice", last_name: "Wonder", visibility_status: "draft", data_source: "historical_csv_import" }
```

### Ambiguous Driver Example
```
CSV: "John Smith"
→ splitDriverName("John Smith") = {first: "John", last: "Smith"}
→ resolveDriverMatch("John", "Smith", drivers)
→ Found 3 drivers with normalized name "john smith"
→ Result: { status: "ambiguous", driver: null, count: 3 }
→ Row marked invalid, skipped (no checkbox)
→ Error shown: "Multiple drivers match 'John Smith' (3 found). Resolve duplicates first."
```

---

## 7. MISSING DRIVER QUICK-CREATE (REUSE FROM 5B3)

### Reuse Strategy
**Import `pasteDriverUtils.js` directly:**

```javascript
import {
  splitDriverName,
  buildNormalizedName,
  resolveDriverMatch,
  buildMinimalDriverPayload,
  isSingleWordName,
} from './pasteDriverUtils';
```

### Function Reuse
1. **`splitDriverName(fullName)`** → Parse driver name
   - Used in: row parsing, validation
   - Returns: `{ first_name, last_name }`

2. **`resolveDriverMatch(firstName, lastName, drivers)`** → Match against system
   - Used in: driver resolution
   - Returns: `{ status, driver?, count? }`

3. **`buildMinimalDriverPayload(firstName, lastName)`** → Create driver record
   - Used in: quick-create on import
   - Returns: Driver entity payload with dedup fields

4. **`buildNormalizedName(firstName, lastName)`** → Build normalized name
   - Used in: matching, dedup checking
   - Returns: normalized string

5. **`isSingleWordName(fullName)`** → Detect single-word names
   - Used in: validation, warning
   - Returns: boolean

### Creation Flow
```
User selects unmatched rows for creation:
  1. Filter: rowsToCreate = rows.filter(r => r.canCreate && createSelected.has(r._idx))
  2. Check limit: if (rowsToCreate.length > 20) abort with warning
  3. For each row:
     - payload = buildMinimalDriverPayload(firstName, lastName)
     - newDriver = await base44.entities.Driver.create(payload)
     - driverIdMap.set(row._idx, newDriver.id)
  4. Build result rows using driverIdMap
  5. Create all results in single batch
  6. Invalidate cache: queryClient.invalidateQueries({ queryKey: ['drivers'] })
```

### Data Inserted on Quick-Create
```javascript
{
  first_name: "Alice",
  last_name: "Wonder",
  visibility_status: "draft",      // NOT published
  racing_status: "Active",
  data_source: "historical_csv_import",  // Track source
  normalized_name: "alice wonder",
  canonical_slug: "alice-wonder",
  canonical_key: "driver:alice-wonder",
  // All other fields: null/default
}
```

---

## 8. AMBIGUOUS DRIVER HANDLING

### Decision: SKIP WITHOUT OFFER

When multiple drivers match the same normalized name:

1. **Mark row:** `driverStatus = "ambiguous"`
2. **Prevent creation:** Do NOT offer "Create?" checkbox
3. **Error message:** `"Multiple drivers match 'John Smith' (N found). Resolve duplicates first."`
4. **Preview badge:** Orange "Ambiguous" badge
5. **Import behavior:** Skip row, don't create result
6. **User action:** Must resolve duplicates in ManageDrivers → Duplicate Finder

### Why No Quick-Create for Ambiguous?
- Creating another "John Smith" makes problem worse
- System cannot decide which John Smith was intended
- Conservative: force admin to resolve duplication first
- Risk mitigation: prevents data quality issues

### Ambiguous Row Example
```
CSV row: position=2, driver="John Smith", status="Running"
System detects: 3 drivers with normalized name "john smith"
  - Driver(id: "d1", first_name: "John", last_name: "Smith", ...)
  - Driver(id: "d2", first_name: "John", last_name: "Smith", ...)
  - Driver(id: "d3", first_name: "John", last_name: "Smyth", ...)

Preview:
  ├─ Badge: 🔴 Ambiguous
  ├─ Error: Multiple drivers match "John Smith" (3 found). Resolve duplicates first.
  └─ Checkbox: NONE (no create option)

Import action: Skip row, show warning
```

---

## 9. VALIDATION RULES

### Per-Row Validation

| Field | Rule | Severity | Action |
|-------|------|----------|--------|
| **position** | Required, > 0, integer | Error | Mark invalid, skip |
| **driver** | Required, resolvable | Error | Mark invalid, skip (if ambiguous); offer create (if unmatched) |
| **status** | Required, valid enum | Error | Mark invalid, skip |
| **laps** | Optional, >= 0 if provided | Warning | Allow, show warning icon |
| **best_lap_time** | Optional, valid format if provided | Warning | Allow, show warning icon |
| **driver (single word)** | Warn if unmatched + single word | Warning | Flag in preview, allow create |

### Validation Order
```
1. Check required fields (position, driver, status)
2. Parse + normalize values
3. Resolve driver (matched/unmatched/ambiguous)
4. Check position > 0 and not duplicate in session
5. Check status is valid enum
6. Check optional fields (laps, best_lap_time) if provided
7. Set isValid = true if no errors, false otherwise
8. Set canCreate = (driverStatus === "unmatched") && isValid
```

### Badge System (Preview Table)
```
✅ Green "Matched" — Existing driver found
  └─ Show driver name
  
🟡 Amber "Unmatched" + checkbox — Missing driver, can create
  └─ User clicks checkbox to mark for creation
  
🔴 Orange "Ambiguous" — Multiple drivers match, skip required
  └─ No checkbox, always skipped
  
❌ Red "Invalid" — Data error, skip required
  └─ Show error(s)
```

---

## 10. PREVIEW-BEFORE-IMPORT FLOW

### Preview State (After Parse + Validation)
```javascript
{
  rows: [
    { _idx, rawDriver, position, status, laps, driver, driverStatus, errors, isValid, canCreate },
    ...
  ],
  stats: {
    total: 10,
    matched: 7,       // driverStatus === "matched" && isValid
    unmatched: 2,     // driverStatus === "unmatched" (can create)
    ambiguous: 0,     // driverStatus === "ambiguous"
    invalid: 1,       // !isValid && driverStatus !== "ambiguous"
  },
  selectedForCreate: new Set([1, 4]),  // Row indices to create
}
```

### Preview UI (Before Commit)
```
Summary bar (read-only):
  ✅ 7 matched · 🟡 2 unmatched · 🔴 0 ambiguous · ❌ 1 invalid
  Will add: 9 rows (2 new drivers)

Table (interactive for unmatched):
  Row 1: position=1, driver="John Smith" → ✅ Matched (John Smith)
  Row 2: position=2, driver="Alice Wonder" → 🟡 Unmatched [☐ Create]
  Row 3: position=3, driver="Bob Jones" → 🟡 Unmatched [☑ Create]
  Row 4: position=4, driver="Jane Doe" → ✅ Matched (Jane Doe)
  Row 5: position=5, driver="John Smith" → 🔴 Ambiguous (3 found)
  ... (more rows)

Action buttons:
  [Cancel] [Change File] [Import 9 Rows] (disabled if creating > 20)
```

### User Interactions
```
1. View auto-detected column mapping
   ├─ [Override Column] dropdown for each column
   └─ Confirm mapping before parsing

2. Review preview table
   ├─ Check/uncheck "Create" boxes for unmatched drivers
   └─ Understand errors in invalid rows

3. Click "Import X Rows"
   ├─ System validates createSelected.size <= 20
   ├─ If valid: proceed to commit
   └─ If invalid: show "Max 20 drivers" warning

4. Commit happens in background
   ├─ Show progress indicator
   ├─ Create drivers first (sequential)
   ├─ Then create results (batch)
   └─ Close dialog + invalidate cache
```

---

## 11. IMPORT COMMIT FLOW

### Step-by-Step Execution

```javascript
// Step 1: Validate selections
if (rowsToCreate.length > 20) {
  toast.error('Max 20 drivers per import');
  return;
}

// Step 2: Create missing drivers (sequential)
const driverIdMap = new Map(); // rowIdx -> driver_id
for (const row of rowsToCreate) {
  const { first_name, last_name } = splitDriverName(row.rawDriver);
  const payload = buildMinimalDriverPayload(first_name, last_name);
  try {
    const newDriver = await base44.entities.Driver.create(payload);
    driverIdMap.set(row._idx, newDriver.id);
  } catch (err) {
    toast.error(`Failed to create driver: ${err.message}`);
    return; // Stop on first creation failure
  }
}

// Step 3: Build result rows (matched + newly-created)
const newRows = preview.rows
  .filter(r => r.isValid && (r.driverStatus === "matched" || createSelected.has(r._idx)))
  .map(r => {
    const driverId = driverIdMap.has(r._idx) 
      ? driverIdMap.get(r._idx) 
      : r.driver?.id;
    
    return {
      event_id: selectedEvent.id,
      session_id: selectedSession.id,
      session_type: selectedSession.session_type,
      series_id: selectedEvent.series_id,
      series_class_id: selectedSession.series_class_id,
      driver_id: driverId,
      position: r.position,
      status: r.status,
      laps_completed: r.laps,
      best_lap_time_ms: r.best_lap_time_ms,
      status_state: "Draft",
    };
  });

// Step 4: Create all results in batch
try {
  await Promise.all(newRows.map(row => base44.entities.Results.create(row)));
} catch (err) {
  toast.error(`Failed to create results: ${err.message}`);
  return;
}

// Step 5: Invalidate caches + notify
queryClient.invalidateQueries({ queryKey: ['results', eventId, sessionId] });
queryClient.invalidateQueries({ queryKey: ['drivers'] });

const skipped = preview.rows.length - newRows.length;
const msg = `Added ${newRows.length} result rows${driverIdMap.size > 0 ? `. Created ${driverIdMap.size} draft driver${driverIdMap.size !== 1 ? 's' : ''}` : ''}${skipped > 0 ? `. Skipped ${skipped} row${skipped !== 1 ? 's' : ''}` : ''}.`;
toast.success(msg);

// Step 6: Close dialog
onOpenChange(false);
```

### Result States After Import
```
All imported results:
  ├─ status_state: "Draft"
  ├─ published: false
  └─ No automatic session status change

Selected session:
  ├─ status: UNCHANGED (no auto-promotion)
  ├─ input_source: NOT updated (unlike Paste)
  └─ User must click workflow button to advance

Quick-created drivers:
  ├─ visibility_status: "draft"
  ├─ data_source: "historical_csv_import"
  └─ NOT published to public directory
```

---

## 12. DRAFT-ONLY SAVE BEHAVIOR

### Constraints
- **All imported results must be Draft:** `status_state: "Draft"` (hard requirement)
- **No auto-promote:** Session status does NOT change automatically
- **User-driven workflow:** User must call workflow buttons (Save Draft, Mark Provisional, Publish Official)

### Save Draft Button (Existing Workflow)
```
When user clicks "Save Draft" button in ResultsManager:
  1. Calls handleSaveDraft(rows) → upsertResult(rows)
  2. For each row:
     - If row.id exists: UPDATE Results record
     - Else: CREATE Results record
  3. Invalidate cache: results + drivers
  4. Show toast: "Results saved"
  5. If session was Official + now edited: revert to Provisional (existing logic)
```

### Session Lifecycle (Preserved)
```
User workflow unchanged:
  Draft → [Mark Provisional] → Provisional → [Publish Official] → Official → [Lock] → Locked
  
Imported results:
  ├─ Enter as: Draft
  ├─ User edits in ResultsQuickEntryTable (or ResultsManualTable)
  ├─ User clicks "Save Draft" (or Save button per row)
  └─ User clicks "Publish Official" or "Mark Provisional" to advance session

No special handling for imported results:
  ├─ Treated identically to pasted results
  ├─ Treated identically to manually-entered results
  └─ No "CSV import" vs "paste" distinction in downstream logic
```

---

## 13. ERROR HANDLING

### File Upload Errors
```
User interaction → System response:

No file selected
  → Disabled Import button until file chosen
  
File too large (> 10MB)
  → Show "File exceeds 10MB limit"
  
Invalid CSV (unparseable)
  → Show "Failed to parse CSV: [error detail]"
  
Header row missing
  → Show "Cannot find required columns: position, driver, status"
  
Encoding issues
  → Auto-detect UTF-8 vs Latin-1; show warning if non-standard
```

### Parsing Errors (Row-Level)
```
Per-row handling:

Invalid position (not integer or < 1)
  → Mark row invalid, show error badge + message
  
Missing driver name
  → Mark row invalid, show error badge
  
Unrecognized status
  → Normalize case, suggest valid value, mark invalid if still unrecognized
  
Invalid laps (negative)
  → Show warning, allow row if position/status/driver OK
  
Unparseable best_lap_time
  → Show warning, allow row, store null for that field
```

### Creation Errors (Commit-Phase)
```
Driver creation fails:
  → Toast error: "Failed to create driver: [reason]"
  → Stop import (don't create results for remaining rows)
  → Partial drivers created (user can retry or ignore)

Result creation fails:
  → Toast error: "Failed to create results: [reason]"
  → Some results may have been created
  → Invalidate cache to sync UI

Session locked:
  → Guard check prevents file selection ("Cannot import: session is locked")
```

### User Feedback
```
Toast messages:
  • Success: "Added 10 result rows. Created 2 draft drivers. Skipped 1 row."
  • Error: "Failed to create driver: duplicate name"
  • Warning: "File contains single-word driver names — admin should verify"
  • Info: "Importing..."

In-preview warnings:
  • Orange badge: ambiguous drivers (will skip)
  • Error list: invalid rows
  • Warning icon: laps > session total (if available)
```

---

## 14. DUPLICATE PREVENTION

### Driver-Level Dedup
**Mechanism:** `normalized_name` + `canonical_key` matching

```
On quick-create:
  1. Calculate: normalized_name = buildNormalizedName(firstName, lastName)
  2. Calculate: canonical_key = `driver:${toSlug(normalized_name)}`
  3. Check existing: query drivers by canonical_key
  4. If match found: skip creation, reuse existing driver
  5. Else: create new driver with these fields set

Example:
  CSV imports 2 rows: "John Smith" and "john smith" (different case)
  → Both normalize to: "john smith"
  → Both resolve to: canonical_key = "driver:john-smith"
  → First import creates: Driver(canonical_key: "driver:john-smith")
  → Second import finds: Driver(canonical_key: "driver:john-smith")
  → Both results link to same driver (automatic dedup)
```

### Result-Level Dedup
**Mechanism:** Session + Driver + Position uniqueness

```
Business rule: One result per (session, driver, position)

Current behavior (from 5B3):
  - No explicit dedup on create
  - Validation warns if position duplicate in same session
  - Preview table shows position duplicates

CSV import behavior (same as paste):
  - Show warning in preview if position duplicate
  - Allow import (validation choice)
  - Database constraints + app logic handle conflicts
```

### Repeated Imports from Same File
**Scenario:** User imports CSV twice by accident

```
Without dedup:
  • First import: 10 results created, 2 drivers created
  • Second import: 10 more results created, 2 drivers created (linked to existing)
  → 20 results total, but might have duplicate positions

With dedup:
  • Track: results created from which CSV import session
  • Future feature: check canonical_key to prevent re-importing same file
  • MVP: no tracking (user responsibility to avoid re-import)
```

---

## 15. RISKS

### Risk 1: Large File Freezes Browser
**Severity:** Medium  
**Scenario:** User uploads 5000-row CSV; browser hangs parsing

**Mitigation:**
- Limit: 1000 rows max (hard limit)
- Warning: "File exceeds 500 rows" (soft warning)
- Parsing: client-side in chunks with progress UI
- Estimated time: 1000 rows ≈ 200ms (acceptable)

---

### Risk 2: Ambiguous Drivers Block Import
**Severity:** Low  
**Scenario:** CSV has "John Smith"; system has 3 matches; admin must resolve first

**Mitigation:**
- Expected behavior (conservative choice)
- Link to ManageDrivers → Duplicate Finder in UI
- Error message directs user: "Resolve duplicates first"
- Does not prevent import; only skips ambiguous rows

---

### Risk 3: Quick-Create Drivers Not Reviewed
**Severity:** Medium  
**Scenario:** User quick-creates 20 drivers from CSV; driver names have typos

**Mitigation:**
- Drivers created as "draft" (not published)
- User can review in ManageDrivers before publishing
- Data source tracked: `data_source: 'historical_csv_import'`
- Admin can bulk-delete or edit if needed
- Limit: max 20 drivers per import (prevents mass-creation)

---

### Risk 4: Duplicate Results on Re-Import
**Severity:** Medium  
**Scenario:** User imports same CSV twice; 20 duplicate results in session

**Mitigation:**
- No automatic dedup on result level (by design)
- Preview shows duplicate positions (user sees them)
- User chooses whether to import
- Future: track CSV import metadata for one-click dedup

---

### Risk 5: Session Auto-Promotion Broken
**Severity:** Low  
**Scenario:** Code accidentally promotes session to Official after CSV import

**Mitigation:**
- Hard guard: `status_state: "Draft"` only on create
- No `updateSessionStatus` call in import flow
- No standings recalculation triggered
- Validated: import flow is identical to paste flow (5B3)

---

### Risk 6: Column Mapping User Error
**Severity:** Low  
**Scenario:** User maps "position" to "driver" column; results garbage

**Mitigation:**
- Show detected columns before parsing rows
- Allow manual override with dropdown
- Display first 5 sample rows to verify mapping
- Validation catches position < 1 (obvious error)

---

### Risk 7: No Session Selected (Guard Missing)
**Severity:** High  
**Scenario:** CSV dialog allows upload without session; creates orphan results

**Mitigation:**
- Guard: `if (!selectedSession) return <Card>Select a session</Card>`
- Hard requirement: session must be selected
- Tab disabled if no session (similar to paste)

---

## 16. FILE-BY-FILE IMPLEMENTATION PLAN

### Phase 5B4a: Core Implementation (1–2 day sprint)

#### File 1: `components/registrationdashboard/results/ResultsCsvImportDialog.jsx` (NEW)
**Lines:** ~500  
**Purpose:** CSV file upload + preview + import  
**Deps:** pasteDriverUtils, ResultsManager, base44 SDK

**Responsibilities:**
- File input (drag-drop + click)
- CSV parsing (parseCSV utility)
- Column detection (auto-detect aliases)
- Column mapping UI (user override)
- Row validation (per-row rules)
- Preview table (badges + checkboxes)
- Driver quick-create (reuse pasteDriverUtils)
- Import commit flow
- Toast messages + error handling

**Exports:**
```javascript
export default function ResultsCsvImportDialog({
  session,
  drivers,
  selectedEvent,
  isHistoricalMode,
  locked,
  onImport,
  importing,
})
```

**Key Functions Inside:**
- `parseCSV(text)` → { headers, rows }
- `detectColumns(headers)` → { position, driver, status, laps, ... }
- `validateRow(row, columns)` → { errors, isValid, ... }
- `handleFileUpload(file)` → parse + validate + show preview
- `handleImport()` → create drivers + results

---

#### File 2: `components/registrationdashboard/results/csvUtils.js` (NEW)
**Lines:** ~150  
**Purpose:** Reusable CSV parsing utilities  
**Deps:** none

**Responsibilities:**
- `parseCSV(text)` — Parse text into headers + rows
- `detectColumns(headers)` — Auto-detect column positions
- `normalizeHeader(headerText)` — Normalize header name
- `parseTimeString(timeStr)` — Parse "MM:SS.sss" to milliseconds

**Exports:**
```javascript
export function parseCSV(text) { ... }
export function detectColumns(headers) { ... }
export function normalizeHeader(h) { ... }
export function parseTimeString(t) { ... }
```

**No dependencies on ResultsManager or ResultsPasteDialog**

---

#### File 3: `components/registrationdashboard/ResultsManager.jsx` (MODIFY)
**Changes:** Add CSV tab + wire up ResultsCsvImportDialog

**Modifications:**
1. **Import new component:**
   ```javascript
   import ResultsCsvImportDialog from './results/ResultsCsvImportDialog';
   ```

2. **Add CSV tab content** (after CSV tab trigger):
   ```javascript
   <TabsContent value="csv">
     <ResultsCsvImportDialog
       session={selectedSession}
       drivers={drivers}
       selectedEvent={selectedEvent}
       isHistoricalMode={isHistoricalMode}
       locked={isLocked}
       onImport={handleImport}
       importing={importing}
     />
   </TabsContent>
   ```

3. **No new callbacks needed** — use existing `handleImport()` and `importing` state

**No changes to:**
- Session lifecycle
- Standings logic
- Paste workflow
- Manual entry workflow

---

#### File 4: No backend function changes
**Reason:** CSV import is client-side; uses existing Results.create

---

### Phase 5B4b: Advanced Features (FUTURE, not in MVP)
- Mapping profile save/load
- Batch CSV import queue
- Undo/rollback
- CSV standards (RFC 4180)
- Advanced time parsing
- Heat/bracket support

---

## 17. TESTING CHECKLIST

### Unit Tests (csvUtils.js)

- [ ] `parseCSV("...")` splits headers + rows correctly
- [ ] `detectColumns([...])` matches all column synonyms
- [ ] `detectColumns([...])` returns correct indices
- [ ] `normalizeHeader("POSITION")` → "position"
- [ ] `normalizeHeader("Laps Completed")` → "laps_completed"
- [ ] `parseTimeString("1:38.765")` → ~98765 (milliseconds)
- [ ] `parseTimeString("98765")` → 98765 (direct ms)
- [ ] `parseTimeString("invalid")` → null

---

### Integration Tests (ResultsCsvImportDialog)

- [ ] File upload works (click + drag-drop)
- [ ] File too large (> 10MB) → error message
- [ ] Invalid CSV (unparseable) → error message
- [ ] Valid CSV → preview shows rows + stats
- [ ] Column mapping auto-detect works
- [ ] User can override column mapping
- [ ] Preview shows 5 sample rows
- [ ] Validation badges appear (matched/unmatched/ambiguous/invalid)
- [ ] "Create?" checkboxes only on unmatched
- [ ] Ambiguous drivers have NO checkbox
- [ ] Single-word driver name shows warning
- [ ] Duplicate position shows warning
- [ ] Invalid rows show error details
- [ ] Summary bar updates correctly
- [ ] "Import X Rows" button disabled if > 20 create-selected
- [ ] Import button disabled if no session selected
- [ ] Import button disabled if session locked

---

### Workflow Tests (End-to-End)

- [ ] Upload valid CSV → matches 7 drivers, unmatched 2
- [ ] Select 1 unmatched for creation → import creates driver + result
- [ ] Imported results appear in ResultsQuickEntryTable
- [ ] Imported results are Draft status
- [ ] Session status unchanged after import
- [ ] Cache invalidated: results + drivers queries
- [ ] Toast shows correct counts
- [ ] User can edit imported rows
- [ ] User can click "Save Draft" (existing workflow)
- [ ] User can click "Publish Official" (existing workflow)
- [ ] Standings recalculate on Official (existing behavior)

---

### Regression Tests (Existing Features)

- [ ] Paste dialog still works (unchanged)
- [ ] Manual entry table still works (unchanged)
- [ ] Save Draft workflow unchanged
- [ ] Publish Official workflow unchanged
- [ ] Session locking unchanged
- [ ] Standings recalculation unchanged
- [ ] Historical Mode toggle unchanged
- [ ] Live Mode entry (non-CSV, non-paste) unchanged

---

### Error Case Tests

- [ ] Missing position → row invalid, skipped
- [ ] Missing driver → row invalid, skipped
- [ ] Ambiguous driver (3 matches) → row invalid, skipped, no checkbox
- [ ] Invalid status → row invalid, skipped
- [ ] Negative laps → warning, row valid
- [ ] Unparseable best_lap_time → warning, row valid
- [ ] Duplicate position in same session → warning in preview
- [ ] Driver quick-create fails → toast error, import stops
- [ ] Result creation fails → toast error, partial data (cache handles sync)

---

### Data Integrity Tests

- [ ] Quick-created drivers have `visibility_status: "draft"`
- [ ] Quick-created drivers have `data_source: "historical_csv_import"`
- [ ] Quick-created drivers have `canonical_key` set
- [ ] All imported results have `status_state: "Draft"`
- [ ] All imported results linked to correct driver
- [ ] Existing drivers reused (not duplicated)
- [ ] Event/session/series context preserved on results

---

## IMPLEMENTATION DEPENDENCIES

### Must Be Complete (Blocking)
- ✅ Phase 5B1: Paste dialog
- ✅ Phase 5B2: Enhanced paste
- ✅ Phase 5B3: Quick-create driver + pasteDriverUtils.js

### Must Remain Stable
- ✅ ResultsManager (existing)
- ✅ Session lifecycle (no changes)
- ✅ Standings logic (no changes)
- ✅ Historical Mode toggle (reuse)

---

## IMPLEMENTATION EFFORT ESTIMATE

| Task | Hours | Notes |
|------|-------|-------|
| csvUtils.js | 2 | Parsing + column detection |
| ResultsCsvImportDialog.jsx | 4 | UI + validation + preview + import |
| ResultsManager.jsx integration | 1 | Tab wiring (simple) |
| Testing | 3 | Unit + integration + regression |
| **TOTAL** | **10** | **1.25-day sprint** |

---

## GO/NO-GO CHECKLIST

Before implementation starts:

- [ ] Phase 5B3 locked (quick-create driver)
- [ ] Planning audit reviewed + approved
- [ ] Implementation plan reviewed + approved
- [ ] All 17 sections above understood
- [ ] CSV column spec finalized
- [ ] Error handling strategy agreed
- [ ] Testing scope understood
- [ ] No schema changes required (VERIFIED)
- [ ] No backend changes required (VERIFIED)
- [ ] No standings changes required (VERIFIED)
- [ ] No session lifecycle changes required (VERIFIED)
- [ ] No public page changes required (VERIFIED)

---

**END OF PHASE 5B4 IMPLEMENTATION PLAN**

Ready to proceed with Phase 5B4a implementation once approval given.