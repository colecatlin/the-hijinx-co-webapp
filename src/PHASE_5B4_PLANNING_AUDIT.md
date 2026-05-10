# PHASE 5B4: CSV Historical Import Support
## Planning Audit (No Implementation)

**Date:** 2026-05-10  
**Status:** PLANNING PHASE ONLY — NO CODE CHANGES YET  
**Previous Phases:** 5B1 (Paste), 5B2 (Enhanced Paste), 5B3 (Quick-Create Driver)  

---

## EXECUTIVE SUMMARY

Phase 5B4 will add **CSV file import** support for official historical results, leveraging the driver matching and quick-create logic already built in Phase 5B3. Unlike the paste dialog (ad-hoc clipboard input), CSV import will support:

1. Batch file uploads with structured column headers
2. Automatic column mapping and reuse of detected headers across sessions
3. Optional: Save mapping profiles for repeated imports from the same source
4. Same driver matching, quick-create, and validation as paste flow
5. Optional: Preview-then-commit pattern (vs immediate import)

---

## CURRENT STATE ANALYSIS

### 1. Current CSV Import Behavior

**Where:** `components/registrationdashboard/results/ResultsCsvImportDialog.jsx` (mentioned in ResultsManager but file not found)

**Current Implementation Gaps:**
- File not located in repository; likely a stub or removed component
- ResultsManager references it on line 28 but imports `ResultsCsvImportDialog` from path `./ResultsCsvImportDialog` (no `/results` subfolder)
- CSV import tab exists in ResultsManager (line 814–823) but component may be minimal/placeholder

**Existing CSV Export Logic:**
- `downloadCSV()` function in ResultsManager (lines 41–48)
- Exports columns: `position`, `driver_id`, `car_number`, `status`, `laps_completed`, `best_lap_time_ms`, `points`, `notes`
- Uses comma-separated format with quoted strings for safe CSV serialization

### 2. Historical Mode Context Support

**Current State:**
- ResultsManager has `isHistoricalMode` state (line 72)
- When ON: bypasses Entry roster checks, tech inspection, check-in validation (lines 424–451)
- Paste dialog and Quick Entry table are ONLY shown when `isHistoricalMode === true` (lines 773–798)
- CSV import tab shown for ALL modes (line 814–823)

**Question:** Should CSV import ALSO be limited to Historical Mode only, or available in both Live and Historical?

**Recommendation:** CSV import should be available in BOTH modes:
- **Live Mode:** Import from official APIs/T&S timing systems (future)
- **Historical Mode:** Import from past archives or manual source files

---

## 3. Column Support Analysis

### Export Columns (Current)
From `downloadCSV()` in ResultsManager:
```
position, driver_id, car_number, status, laps_completed, best_lap_time_ms, points, notes
```

### Paste Dialog Columns (Current)
From ResultsPasteDialog:
```
position, driver (full name), status, laps (optional)
```

### Proposed CSV Import Columns

**Required Columns:**
1. **`position`** — Finishing position (1, 2, 3, etc.)
   - Type: integer
   - Validation: > 0
   - Error handling: mark row as invalid if missing or non-numeric

2. **`driver` or `driver_name`** — Full driver name for matching
   - Type: string
   - Matching: normalized name matching + quick-create support (Phase 5B3)
   - Handles: single names (warning), comma-reversed, multi-word last names

3. **`status`** — Race finish status
   - Type: enum: Running, DNF, DNS, DSQ, DNP
   - Default: Running
   - Validation: normalize case; mark invalid if unrecognized value

**Optional Columns:**
1. **`laps` or `laps_completed`** — Laps completed
   - Type: integer, default 0
   - Validation: >= 0

2. **`best_lap_time` or `best_lap_time_ms`** — Best lap time
   - Type: integer (milliseconds) or time string (to be parsed)
   - Format support: `MM:SS.sss` or integer milliseconds
   - Default: null

3. **`points`** — Points awarded
   - Type: numeric (integer or decimal)
   - Default: null (will not affect standings if provided, as standings are recalculated)

