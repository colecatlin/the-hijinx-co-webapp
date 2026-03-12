# Architecture Verification System — Guide

## Overview

Six comprehensive backend functions verify that the three critical architecture risks have been stabilized:

1. **Operational Source Boundary** — Operational imports never silently create source entities
2. **User Context Truth** — EntityCollaborator is the only access truth; legacy User.data fields are not used
3. **Shared Logic Consistency** — Pages rely on shared system helpers instead of reimplementing logic
4. **Cache Invalidation** — Mutations use the shared invalidation contract
5. **Import Idempotence** — Repeated imports don't create duplicates
6. **Overall Health** — Aggregated report of all verification results

## Functions Created

### 1. `verifyOperationalSourceBoundaryIntegrity.js`

**Purpose**: Ensures operational imports never silently create source entities (Driver, Team, Track, Series, Event, Session).

**Checks**:
- Scans OperationLog for import operations
- Verifies metadata includes `row_type`, `unresolved_breakdown`, `unresolved_count`
- Detects any Driver/Team/Track/Series/Event creation during operational imports
- Confirms `resolveSourceReferencesForOperationalRow` is used

**Output**:
```json
{
  "operational_imports_checked": 100,
  "silent_source_creation_paths_found": 0,
  "compliant_paths": ["results_csv_upload", "entries_import"],
  "violations": [],
  "severity": "healthy"
}
```

### 2. `verifyUserContextTruth.js`

**Purpose**: Confirms EntityCollaborator is used for access decisions, not legacy User.data fields.

**Checks**:
- Scans OperationLog for access decision patterns
- Detects usage of `user.data.driver_id`, `user.data.team_id`, etc.
- Verifies EntityCollaborator records have required fields
- Confirms primary entity context usage

**Output**:
```json
{
  "pages_checked": 10,
  "legacy_access_usage_found": 0,
  "entity_collaborator_records_active": 150,
  "violations": [],
  "severity": "healthy"
}
```

### 3. `verifySharedLogicUsage.js`

**Purpose**: Checks that pages rely on shared system helpers instead of reimplementing logic.

**Checks**:
- Analyzes page_rendered operations
- Detects usage of: authGuard, routeResolver, invalidationContract, queryContract
- Identifies pages with inline implementations
- Classifies drift level: low, medium, high

**Output**:
```json
{
  "pages_checked": 10,
  "pages_using_shared_logic": 9,
  "high_drift_pages": [],
  "medium_drift_pages": ["SomePage"],
  "severity": "minor_warnings"
}
```

### 4. `verifyCacheInvalidationConsistency.js`

**Purpose**: Confirms mutations invalidate queries through the shared invalidation contract.

**Checks**:
- Scans OperationLog for mutation operations
- Verifies each mutation has `invalidation_group` set
- Detects manual/inline invalidation
- Identifies page-specific query strings instead of contract groups

**Output**:
```json
{
  "mutation_paths_checked": 50,
  "compliant_paths": 48,
  "inline_invalidation_found": 0,
  "violations": [],
  "severity": "healthy"
}
```

### 5. `verifyImportIdempotenceSystem.js`

**Purpose**: Tests that repeated imports remain idempotent and don't create duplicates.

**Checks**:
- Analyzes repeated import runs (same source, multiple executions)
- Compares created/updated counts across runs
- Detects normalization key failures
- Verifies unresolved counts don't increase on retries

**Output**:
```json
{
  "imports_checked": 7,
  "idempotent_imports": 7,
  "imports_creating_duplicates": 0,
  "normalization_failures": 0,
  "severity": "healthy"
}
```

### 6. `buildArchitectureHealthReport.js`

**Purpose**: Aggregates results from all five verification functions into a comprehensive health report.

**Checks**:
- Invokes all five verification functions in parallel
- Aggregates violations and failures
- Determines overall status: healthy, minor_warnings, attention_needed, critical
- Provides actionable recommendations

