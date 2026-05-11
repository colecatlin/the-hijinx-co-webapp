# REVISION R7E PART 2 — ResultsManager Ownership Cutover Audit

**Date:** 2026-05-11  
**Phase:** Planning & Analysis Only (NO IMPLEMENTATION YET)  
**Status:** Audit Report — Recommendations for Future Migration  

---

## PART 1: ResultsManager Current Ownership Map

### Component Props Signature

```javascript
ResultsManager({
  selectedEvent,           // Event entity (required)
  initialSessionId,        // Pre-selected session ID for targeting
  isAdmin,                 // Admin permission flag
  canAction,               // Permission check function or array
  dashboardContext,        // Shared dashboard context
  invalidateAfterOperation,// Cache invalidation handler
  standingsLastCalculatedAt, // Timestamp for standings health
  onSetStandingsDirty,     // Callback: mark standings dirty
  onResultsProvisional,    // Callback: session marked Provisional
  onResultsOfficial,       // Callback: session marked Official
  onResultsLocked,         // Callback: session locked
})
```

### Query Dependencies

| Query Key | Purpose | Scope | Used By |
|-----------|---------|-------|---------|
| `['sessions', eventId]` | List sessions for event | Event-scoped | Session selector, validation |
| `['results', eventId, sessionId]` | Results for selected session | Session-scoped | Manual entry, CSV import, publish |
| `['drivers']` | Full driver roster | App-scoped | Driver matching, validation |
| `['eventClasses', eventId]` | Event class definitions | Event-scoped | Class filtering, session grouping |
| `['seriesClasses']` | Series class definitions | App-scoped | Class metadata, standings lookup |
| `['entries', eventId]` | Roster for event | Event-scoped | Entry validation, roster checks |
| `['techTemplates']` | Tech requirements | App-scoped | Tech validation for publish |

### Mutation Dependencies

| Mutation | Operation | Critical Behavior | Safe to Migrate |
|----------|-----------|-------------------|-----------------|
| `upsertResult` | Create/update Results rows | Batch update, idempotent | **YES** — read-only derived state |
| `importResults` | CSV bulk import | OperationLog creation | **YES** — self-contained |
| `updateSessionStatus` | Session status transition | **HIGH-RISK** — see below | **NO** — complex lifecycle |

### updateSessionStatus — CRITICAL MUTATION ANALYSIS

**Lines 323–410 in ResultsManager.jsx**

This mutation is the **most dangerous** operation because it:

1. **Transition State Machine** — manages Draft → Provisional → Official → Locked
2. **Result Publishing** — marks results Official and published when session moves to Official
3. **Visibility Sync** — calls `syncResultsVisibilityFromSession()` to publish results to public
4. **Standings Trigger** — calls `recomputeStandingsForFinalSession()` for Final/Feature sessions
5. **Lock Enforcement** — locks all result rows and prevents edits when session is Locked
6. **Callback Chain** — fires `onSetStandingsDirty`, `onResultsProvisional`, `onResultsOfficial`, `onResultsLocked`
7. **OperationLog** — creates audit records for compliance tracking
8. **Revert Behavior** — reverts Official → Provisional when results are edited (line 517)

**Protected Logic Inside updateSessionStatus:**

```javascript
// ✅ UNTOUCHABLE
- Draft ↔ Provisional (results remain editable)
- Provisional → Official (locks results, triggers standings)
- Official → Locked (prevents all edits)
- Locked ← unlock only (reverts to Official for admin)

// ✅ UNTOUCHABLE
- syncResultsVisibilityFromSession({ session_id })
- recomputeStandingsForFinalSession() with idempotent logic
- OperationLog creation with complete audit trail

// ✅ UNTOUCHABLE
- Historical mode bypass (checks isHistoricalMode)
- Lock detection (isSessionLocked check)
- Revert-on-edit (reverts Official → Provisional when edited)
```

---

## PART 2: Duplicate Render Risk Assessment

### Current State

**Legacy ResultsManager Location:**
- `pages/RegistrationDashboard.jsx` lines 1275–1295
- Rendered when `activeTab === 'results'`
- Fully operational, owns all session status transitions