4. **`car_number`** — Car/bib number
   - Type: string
   - Used for: roster matching (fallback if driver name ambiguous)
   - Default: null

5. **`notes`** — Additional notes
   - Type: string
   - Default: null

6. **`heat_number`** — Heat identifier (for multi-heat sessions)
   - Type: integer
   - Format: 1, 2, 3, etc.
   - Default: null (null = single-heat session)

### Column Mapping Strategy

**Auto-Detection:**
1. Read header row (first non-empty line)
2. Normalize header names: lowercase, trim spaces, remove special chars
3. Match against known synonyms for each column:
   - `position`: "position", "pos", "finishing_position", "place"
   - `driver`: "driver", "driver_name", "driver_full_name", "name", "driver name"
   - `status`: "status", "finish_status", "result_status"
   - `laps`: "laps", "laps_completed", "laps_led"
   - `best_lap_time`: "best_lap_time", "best_lap_time_ms", "fastest_lap", "lap_time"
   - `points`: "points", "point", "pts"
   - `car_number`: "car_number", "car #", "number", "#"
   - `notes`: "notes", "notes", "comment"
   - `heat_number`: "heat", "heat_number", "heat #", "heat_no"

**User Override:**
- Show detected columns to user before import
- Allow manual column selection via dropdown for any ambiguous or undetected columns
- Remember user's mapping choices for this session (optional: save as profile)

---

## 4. Driver Matching & Quick-Create

**Current (Phase 5B3):**
- `pasteDriverUtils.js` provides all needed utilities
- `resolveDriverMatch(firstName, lastName, drivers)` returns:
  - `{ status: "matched", driver: DriverRecord }`
  - `{ status: "unmatched", driver: null }`
  - `{ status: "ambiguous", driver: null, count: N }`
- `buildMinimalDriverPayload(firstName, lastName)` creates draft driver record
- `splitDriverName(fullName)` handles all name formats

**CSV Import Integration:**
- CSV will use IDENTICAL logic as paste dialog
- Driver matching: normalized name lookup
- Ambiguous matches: skip row + warn (no quick-create offered)
- Unmatched drivers: offer "Create draft driver" option
- Support shared driver quick-create with Paste flow

**Implementation Note:**
- Extract driver-matching logic into a shared utility (if not already)
- Both CSV and Paste dialogs should use the same matching/creation code

---

## 5. CSV vs. Paste Comparison

| Feature | Paste Dialog | CSV Import |
|---------|-------------|-----------|
| Input method | Clipboard (tab-delimited) | File upload |
| Max rows per action | 100 (hardcoded) | 500–1000 (configurable) |
| Column detection | Manual headers in first row | Auto-detect + user override |
| Driver matching | Paste name → match → quick-create | Name → match → quick-create |
| Preview before commit | Yes (required) | Yes (recommended) |
| Save mapping | No | Optional (profile) |
| Error handling | Per-row validation + skip | Per-row validation + skip |
| Validation reporting | Table with badges + notes | Table with badges + notes |
| Speed | Manual paste workflow | Batch file processing |

---

## 6. How Imported Rows Should Map to Results

**CSV Row → Result Entity:**

```json
{
  "event_id": "selectedEvent.id",
  "session_id": "selectedSession.id",
  "session_type": "selectedSession.session_type",
  "series_id": "selectedEvent.series_id",
  "series_class_id": "selectedSession.series_class_id",
  "driver_id": "resolved or quick-created driver ID",
  "position": 1,
  "status": "Running",
  "laps_completed": 45,
  "best_lap_time_ms": 98765,
  "points": null,
  "status_state": "Draft",
  "heat_number": null
}
```

**Notes:**
- `program_id`: not set (no Entry linking for Historical mode)
- `team_id`: resolved from Entry if available, else null
- `status_state`: always "Draft" (user can promote via workflow buttons)
- `points`: imported from CSV if provided, but will be recalculated when session marked Official anyway

---

## 7. Validation Logic

**Row-Level Validation:**

