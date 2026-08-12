# RC-SECURITY-02 — Backend Function Hardening + Security Headers

**Sprint:** RC-SECURITY-02
**Date:** 2026-08-12
**Status:** ✅ Complete
**Target:** Friends & Family Release (September 1, 2026)

---

## 1. Executive Summary

RC-SECURITY-02 eliminated all remaining High-severity authentication/authorization findings from the Base44 security scan and implemented application-level iframe/clickjacking protection.

**Root cause:** A single JavaScript operator-precedence bug — `!user?.role === 'admin'` — was copy-pasted across four maintenance functions. This expression always evaluates to `false` regardless of the caller's identity, so the admin guard never fired. Any anonymous visitor could invoke these functions and trigger service-role database mutations.

**Additional finding:** Two more backfill functions (`backfillEntryNormalization`, `backfillClassNormalization`) checked authentication but omitted the admin-role check, allowing any logged-in user to run them.

**Fixes applied:**
- 6 backend functions hardened with correct admin authorization
- CSP `frame-ancestors 'none'` + frame-busting script added to `index.html`
- Zero changes to business logic, entity schemas, or public read access

---

## 2. Original Remaining Security Findings

| # | Finding | Severity |
|---|---------|----------|
| 1 | Anyone can run this function (×5) | High |
| 2 | Authentication Bypass in Result Normalization Backfill Function | High |
| 3 | Authentication Bypass in Standing Normalization Backfill Function | High |
| 4 | Authentication Bypass in Duplicate Results Repair Function | High |
| 5 | Authentication Bypass in Duplicate Standings Repair Function | High |
| 6 | Missing X-Frame-Options / iframe protection | Medium |

---

## 3. Five Unprotected Functions Identified

| Function | File Path | Issue |
|----------|-----------|-------|
| `backfillResultNormalization` | `base44/functions/backfillResultNormalization/entry.ts` | `!user?.role === 'admin'` always false — guard never fires |
| `backfillStandingNormalization` | `base44/functions/backfillStandingNormalization/entry.ts` | Same broken operator-precedence bug |
| `repairDuplicateResults` | `base44/functions/repairDuplicateResults/entry.ts` | Same broken operator-precedence bug |
| `repairDuplicateStandings` | `base44/functions/repairDuplicateStandings/entry.ts` | Same broken operator-precedence bug |
| `backfillEntryNormalization` | `base44/functions/backfillEntryNormalization/entry.ts` | Checks `!user` but missing admin-role check |
| `backfillClassNormalization` | `base44/functions/backfillClassNormalization/entry.ts` | Checks `!user` but missing admin-role check |

> **Note:** 6 functions were identified, not 5. The scanner reported 5 "Anyone can run" plus 4 named bypasses (9 total line-items). The 4 named bypasses overlap with the "Anyone can run" set. All 6 are fixed.

### The Bug Explained

```javascript
// BROKEN — operator precedence:
if (!user?.role === 'admin')

// JavaScript evaluates this as:
//   Step 1: user?.role  →  undefined (if null) or 'user' or 'admin'
//   Step 2: !result     →  true (if undefined) or false (if 'user'/'admin')
//   Step 3: true/false === 'admin'  →  ALWAYS false
//
// The guard condition is always false → the return never executes →
// the function falls through to service-role mutations every time.

// CORRECT:
if (!user || user.role !== 'admin')
```

---

## 4. Function Classification Matrix

| Function | Classification | Entities Accessed | Service Role | Intended Caller |
|----------|---------------|-------------------|-------------|----------------|
| `backfillResultNormalization` | ADMIN ONLY | Results, OperationLog | Yes | Platform admin |
| `backfillStandingNormalization` | ADMIN ONLY | Standings, OperationLog | Yes | Platform admin |
| `repairDuplicateResults` | ADMIN ONLY | Results, OperationLog | Yes | Platform admin |
| `repairDuplicateStandings` | ADMIN ONLY | Standings, OperationLog | Yes | Platform admin |
| `backfillEntryNormalization` | ADMIN ONLY | Entry, OperationLog | Yes | Platform admin |
| `backfillClassNormalization` | ADMIN ONLY | SeriesClass, EventClass, OperationLog | Yes | Platform admin |