**Future EventResultsPanel Location (if migrated):**
- `components/registrationdashboard/workspace/panels/EventResultsPanel.jsx` (not created yet)
- Would render when `eventWorkspacePanel === 'results'`
- Uses separate navigation system

### Dual-Render Scenario

If ResultsManager were rendered in both locations:

| Risk | Severity | Details |
|------|----------|---------|
| **Duplicate updateSessionStatus** | 🔴 CRITICAL | Two `useMutation` instances both calling `Session.update()` and `Results.update()` for same records → conflicting writes → data corruption |
| **Duplicate Standings Recalc** | 🔴 CRITICAL | Two `recomputeStandingsForFinalSession` calls → duplicate standing records → race condition → invalid standings |
| **Duplicate OperationLog** | 🟠 HIGH | Same operation logged twice → audit trail confusion → compliance audit failures |
| **Duplicate Visibility Sync** | 🟠 HIGH | Two `syncResultsVisibilityFromSession` calls → redundant but not destructive (idempotent) |
| **Stale Selected Session** | 🟠 HIGH | `initialSessionId` prop can differ between instances → one shows stale session while other edits live data |
| **Callback Race** | 🟠 HIGH | `onSetStandingsDirty`, `onResultsOfficial` fire from both instances → competing state updates |
| **Competing Subscriptions** | 🟡 MEDIUM | Both instances subscribe to same `['results', eventId, sessionId]` key → multiple query subscribers → memory leak risk |
| **Locked State Confusion** | 🟡 MEDIUM | One instance edits, other perceives stale lock state → UI inconsistency |

### Verdict: ⛔️ DUAL RENDERING IS UNSAFE

**Reason:** updateSessionStatus owns exclusive write access to Session.status and Results.status_state. Two concurrent instances = **data corruption and standings integrity failure**.

---

## PART 3: Recommended Ownership Strategy

### Option Evaluation

#### **Option A: Workspace-Primary, Legacy Tab Redirects** ✅ RECOMMENDED

```
User clicks Results tab → soft-redirect to workspace results panel
Workspace becomes single source of truth for results operations
Legacy tab hidden/disabled from nav
```

**Pros:**
- Single instance of ResultsManager
- No duplicate render risk
- Clear ownership boundary
- User gets consistent experience

**Cons:**
- Must update tab routing logic
- Fallback URL redirect needed for backward compat

---

#### Option B: Workspace-Primary, Legacy Tab Available via Fallback

```
Results tab shown but clicking opens workspace results in split view
Lazy-load legacy tab only if explicitly requested
```

**Cons:**
- Confusing UX (two results panels visible)
- Still risks accidental dual editing

---

#### Option C: Legacy-Primary, Workspace is Read-Only Proxy

```
Workspace Results panel reads from legacy tab
All writes go to legacy Results tab
Workspace is display-only
```

**Cons:**
- Defeats purpose of R7E migration
- Complex state synchronization
- Indirect ownership = harder to debug

---

#### Option D: Dual-Render Temporarily

```
Both instances active, coordinate via shared mutation key
```

**Cons:**
- ⛔️ **UNSAFE** — updateSessionStatus corruption risk remains

---

### **RECOMMENDATION: OPTION A**

Migrate ResultsManager to workspace, disable legacy Results tab, redirect to workspace panel.

Rationale: Single ownership prevents data corruption. Clean migration path.

---

## PART 4: Workspace Adapter Requirements

### EventResultsPanel Signature

**Required Adapter File:** `components/registrationdashboard/workspace/panels/EventResultsPanel.jsx`

```javascript
export default function EventResultsPanel() {
  const {
    selectedEvent,
    initialSessionId,      // ← NEW: needed to pre-select session
    isAdmin,
    canAction,             // ← NEW: permission check function
    dashboardContext,
    invalidateAfterOperation,
    standingsLastCalculatedAt,
    onSetStandingsDirty,
    onResultsProvisional,
    onResultsOfficial,
    onResultsLocked,
  } = useEventWorkspace();

  return (
    <ResultsManager
      selectedEvent={selectedEvent}
      initialSessionId={initialSessionId}
      isAdmin={isAdmin}
      canAction={canAction}
      dashboardContext={dashboardContext}
      invalidateAfterOperation={invalidateAfterOperation}
      standingsLastCalculatedAt={standingsLastCalculatedAt}
      onSetStandingsDirty={onSetStandingsDirty}
      onResultsProvisional={onResultsProvisional}
      onResultsOfficial={onResultsOfficial}
      onResultsLocked={onResultsLocked}
    />
  );
}
```

