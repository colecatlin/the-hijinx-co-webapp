# Phase 5B — Historical Results Entry Roadmap (Condensed)

**Objective:** Enable fast backfill of past official results (e.g., AMSOIL 2024 Rounds 1–2) without schema changes or standings logic rewrites.

**Current Pain:** 30-driver session takes ~20 minutes (modal click per row). Target: <5 minutes.

---

## 5B1 — Inline Quick-Entry Table

**Goal:** Replace modal edit workflow with inline, keyboard-navigable cell editing. Tab between cells, Enter to save row, move to next.

**Files Affected:**
- `components/registrationdashboard/results/ResultsQuickEntryTable.jsx` (NEW)
- `components/registrationdashboard/ResultsManager.jsx` (add tab, swap import)
- `components/registrationdashboard/results/ResultsManualEntry.jsx` (archive/remove)

**Exact UI Change:**
```
Old: Click row → modal dialog opens → fill 7 fields → save
New: Click cell → edit inline → Tab to next cell → Enter saves row
     Keyboard shortcuts: Tab (next), Shift+Tab (prev), Enter (save), Esc (cancel)
```

**Exact Data Behavior:**
- On blur or Enter: call `upsertResult()` for that row (debounced 300ms)
- Toast: "Row saved" (quiet notification)
- If error: highlight cell red, show error message, don't move to next row
- SessionStorage: persist unsaved edits per row (key: `results_draft_${rowId}`)

**Risk Level:** Medium
- Keyboard nav is new pattern; users must learn Tab behavior
- Blur-based save is async; rapid typing might trigger multiple saves

**Testing Checklist:**
- [ ] Tab through 10 rows smoothly (no lag)
- [ ] Enter saves row and moves to next row's driver cell
- [ ] Esc cancels edit, restores previous value
- [ ] Unsaved row persists on page reload (SessionStorage)
- [ ] Position field shows validation error (duplicate, out-of-range)
- [ ] Driver autocomplete appears in driver cell (fuzzy search on 100 drivers)

**Estimate:** 1 week

---

## 5B2 — Bulk Paste Entry

**Goal:** Allow admins to paste tab-separated or CSV data (30+ rows at once) without row-by-row clicking.

**Files Affected:**
- `components/registrationdashboard/results/ResultsPasteDialog.jsx` (NEW)
- `components/registrationdashboard/ResultsManager.jsx` (add button + modal)

**Exact UI Change:**
```
ResultsManager top bar: Add button "[Paste Bulk Results]"
Click → Modal:
  - Textarea: "Paste CSV or tab-separated data"
  - Expected columns: driver_name | position | status | laps | best_lap | points
  - Preview table (first 10 rows)
  - Button: "Insert All Rows"
```

**Exact Data Behavior:**
- Parse textarea (CSV or TSV)
- Auto-detect separator (tab vs comma)
- For each row:
  - Resolve driver name via `resolveDriver()` (same logic as CSV import)
  - If driver not found: mark as "unmatched", skip row, show warning
  - Create Result stub (status=Draft, matched drivers only)
- Add N rows to current session
- OperationLog: "Pasted 28 rows, 2 unmatched"

**Risk Level:** Low
- Reuses existing CSV parsing logic
- No schema changes
- Unmatched drivers are soft-skipped with warning

**Testing Checklist:**
- [ ] Paste 30 rows from Excel (tab-separated); all insert correctly
- [ ] Resolve driver names (fuzzy match, exact match, no match)
- [ ] Preview shows unmatched drivers in red
- [ ] Button disabled if no valid rows
- [ ] Session result count updates after insert
- [ ] OperationLog entry created

**Estimate:** 3–4 days

---

## 5B3 — Missing Driver Quick-Create

**Goal:** If a driver name doesn't resolve, allow inline creation without leaving the workflow.

**Files Affected:**
- `components/registrationdashboard/results/DriverAutocomplete.jsx` (NEW or enhance)
- `components/registrationdashboard/results/CreateDriverQuickModal.jsx` (NEW)
- `components/registrationdashboard/results/ResultsQuickEntryTable.jsx` (add click handler)