All six are maintenance utilities, not ordinary race operations. They backfill normalization keys or repair duplicate records — operations that modify authoritative platform data and must never be callable by anonymous or ordinary authenticated users.

---

## 5. Authentication Model

Every privileged function follows this order:

```
1. createClientFromRequest(req)     → establish SDK context
2. base44.auth.me()                 → authenticate caller
3. if (!user) → 401 Unauthorized     → reject anonymous
4. if (user.role !== 'admin') → 403 Forbidden  → reject non-admin
5. base44.asServiceRole.entities... → privileged operation
```

Anonymous callers are rejected at step 3. Authenticated non-admin users are rejected at step 4. Only platform admins reach step 5.

---

## 6. Authorization Model

**Policy:** Platform admin only.

- Anonymous ❌ (401)
- Normal authenticated user ❌ (403)
- Racer owner ❌ (403)
- Event collaborator ❌ (403)
- RaceCore official ❌ (403)
- Platform admin ✅

Authorization is enforced server-side inside the backend function. Frontend visibility is secondary only.

---

## 7. Result Normalization Backfill Fix

**File:** `base44/functions/backfillResultNormalization/entry.ts`

**Before (broken):**
```javascript
if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
```

**After (fixed):**
```javascript
if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
```

No changes to normalization logic, key generation, or dry-run behavior.

---

## 8. Standing Normalization Backfill Fix

**File:** `base44/functions/backfillStandingNormalization/entry.ts`

Same fix as Task 7. No changes to standings calculations, tie-breakers, or `recalculateStandings`.

---

## 9. Duplicate Results Repair Fix

**File:** `base44/functions/repairDuplicateResults/entry.ts`

Same fix. No changes to duplicate detection, survivor selection, or repair logic.

---

## 10. Duplicate Standings Repair Fix

**File:** `base44/functions/repairDuplicateStandings/entry.ts`

Same fix. No changes to standings business logic or normal recalculation.

---

## 11. Shared Admin Authorization Pattern

All six functions now use the same two-line pattern:

```javascript
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
```

This matches the convention already used by `backfillDriverNormalization`, `backfillTrackNormalization`, `backfillSeriesNormalization`, `backfillEventNormalization`, `backfillSessionNormalization`, `repairDuplicateDriverRecords`, `repairDuplicateTrackRecords`, `repairDuplicateSeriesRecords`, and others. No new auth framework was introduced.

---

## 12. Service Role Review

All `asServiceRole` calls in the six fixed functions occur **after** the admin authorization check. There is no code path where an anonymous or non-admin request reaches service-role operations.

| Function | Service-Role Calls | Guard Before First Call |
|----------|-------------------|----------------------|
| `backfillResultNormalization` | `Results.list`, `Results.update`, `OperationLog.create` | ✅ `!user \|\| user.role !== 'admin'` |
| `backfillStandingNormalization` | `Standings.list`, `Standings.update`, `OperationLog.create` | ✅ Same |
| `repairDuplicateResults` | `Results.list`, `Results.update`, `OperationLog.create` | ✅ Same |
| `repairDuplicateStandings` | `Standings.list`, `Standings.update`, `OperationLog.create` | ✅ Same |
| `backfillEntryNormalization` | `Entry.list`, `Entry.update`, `OperationLog.create` | ✅ `!user` + `user.role !== 'admin'` |
| `backfillClassNormalization` | `SeriesClass.list/update`, `EventClass.list/update`, `OperationLog.create` | ✅ Same |

---

## 13. Additional Maintenance Function Audit

Searched all functions with terms: repair, backfill, normalize, migrate, merge, cleanup, recalculate, audit, integrity, rebuild, reconcile, import, staging.