### Missing Context Fields

**To Add to EventWorkspaceContext:**

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `initialSessionId` | string \| null | Workspace state or URL param | Pre-select session on panel load |
| `canAction` | function \| array | From RegistrationDashboard | Permission check for result actions |

**Status:** ⚠️ NOT YET ADDED TO CONTEXT

---

## PART 5: Legacy Results Tab Strategy

### Recommended Behavior

**Action:** When user clicks "Results" in legacy nav:

```javascript
// Option 1: Soft redirect to workspace
onClick={() => {
  setEventWorkspacePanel('results');
  setActiveTab('workspace');
}}

// Option 2: Show teaser card with link
<Card>
  <CardContent>
    <p>Results management has moved to the new Event Workspace</p>
    <Button onClick={() => setActiveTab('workspace')}>
      Open Results in Workspace
    </Button>
  </CardContent>
</Card>
```

**Rationale:** Guides users to new location without breaking old links.

**Fallback:** If user bookmarks old results tab URL, render redirect card pointing to workspace.

---

## PART 6: Session Targeting Strategy

### Problem Statement

**How does the workspace know which session to edit when user clicks "Results"?**

### Current Flow (Legacy)

```
RegistrationDashboard maintains activeTab
When activeTab='results', ResultsManager renders with initialSessionId=undefined
User manually selects session from dropdown
```

### Workspace Flow (R7E)

```
EventWorkspaceShell owns eventWorkspacePanel state
When eventWorkspacePanel='results', EventResultsPanel renders
Need to know: which session was being edited in previous state?
```

### Options

#### **Option 1: EventWorkspaceContext owns selectedSessionId** ✅ RECOMMENDED

```javascript
// EventWorkspaceContext
{
  eventWorkspacePanel,
  selectedSessionId,           // NEW
  setSelectedSessionId,        // NEW
  ...
}

// EventWorkspaceShell
const [selectedSessionId, setSelectedSessionId] = useState(null);

// EventSessionsPanel → ClassSessionBuilder
// Shows list, clicking session calls setSelectedSessionId

// EventResultsPanel
// Receives initialSessionId={selectedSessionId} from context
```

**Pros:**
- Persistent session selection across workspace panels
- User selects session once, works on multiple panels
- Clean context ownership

**Cons:**
- Requires EventWorkspaceContext expansion
- State must persist when switching panels

---

#### Option 2: EventResultsPanel owns selectedSessionId internally

```javascript
// Inside EventResultsPanel
const [localSessionId, setLocalSessionId] = useState(initialSessionId || '');

// Doesn't persist when switching panels
```

**Cons:**
- Loses session context when user navigates away
- Worse UX (re-select session every time)

---

#### Option 3: Use URL params for session selection

```javascript
// URL: /registration?tab=workspace&panel=results&sessionId=xyz
```

**Cons:**
- Complex routing logic
- Slower than context state

---

### **RECOMMENDATION: Option 1**

Add `selectedSessionId` and `setSelectedSessionId` to EventWorkspaceContext.

This allows:
- EventSessionsPanel to set selected session
- EventResultsPanel to use that selected session
- Persistent selection across workspace navigation

---

## PART 7: Protected Logic Inventory

### ✅ UNTOUCHABLE — Core Business Logic

**Lifecycle State Machine:**
```javascript
Draft ↔ Provisional ↔ Official ↔ Locked (irreversible)
```
- Enforced in updateSessionStatus mutation
- Must remain in ResultsManager or equivalent protected module

**Result Publishing Rules:**
```javascript
if (status === 'Official') {
  - Mark all session results as { status_state: 'Official', published: true }
  - Set published_at timestamp
  - Call syncResultsVisibilityFromSession()
}
```
- No changes to logic
- Must preserve visibility sync

**Standings Recalculation Trigger:**
```javascript
if (status === 'Official' && isScoringSessionType) {
  recomputeStandingsForFinalSession()
  // idempotent: reverts prior, reapplies new
}
```
- Must remain idempotent
- Must preserve revert-and-reapply logic