| Field | Rule | Severity | Action |
|-------|------|----------|--------|
| position | Required, > 0, integer | Error | Skip row, show badge + error |
| driver | Required, resolvable or creatable | Error | Skip row if ambiguous; allow create if unmatched |
| status | Required, valid enum | Error | Skip row, show badge + error |
| laps | Optional, >= 0 if provided | Warning | Allow import, flag in notes |
| best_lap_time | Optional, valid format | Warning | Allow import, flag if unparseable |
| single-word driver name | Unmatched + single word | Warning | Flag in preview, allow create |

**Table Display:**
- ✅ Green "Matched" badge + driver name
- 🟡 Amber "Unmatched" badge + "Create?" checkbox
- 🔴 Orange "Ambiguous" badge + error (no checkbox)
- ❌ Red "Invalid" badge + errors listed

---

## 8. Preview vs. Immediate Import

**Decision: PREVIEW REQUIRED** (same as Paste)

**Workflow:**
1. User uploads CSV file
2. System auto-detects columns + shows mapping confirmation UI
3. User can adjust column mappings if needed
4. System parses rows + displays table preview
5. User reviews rows (matched/unmatched/invalid/errors)
6. User selects which unmatched drivers to create
7. User clicks "Import" to confirm
8. System creates drivers + results + invalidates cache

**Why Preview:**
- Safety: user can see what will be imported
- Driver quick-create opt-in: prevent accidental bulk driver creation
- Error visibility: flag and explain issues before commit
- Mapping visibility: show user-selected column mapping

---

## 9. Risks & Mitigations

### Risk 1: Large File Uploads
**Concern:** User uploads 10,000-row CSV; browser hangs parsing

**Mitigation:**
- Limit: 1000 rows max per file
- Warn if > 500 rows
- Parse in chunks; show progress bar
- Client-side validation only (no backend parsing)

### Risk 2: Ambiguous Driver Names
**Concern:** CSV contains "John Smith"; system has 3 drivers with that name

**Current Handling (Paste):**
- Mark row as ambiguous
- Do NOT offer quick-create
- Skip row on import + warn

**Recommendation:** Same for CSV

### Risk 3: Duplicate Drivers Created
**Concern:** User imports same CSV twice; creates duplicate drivers

**Mitigation:**
- Use `normalized_name` + `canonical_key` for dedup
- System blocks creating driver if `canonical_key` exists
- Show warning if creating driver would duplicate an existing one
- Link to Duplicate Finder in management dashboard

### Risk 4: Standings Impact
**Concern:** Importing historical results changes current standings unexpectedly

**Mitigation:**
- Standings are ONLY recalculated when session marked Official
- Results imported in "Draft" state
- User must explicitly promote session to Official
- Clear warning in workflow UI: "Standings will recalculate when marked Official"

### Risk 5: Column Mapping Errors
**Concern:** Auto-detection misidentifies columns; user imports garbage

**Mitigation:**
- Show detected columns to user before parsing rows
- Allow manual override for each column
- Display first 5 rows as sample preview
- Clearly label "Required" vs "Optional" columns

### Risk 6: Mixed Single/Multi-Name Drivers
**Concern:** CSV has both "John Smith" and "Smith" (single word)

**Mitigation:**
- Warn user: "Single-word driver name — may need manual review"
- Show in preview table with flag
- Allow import but mark for admin follow-up
- Track `data_source: 'historical_csv_import'` for filtering in ManageDrivers

---

## 10. Implementation Phases

### Phase 5B4a: Core CSV Import (Foundation)
**Deliverables:**
1. Create `ResultsCsvImportDialog.jsx` component
   - File upload input
   - CSV parsing + header detection
   - Column mapping UI (auto-detect + manual override)
   - Row validation + preview table
   - "Import" button triggering data creation

2. Reuse utilities:
   - `pasteDriverUtils.js` for driver name handling
   - Same validation logic as Paste
   - Same quick-create workflow

3. Integration in ResultsManager:
   - CSV tab calls new component
   - Receives `drivers`, `selectedEvent`, `selectedSession`, `isHistoricalMode`
   - Callback: `onImport(rows, skippedCount, metadata)`
   - Same as Paste: invalidates queries, shows toast