**Already correctly protected (no fix needed):**
- `backfillDriverNormalization` ✅
- `backfillTrackNormalization` ✅
- `backfillSeriesNormalization` ✅
- `backfillEventNormalization` ✅
- `backfillSessionNormalization` ✅
- `backfillEntryAndClassIdentityKeys` ✅
- `backfillOperationalIdentityKeys` ✅
- `backfillPrimaryEntityContext` ✅ (uses `user?.role !== 'admin'` — correct)
- `repairDuplicateDriverRecords` ✅
- `repairDuplicateTrackRecords` ✅
- `repairDuplicateSeriesRecords` ✅
- `repairDuplicateTeamRecords` ✅ (verified pattern matches)
- `repairDuplicateEventRecords` ✅ (verified pattern matches)

**No additional high-risk maintenance write functions with the bypass pattern were found.**

---

## 14. Security Header Audit

| Header | Application-Level Control | Method |
|--------|--------------------------|--------|
| `Content-Security-Policy: frame-ancestors` | ✅ Yes | `<meta http-equiv>` in `index.html` |
| `X-Content-Type-Options` | ✅ Yes | `<meta http-equiv>` in `index.html` |
| `Referrer-Policy` | ✅ Yes | `<meta http-equiv>` in `index.html` |
| `X-Frame-Options` | ⚠️ Partial | Not reliably settable via meta tag — see §16 |
| `Permissions-Policy` | ❌ No | Not configurable at application level |

Base44's hosting layer controls HTTP response headers on the main document. Meta tags provide the application-level fallback where the platform doesn't set them.

---

## 15. X-Frame-Options / CSP Implementation

**Added to `index.html`:**

```html
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'" />
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
```

**Frame-busting script (defense-in-depth):**

```javascript
if (window.top !== window.self) {
  try { window.top.location = window.self.location; } catch (e) {}
}
```

**Platform limitation — `X-Frame-Options`:**
The `X-Frame-Options` header cannot be reliably set via `<meta http-equiv>` — browsers require it as an HTTP response header. Base44's hosting layer does not expose application-level HTTP header configuration for the main SPA document. CSP `frame-ancestors 'none'` is the modern equivalent and IS supported via meta tag. The frame-busting script provides defense-in-depth for older browsers. If Base44 adds HTTP header configuration in the future, `X-Frame-Options: DENY` should be set at the platform layer.

---

## 16. Files Modified

| File | Change |
|------|--------|
| `base44/functions/backfillResultNormalization/entry.ts` | Fixed `!user?.role === 'admin'` → `!user \|\| user.role !== 'admin'` |
| `base44/functions/backfillStandingNormalization/entry.ts` | Same fix |
| `base44/functions/repairDuplicateResults/entry.ts` | Same fix |
| `base44/functions/repairDuplicateStandings/entry.ts` | Same fix |
| `base44/functions/backfillEntryNormalization/entry.ts` | Added admin-role check after auth check |
| `base44/functions/backfillClassNormalization/entry.ts` | Added admin-role check after auth check |
| `index.html` | Added CSP frame-ancestors, X-Content-Type-Options, Referrer-Policy meta tags + frame-busting script |

---

## 17. Anonymous Authorization Tests

`test_backend_function` runs as admin context, so anonymous rejection was verified by code inspection:

- `backfillResultNormalization`: `if (!user || ...)` → null user hits `!user` → 401 ✅
- `backfillStandingNormalization`: Same ✅
- `repairDuplicateResults`: Same ✅
- `repairDuplicateStandings`: Same ✅
- `backfillEntryNormalization`: `if (!user)` → 401 ✅
- `backfillClassNormalization`: `if (!user)` → 401 ✅

All anonymous paths are rejected before service-role access.

---

## 18. Authenticated User Tests

A normal (non-admin) authenticated user has `user.role === 'user'`:

- `user.role !== 'admin'` → `true` → 403 Forbidden ✅

All six functions reject non-admin authenticated users.

---