**Lock Enforcement:**
```javascript
if (status === 'Locked') {
  - Lock all result rows in session
  - Disable all editing UI
  - Only admin can unlock
}
```

**Edit Revert Behavior:**
```javascript
if (isOfficial && resultIsEdited) {
  revert status from Official → Provisional
  inform user: "Session reverted to Provisional"
}
```

**OperationLog Audit Trail:**
```javascript
Create OperationLog entries for:
- results_saved_draft
- session_marked_provisional
- session_published_official
- session_locked
- results_imported_csv
```

**Historical Mode Bypass:**
```javascript
if (isHistoricalMode) {
  - Skip Entry roster validation
  - Skip tech inspection checks
  - Skip check-in verification
  - Allow Draft → Official directly
  - Still recalculate standings when Official
}
```

**Validation Gates:**
```javascript
validateForOfficial() {
  - Check results not empty
  - Check all rows have driver_id
  - Check Entry roster matches (unless historical)
  - Check technical requirements (unless historical)
  - Prevent publish if validation fails
}
```

**Callback Contracts:**
```javascript
onSetStandingsDirty()      // Called when results change
onResultsProvisional()     // Called when session → Provisional
onResultsOfficial()        // Called when session → Official
onResultsLocked()          // Called when session → Locked
```

### ⚠️ RISKY — Needs Careful Refactoring

**Roster matching logic** (lines 421–430):
- Uses Entry records to validate results
- Fallback matching by class/type
- Must preserve all matching strategies

**CSV import with driver creation** (lines 289–321):
- Creates draft Driver records if not found
- Updates OperationLog with driver creation count
- Must preserve driver creation workflow

---

## PART 8: Implementation Plan (Post-Audit)

### Phase 1: Context Expansion (Day 1)

**Files to Modify:**
- `EventWorkspaceContext.jsx`
  - Add `selectedSessionId`, `setSelectedSessionId`
  - Add `canAction` function
  - Add `initialSessionId` pass-through

- `EventWorkspaceContainer.jsx`
  - Accept `initialSessionId` and `canAction` from RegistrationDashboard
  - Add to context value

- `RegistrationDashboard.jsx`
  - Pass `initialSessionId` to EventWorkspaceContainer (initially null)
  - Extract `canAction` function, pass to EventWorkspaceContainer

### Phase 2: Adapter Creation (Day 2)

**Files to Create:**
- `components/registrationdashboard/workspace/panels/EventResultsPanel.jsx`
  - Thin wrapper around ResultsManager
  - No logic changes, pure adapter pattern

### Phase 3: Integration (Day 2)

**Files to Modify:**
- `EventWorkspaceShell.jsx`
  - Replace `<DeferredModulePanel panelId="results" />` with `<EventResultsPanel />`

### Phase 4: Legacy Tab Redirect (Day 3)

**Files to Modify:**
- `RegistrationDashboard.jsx`
  - Update Results tab click handler:
    ```javascript
    onClick={() => {
      setActiveTab('workspace');
      // EventWorkspaceContainer will default to 'overview' panel
      // User must then select Results from workspace nav
    }}
    ```

### Phase 5: Fallback Testing (Day 3)

**Test Cases:**
- [ ] Direct URL to `tab=results` redirects to workspace
- [ ] Session selection persists across workspace panels
- [ ] Status transitions work (Draft → Provisional → Official → Locked)
- [ ] Standings recalculation triggers correctly
- [ ] OperationLog entries created for all transitions
- [ ] Historical mode works
- [ ] Lock enforcement active
- [ ] Edit revert behavior works

### Phase 6: Deprecation (Day 4)

**Actions:**
- Hide Results from legacy tab nav (can add "View in Workspace" link)
- Monitor error logs for legacy Results tab access attempts
- Update help docs to reference workspace Results panel

---

## PART 9: Testing & Rollback Checklist

### Pre-Migration Validation

**Operational Integrity:**
- [ ] All sessions can transition through full lifecycle without errors
- [ ] Standings recalculate correctly for Final/Feature sessions only
- [ ] Lock prevents edits and unlocks only for admin
- [ ] Historical mode bypass works as expected
- [ ] OperationLog captures all transitions