**Testing:**
- Parse valid CSV with all columns
- Parse CSV with missing optional columns
- Parse CSV with invalid column names (auto-detect works correctly)
- Handle user manual column override
- Validate all row validation rules
- Test quick-create unmatched drivers
- Test ambiguous driver handling
- Test single-word name warning

---

### Phase 5B4b: Advanced Features (Post-MVP)
**Deliverables (FUTURE, not 5B4):**
1. Mapping profiles: save/load column mapping by filename pattern
2. Batch import: queue multiple CSV files for sequential import
3. Undo/rollback: revert imported results within a session
4. CSV standards: support RFC 4180 CSV (quoted fields, escaped quotes)
5. Time format parsing: support various lap time formats
6. Duplicate detection: warn if importing same file twice
7. Heat/bracket support: proper heat_number import + session binding
8. API source validation: import from remote CSV URL (not just local file)

---

## 11. Testing Checklist (5B4a MVP)

### Unit Tests
- [ ] `parseCSV()` correctly extracts headers and rows
- [ ] Column auto-detection matches all synonyms
- [ ] User column override works correctly
- [ ] Driver name splitting handles all formats
- [ ] Driver matching works with existing drivers
- [ ] Validation rules applied per-row correctly

### Integration Tests
- [ ] Upload valid CSV with 10 rows
- [ ] Import creates all results with correct fields
- [ ] Quick-create creates draft drivers with data_source
- [ ] Ambiguous drivers skipped with warning
- [ ] Invalid rows shown in preview + not imported
- [ ] Historical mode respected (no Entry/tech checks)
- [ ] Standings query invalidated after import
- [ ] Toast shows correct count (imported + created + skipped)

### UI Tests
- [ ] File upload input works
- [ ] Column mapping shows detected columns
- [ ] Preview table displays all rows with correct badges
- [ ] "Create?" checkboxes only shown for unmatched (not ambiguous/invalid)
- [ ] Limit warning shown if > 500 rows
- [ ] Error messaging is clear + actionable
- [ ] Tab switching doesn't lose data

### Smoke Tests
- [ ] CSV import in Live mode (results, no driver quick-create)
- [ ] CSV import in Historical mode (same + driver creation)
- [ ] Mixed matched/unmatched/ambiguous/invalid rows in one file
- [ ] Subsequent imports don't crash (cache invalidation works)
- [ ] Export CSV, re-import: round-trip test

---

## 12. Related Components & Utilities

**Existing code to reuse:**
- `pasteDriverUtils.js` — Name splitting, matching, payload building
- `ResultsPasteDialog.jsx` — Validation logic, driver quick-create pattern
- `ResultsQuickEntryTable.jsx` — Manual entry table (UI pattern ref)
- `ResultsManager.jsx` — Callbacks, cache invalidation, Historical Mode logic
- `sessionLifecycle.js` — Session status constants
- `resultsValidation.js` — Existing validation utilities

**New files to create:**
- `ResultsCsvImportDialog.jsx` — Main CSV import component
- Optional: `csvUtils.js` — CSV parsing, column detection helpers

---

## 13. Schema & Data Integrity Notes

**NO CHANGES NEEDED:**
- Results entity schema (unchanged)
- Driver entity schema (unchanged)
- Session entity schema (unchanged)

**Data integrity maintained:**
- Results created in "Draft" state (mutable)
- Driver quick-created with draft visibility (not published)
- No standings impact until session marked Official
- All records tagged with `data_source` for audit trail

---

## 14. Performance Considerations

**Client-Side Parsing:**
- File upload + CSV parse happens in browser
- Ideal: < 1000 rows per file
- Parsing time estimate: 1000 rows ≈ 100–200ms (acceptable)

**Recommendations:**
- Debounce file input changes
- Show progress bar for large files
- Lazy-load preview table (virtualize rows if > 100)

---

## 15. Documentation Artifacts

**User-Facing:**
1. Help text: "Upload a CSV file with columns: position, driver, status, laps (optional)"
2. Column mapping UI: show detected columns + allow override
3. Toast messages: show import results + driver creation count
4. Error messages: clear, actionable guidance