**Exact UI Change:**
```
Driver cell autocomplete:
  - Type "John Smith"
  - No matches → show "[+ Create 'John Smith']" link
  - Click → Quick modal:
    First Name: [John] (prefilled)
    Last Name: [Smith] (prefilled)
    Car Number: [] (optional)
    [Create Driver] button
  - New driver created, auto-selected in current row
```

**Exact Data Behavior:**
- On "Create" click: call `base44.entities.Driver.create({ first_name, last_name, primary_number })`
- New driver ID returned → auto-populate driver_id in result row
- Toast: "Driver 'John Smith' created"
- Newly created driver now appears in dropdown for future rows in this session

**Risk Level:** Low
- Driver creation is write-once, no complex validation
- Only creates if admin explicitly confirms
- Doesn't affect other sessions

**Testing Checklist:**
- [ ] Type partial name "john s" in driver field
- [ ] No matches; "[+ Create]" link appears
- [ ] Click create; modal shows prefilled first/last
- [ ] Enter car number (optional)
- [ ] Click Create Driver; new driver added to DB
- [ ] Row driver field auto-populated with new driver
- [ ] New driver appears in dropdown for next row

**Estimate:** 3 days

---

## 5B4 — CSV Historical Import Support

**Goal:** Dedicated CSV import flow optimized for historical backfill (simpler than live-event CSV import).

**Files Affected:**
- `components/registrationdashboard/results/ResultsCsvHistoricalImport.jsx` (NEW)
- `components/registrationdashboard/ResultsManager.jsx` (add tab or button)
- `functions/smartCSVImport.js` (reuse or reference)

**Exact UI Change:**
```
CSV Import tab (in ResultsManager):
  - Drag/drop zone: "Drop your results CSV"
  - Column mapping (auto-detect):
    * driver_name OR (driver_first_name + driver_last_name)
    * position (required)
    * status (optional, default "Running")
    * laps, best_lap, points (optional)
  - Preview table (first 25 rows, validation status)
  - Summary: "25 valid, 2 unmatched, 0 errors"
  - Button: "Import All Valid Rows" (disabled if no valid rows)
```

**Exact Data Behavior:**
- Parse CSV (reuse existing CSV parser from ResultsCsvImportDialog)
- For each row:
  - Resolve driver (by name or car number)
  - If unmatched: add to skipped list, don't create result
  - If matched: create Result (status_state=Draft, program_id blank for historical)
- Bulk create all valid rows (Promise.all)
- OperationLog: "CSV import: 25 created, 2 skipped, session=XYZ"
- Update session input_source="CSV"

**Risk Level:** Low
- Reuses proven CSV parsing and driver resolution
- Skipped rows are non-destructive (just warnings)
- No schema changes (program_id optional per Phase 5A)

**Testing Checklist:**
- [ ] Upload CSV with 50 rows
- [ ] Auto-detect columns (driver_name, position, status, laps)
- [ ] Preview shows 25 rows; summary accurate
- [ ] Click Import; 48 rows created, 2 skipped (unmatched), toast confirms
- [ ] Check Results table; 48 new Draft rows present
- [ ] Session input_source updated to "CSV"
- [ ] OperationLog entry shows skipped drivers

**Estimate:** 4–5 days

---

## 5B5 — Verification Checklist & Standings Trigger

**Goal:** Before publishing Official, show admin a quick verification checklist. After publish, confirm standings are calculated.

**Files Affected:**
- `components/registrationdashboard/results/PrePublishChecklist.jsx` (NEW)
- `components/registrationdashboard/ResultsManager.jsx` (enhance confirm dialog)
- `components/registrationdashboard/results/StandingsSyncStatus.jsx` (NEW)

**Exact UI Change:**
```
Before clicking "Publish Official" button:
  Show card: "Pre-Publish Verification"
    ☑ {N} drivers assigned
    ☑ Positions 1–{N} filled (no gaps)
    ☑ No duplicate positions
    ⚠ {M} rows missing lap times (OK to publish)
  
  Green checkmarks = automatic gate
  Warnings = optional (can publish anyway)

On "Publish Official" click → Confirm dialog (enhanced):
  "Publishing 30 results as Official
   • Standings will be recalculated
   • Historical Mode: Entry roster checks bypassed
   [Cancel] [Confirm]"

After confirm:
  Toast: "Publishing… Calculating standings"
  Wait 3–5s → Toast: "Standings updated for 28 drivers"
```