**Output**:
```json
{
  "operational_boundary_health": { "status": "healthy", "violations": 0 },
  "user_context_health": { "status": "healthy", "legacy_fields_found": 0 },
  "shared_logic_health": { "status": "healthy", "high_drift_pages": [] },
  "cache_invalidation_health": { "status": "healthy", "inline_invalidation_found": 0 },
  "import_idempotence_health": { "status": "healthy", "duplicate_creating_imports": 0 },
  "overall_architecture_status": "healthy",
  "warnings": [],
  "failures": [],
  "recommended_actions": []
}
```

## Diagnostics Dashboard Integration

A new component `DiagnosticsArchitectureHealth.jsx` is ready to display architecture health in the Diagnostics page.

To activate it, add this line around line 1897 in `pages/Diagnostics.jsx`:

```jsx
{/* ── Architecture Health Verification ────────────────────────── */}
<DiagnosticsArchitectureHealth />
```

The component provides:
- "Run Architecture Health Check" button
- Real-time status indicators (✓ or ⚠) for each pillar
- Warnings and failures breakdown
- Recommended actions

## Running the Verification

### Via Diagnostics Dashboard
1. Navigate to Management → Diagnostics
2. Scroll to "Architecture Health" section
3. Click "Run Architecture Health Check"
4. View results in real-time

### Via Backend Function (Direct)
```javascript
const res = await base44.functions.invoke('buildArchitectureHealthReport', {});
console.log(res.data); // Full report
```

### Individual Verifications (Advanced)
```javascript
// Just operational boundary
const boundary = await base44.functions.invoke('verifyOperationalSourceBoundaryIntegrity', {});

// Just user context
const userContext = await base44.functions.invoke('verifyUserContextTruth', {});

// Just shared logic
const sharedLogic = await base44.functions.invoke('verifySharedLogicUsage', {});

// Just invalidation
const invalidation = await base44.functions.invoke('verifyCacheInvalidationConsistency', {});

// Just idempotence
const idempotence = await base44.functions.invoke('verifyImportIdempotenceSystem', {});
```

## Success Criteria

Architecture is considered **healthy** when:

- ✅ `operational_boundary_health.violations === 0`
- ✅ `user_context_health.legacy_fields_found === 0`
- ✅ `shared_logic_health.high_drift_pages.length === 0`
- ✅ `cache_invalidation_health.inline_invalidation_found === 0`
- ✅ `import_idempotence_health.duplicate_creating_imports === 0`
- ✅ `overall_architecture_status === 'healthy'` or `'minor_warnings'`

## Interpreting Results

### Operational Boundary Violations
**Issue**: Source entities (Driver, Team, Track, Series, Event, Session) are being created during operational imports.

**Action**: Stop operational imports and audit the import code. Ensure all imports use `resolveSourceReferencesForOperationalRow` to resolve references safely.

### User Context Truth Violations
**Issue**: Legacy `user.data.*` fields are being used to make access decisions instead of EntityCollaborator.

**Action**: Audit pages that use User.data for access checks. Replace with EntityCollaborator lookups.

### Shared Logic Drift
**Issue**: Pages are reimplementing logic instead of using shared helpers (authGuard, routeResolver, etc.).

**Action**: Refactor high-drift pages to use shared helpers from the system contracts.

### Cache Invalidation Issues
**Issue**: Mutations are manually invalidating queries instead of using the shared invalidation contract.

**Action**: Replace manual query invalidation with `invalidationContract.invalidate(groupName)` calls.

### Idempotence Failures
**Issue**: Repeated imports are creating duplicate records instead of updating existing ones.

**Action**: Ensure all imports use normalized keys (`entry_identity_key`, `result_identity_key`, etc.) for deduplication.

## Implementation Notes

- All verification functions rely on OperationLog entries. Ensure all mutations and imports log their operations.
- The system is designed to detect patterns in logs, not validate source code directly.
- For fastest verification, run the report during low-traffic times.
- Verification functions cache results in memory; results are fresh from the database each run.

## Next Steps

1. Run the architecture health check from the Diagnostics dashboard
2. Review any warnings or failures
3. Address issues according to the recommended actions
4. Re-run the health check to confirm fixes
5. Schedule periodic runs (weekly or monthly) to catch regressions early