**Admin-Facing:**
1. Data source tracking: all CSV-imported drivers tagged `data_source: 'historical_csv_import'`
2. Audit log: track CSV imports via OperationLog
3. Management dashboard: filter/find CSV-imported records

---

## 16. Known Unknowns & Decisions Needed

**Open Questions:**

1. **Should CSV import be available in Live Mode?**
   - Proposed: Yes (for future API imports)
   - Current: Paste dialog limited to Historical Mode only

2. **Should CSV import support driver quick-create in Live Mode?**
   - Proposed: No (Live mode should only import pre-existing drivers)
   - Historical Mode: Yes (allow both)

3. **Should we save column mapping profiles?**
   - Proposed: MVP = No; Future = Yes (Phase 5B4b)
   - Simplification for initial release

4. **Max row limit: 500 or 1000?**
   - Proposed: 1000 rows max (configurable constant)
   - Warning at 500 rows

5. **Heat/bracket support in MVP?**
   - Proposed: MVP = Optional support (parse but don't require)
   - Full support: Phase 5B4b

**Recommendation:** Proceed with MVP (Phase 5B4a) with these decisions:
- CSV available in both Live + Historical modes
- Quick-create only in Historical mode
- No profile saving (MVP)
- 1000-row max limit
- Optional heat_number column support

---

## 17. Phase 5B4 Lock Status

### Pre-Lock Checklist
- [ ] Phase 5B3 (Quick-Create Driver) is locked ✓
- [ ] All utilities (`pasteDriverUtils.js`) are stable ✓
- [ ] Historical Mode logic in ResultsManager is complete ✓
- [ ] Planning document reviewed + decisions made (THIS AUDIT)
- [ ] Risks + mitigations identified
- [ ] Testing strategy defined
- [ ] No schema changes required
- [ ] No standings logic touched

### Ready for Implementation?
**YES** — Phase 5B4a can proceed with Phase 5B3 locked.

Estimated effort:
- CSV parsing + UI: 4–6 hours
- Integration + testing: 3–4 hours
- Total: 1–2 day sprint

---

## 18. Appendix: Example CSV Formats

### Format A: Minimal (Paste-style)
```
position	driver	status	laps
1	John Smith	Running	45
2	Jane Doe	Running	45
3	Bob Johnson	DNF	32
```

### Format B: Full (Export/Import roundtrip)
```
position,driver_id,car_number,status,laps_completed,best_lap_time_ms,points,notes
1,driver_123,45,Running,45,98765,,
2,driver_456,22,Running,45,98900,,
3,driver_789,88,DNF,32,99100,,N/A
```

### Format C: Driver Name + Optional
```
position,driver,status,laps,best_lap_time,car_number,heat,notes
1,John Smith,Running,45,1:38.765,45,1,"Fast lap"
2,Jane Doe,Running,45,1:38.900,22,1,
3,Bob Johnson,DNF,32,1:39.100,88,1,"Engine failure"
```

### Format D: Historical Archive (external source)
```
Pos,Driver Name,Result,Laps,Best Lap,Number,Notes
1,Smith John,Finish,45,1:38.765,45,Winner
2,Doe Jane,Finish,45,1:38.900,22,
3,Johnson Bob,DNF,32,1:39.100,88,Crashed turn 3
```

---

## Summary

Phase 5B4 (CSV Historical Import) will build on the robust driver-matching and quick-create infrastructure from Phase 5B3 to enable batch importing of historical results from CSV files. The feature will:

1. **Support structured file uploads** with auto-detected column headers
2. **Reuse driver matching & quick-create logic** from Paste dialog
3. **Provide preview-then-commit workflow** with validation feedback
4. **Maintain data integrity** (draft visibility, dedup keys, audit trails)
5. **Work in Historical Mode** (+ future Live mode support)
6. **Not touch standings, schemas, or session lifecycle** logic

Ready to lock planning and proceed with Phase 5B4a implementation.

---

**END OF PHASE 5B4 PLANNING AUDIT**