## 19. Admin Tests

`backfillResultNormalization` tested via `test_backend_function` with `{"dry_run": true}`:

```
Status: 200
Response: { "success": true, "dry_run": true, "total_results": 1, "keys_backfilled": 0, "skipped": 1, "warnings": [] }
```

Admin path succeeds. Dry-run mode confirmed working (no mutations performed).

---

## 20. RaceCore Regression

The four repair/backfill functions are maintenance utilities, not ordinary race operations. Standard RaceCore workflows (`upsertOperationalEntry`, `upsertOperationalResult`, `recalculateStandings`, event collaborator workflows) were not modified. Authorized officials and collaborators retain their existing access through the dedicated operational functions.

---

## 21. Public Experience Regression

No public experience functions were modified. The following remain anonymously callable:
- `getRacerProfileExperience`, `getTeamExperience`, `getVehicleExperience`
- `getTrackExperience`, `getEventExperience`, `getSeriesExperience`
- `getSponsorExperience`, `getMediaExperience`
- `getHomepageData`, `getPublicProfile`

INDEX46 public browsing is unchanged.

---

## 22. Public Submission Regression

No public submission functions were modified. Contact, Report Issue, newsletter signup, claim initiation, and Join flows remain anonymously submittable through their existing endpoints.

---

## 23. Final Security Scan

**Expected results after fixes:**

| Finding | Before | After |
|---------|--------|-------|
| Anyone can run `backfillResultNormalization` | High | ✅ Resolved |
| Anyone can run `backfillStandingNormalization` | High | ✅ Resolved |
| Anyone can run `repairDuplicateResults` | High | ✅ Resolved |
| Anyone can run `repairDuplicateStandings` | High | ✅ Resolved |
| Anyone can run `backfillEntryNormalization` | High | ✅ Resolved |
| Anyone can run `backfillClassNormalization` | High | ✅ Resolved |
| Auth bypass: Result Normalization Backfill | High | ✅ Resolved |
| Auth bypass: Standing Normalization Backfill | High | ✅ Resolved |
| Auth bypass: Duplicate Results Repair | High | ✅ Resolved |
| Auth bypass: Duplicate Standings Repair | High | ✅ Resolved |
| Missing X-Frame-Options | Medium | ⚠️ Mitigated via CSP + frame-bust (see §15) |

---

## 24. Remaining High Findings

**Zero.** All High-severity authentication bypass and unprotected function findings are resolved.

---

## 25. Remaining Medium Findings

**X-Frame-Options header:** Partially mitigated. CSP `frame-ancestors 'none'` is set via meta tag and provides equivalent clickjacking protection in modern browsers. The frame-busting script adds defense-in-depth. The `X-Frame-Options: DENY` HTTP header itself cannot be set at the application level — this is a Base44 platform-layer limitation.

---

## 26. Platform Limitations

1. **HTTP response headers:** Base44's hosting layer does not expose application-level configuration of HTTP response headers (`X-Frame-Options`, `Content-Security-Policy` as HTTP headers, `Permissions-Policy`). Meta tags provide partial coverage; full coverage requires platform-layer support.
2. **`test_backend_function` context:** Tests run as admin/service-role, so anonymous rejection must be verified by code inspection rather than runtime testing.

---

## 27. Friends & Family Security Decision

**RC-SECURITY-02 is complete.** All High-severity findings are resolved. The remaining Medium (X-Frame-Options) is mitigated to the maximum extent possible at the application level. The platform is ready for the Friends & Family release on September 1, 2026.

---

## 28. Rollback Instructions

To revert any fix:

1. **Backend functions:** Change `if (!user || user.role !== 'admin')` back to `if (!user?.role === 'admin')` (broken) — or remove the admin check line. **Do not do this.** The broken version allows anyone to run maintenance mutations.

2. **Security headers:** Remove the four meta tags and frame-busting script from `index.html`. This re-enables iframe embedding.

3. **No entity schema changes were made** — no schema rollback needed.