**Duplicate Render Prevention:**
- [ ] Only one ResultsManager instance active at a time
- [ ] No updateSessionStatus race conditions
- [ ] No duplicate OperationLog entries

**Data Integrity:**
- [ ] No corrupt Session status values
- [ ] No orphaned Results records
- [ ] No duplicate Standings records after recalc

### Rollback Strategy

**If Migration Fails:**

1. **Revert EventWorkspaceShell.jsx**
   - Change `<EventResultsPanel />` back to `<DeferredModulePanel panelId="results" />`

2. **Revert RegistrationDashboard.jsx**
   - Results tab again goes to legacy tab, not workspace

3. **Delete EventResultsPanel.jsx** (unused)

4. **Context cleanup:**
   - Revert EventWorkspaceContext changes

**Rollback Time:** ~15 minutes

---

## PART 10: Risk Assessment & Recommendations

### Ownership Risk Assessment

| Area | Risk | Mitigation |
|------|------|-----------|
| **updateSessionStatus** | Single mutation with complex state machine | Keep in ResultsManager, don't split logic |
| **Standings Trigger** | Recompute must be idempotent | Preserve revert-and-reapply logic |
| **Visibility Sync** | External function call | Test syncResultsVisibilityFromSession before migration |
| **OperationLog** | Audit trail completeness | Verify all transitions create log entries |
| **Historical Mode** | Bypass many validations | Maintain bypass flags, don't move validation |
| **Lock Enforcement** | Critical safeguard | Test lock prevents all edits in UI and mutation |

### Duplicate Render Verdict

**✅ SAFE IF:** Only one instance active at a time via clear ownership

**❌ UNSAFE IF:** Dual rendering attempted

**Mitigation:** Option A (Workspace-Primary) ensures single instance.

### Migration Safety Verdict

**🟢 LOW RISK** — If:
- ✅ Context expansion done correctly
- ✅ Adapter is pure wrapper (no new logic)
- ✅ Legacy tab properly redirects
- ✅ Testing checklist passes
- ✅ Rollback plan ready

**🔴 HIGH RISK** — If:
- ❌ Attempting dual rendering
- ❌ Splitting updateSessionStatus across files
- ❌ Changing standings recalc logic
- ❌ Modifying historical mode bypass

---

## RECOMMENDATIONS

### ✅ PROCEED WITH R7E PART 2 IF:

1. **Single Ownership Enforced**
   - Legacy Results tab redirects to workspace
   - No attempt to render both simultaneously
   - Clear user experience pathway

2. **Context Fields Added**
   - `selectedSessionId`, `setSelectedSessionId` to context
   - `canAction` pass-through
   - `initialSessionId` pass-through

3. **Adapter Created as Pure Wrapper**
   - EventResultsPanel minimal (~30 lines)
   - No business logic changes
   - Transparent forwarding to ResultsManager

4. **Testing Plan Executed**
   - Full lifecycle tested (Draft → Locked)
   - Standings recalc verified idempotent
   - OperationLog integrity checked
   - Lock enforcement active

5. **Rollback Ready**
   - Clear revert steps documented
   - ~15 min rollback time target

### ❌ DO NOT PROCEED IF:

- ❌ Attempting to support dual rendering
- ❌ Plan includes splitting updateSessionStatus
- ❌ No rollback strategy planned
- ❌ Standings recalc logic changes proposed

---

## CONCLUSION

**ResultsManager migration is SAFE** under the following conditions:

1. **Option A Ownership Model:** Workspace-primary, legacy tab redirects
2. **Single Instance Guarantee:** No dual rendering
3. **Logic Preservation:** All protected business logic untouched
4. **Context Expansion:** 2 new fields to EventWorkspaceContext
5. **Pure Adapter Pattern:** EventResultsPanel is ~30-line wrapper
6. **Complete Testing:** Lifecycle, standings, lock, audit trail tested
7. **Rollback Ready:** 15-minute revert if needed

**Estimated Implementation Time:** 3-4 days (staggered)

**Estimated Risk Level:** 🟡 MEDIUM (manageable with discipline)

**Recommended Next Step:** Proceed to R7E Part 2 Implementation using Option A + Context Expansion approach.

---

**End of Audit Report**