**Exact Data Behavior:**
- Pre-publish checklist: local validation, no DB calls
  - Count drivers, check positions 1..N present, detect duplicates
  - Show as read-only summary (non-blocking)
- On Publish Official:
  - Call `updateSessionStatus.mutate('Official')` (existing)
  - This triggers: `syncResultsVisibilityFromSession()` + `recomputeStandingsForFinalSession()` (if Final)
  - Toast progress: "Calculating…" → "Done" (poll or callback)

**Risk Level:** Very Low
- Checklist is UI-only, no logic changes
- Standings calculation is existing function (Phase 5A)
- Toast is cosmetic feedback

**Testing Checklist:**
- [ ] Open results with 30 rows, all assigned drivers
- [ ] Checklist shows: ☑ 30 drivers, ☑ positions 1–30, ☑ no duplicates
- [ ] Remove one position; checklist shows: ✗ gap detected
- [ ] Can't publish until gap filled
- [ ] Publish; confirm dialog shows
- [ ] After publish: toast shows "Standings updated"
- [ ] Check Standings tab; 30 drivers ranked

**Estimate:** 3 days

---

## Summary: 5B Phases at a Glance

| Phase | Goal | Time | Files | Risk | MVP? |
|-------|------|------|-------|------|------|
| **5B1** | Inline quick-entry (Tab nav, blur-save) | 1 week | Quick-entry table, auto-complete | Medium | ✅ YES |
| **5B2** | Bulk paste (30 rows in one paste) | 4 days | Paste dialog, parser | Low | ✅ YES |
| **5B3** | Missing driver create (inline modal) | 3 days | Driver create modal, auto-complete | Low | ⚠️ Nice-to-have |
| **5B4** | CSV import (dedicated historical flow) | 4–5 days | CSV import dialog, existing parser | Low | ⚠️ Nice-to-have |
| **5B5** | Pre-publish checklist + standings sync | 3 days | Checklist card, toast feedback | Very Low | ⚠️ Polish |

---

## Implementation Order (MVP-First)

**Phase 1 (Week 1):**
1. **5B1** — Inline quick-entry table (biggest UX gain: 20min → 5min)
2. **5B2** — Bulk paste (enables copy-from-Excel workflow)

**Phase 2 (Week 2):**
3. **5B3** — Missing driver quick-create (quality-of-life)
4. **5B4** — CSV import (operational convenience)

**Phase 3 (Week 3):**
5. **5B5** — Verification + standings feedback (polish)

---

## Key Design Principles (No Schema Changes)

✅ Reuse existing:
- `upsertResult()` mutation
- `syncResultsVisibilityFromSession()` function
- `recomputeStandingsForFinalSession()` function
- Driver resolution logic (`resolveDriver`, `normalizeName`)
- CSV parsing (from ResultsCsvImportDialog)

✅ Keep:
- Results schema (program_id optional, per Phase 5A)
- Session schema (is_historical flag, existing)
- Historical Mode toggle (existing)

✅ No changes to:
- Public pages (results visibility handled by existing sync)
- Standings calculation (reuse existing functions)
- Validation gates (Entry roster checks bypass in Historical Mode, existing)

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Time to enter 30-driver session | <5 min | ~20 min |
| Data loss incidents | 0 | Unknown |
| Admin friction (perceived) | Low (keyboard nav intuitive) | High (modal clicking) |

---

## Risk Summary

**Lowest Risk (5B2, 5B3, 5B5):** Reuse existing logic, additive features, no schema/function changes.

**Medium Risk (5B1):** New keyboard navigation pattern; async blur-save needs testing.

**Mitigations:**
- SessionStorage persistence (never lose unsaved edits)
- Debounced saves (prevent double-create on fast typing)
- Row validation before save (position duplicates, missing driver)
- Clear error messages on save failure
- Comprehensive testing checklist per phase

---

**Next Step:** Approval → Start 5B1 (inline quick-entry) immediately after Phase 5A is locked.