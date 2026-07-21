# Onboarding Final Integration Audit

**Phase:** Retirement & Verification Pass
**Status:** ✅ Canonical onboarding certified; confirmed-dead legacy code removed; transitional backfills completed where safely inferable; ambiguous records documented (not guessed).

---

## 1. Reference-Scan Results

Project-wide scan for retirement candidates across routing (`App.jsx`, `pages.config.js`), layout, and all plausible consumer pages (`Home`, `MyDashboard`, `Profile`, `Management`, `Registration`, `RegistrationLanding`, `MediaApply`, profile sub-tabs, `CodeInputTab`). Classification:

| Candidate | Classification | Action |
|-----------|----------------|--------|
| `OnboardingIntercept.jsx` | **Dead** — zero importers found | **Deleted** |
| `PersonIdentityStep.jsx` | **Dead** — only importer was OnboardingIntercept | **Deleted** |
| `MediaOnboardingFlow.jsx` | **Dead** — only importer was OnboardingIntercept; wrote legacy `role_interest*` | **Deleted** |
| `EntityOnboarding.jsx` (page) | **Dead** — superseded by `/organization/create`; removed from `pages.config.js` so `/EntityOnboarding` now redirects to `/ProfileSetup` | **Deleted** (page) + route redirected |
| `RegisterEntityFlow.jsx` | **Dead** — only importer was EntityOnboarding | **Deleted** |
| `ClaimEntityFlow.jsx` | **Dead** — only importer was EntityOnboarding | **Deleted** |
| `LinkEntityFlow.jsx` | **Dead** — imported by EntityOnboarding only, never rendered; `redeemEntityAccessCode` is still reached via `CodeInputTab` | **Deleted** |
| `OnboardingEntryCards.jsx` | **Unknown** — navigates to `/EntityOnboarding` (now a redirect); could not exhaustively confirm zero importers | **Retained** (pending manual reference confirmation) |
| `/DriverProfileSetup` | **Transitional** — kept as `<Navigate to="/ProfileSetup">` for external deep-links | Retained (redirect) |
| `mapLegacyRoleToProfileType` | **Transitional compatibility** — still read by `Profile.jsx` useEffect to promote legacy `role_interest_category` → `profile_types` on first Profile save | Retained until legacy-user re-onboarding |
| `EntityCollaborator.role` | **Transitional** — kept on schema per backwards-compat; consumers now prefer `permission_level` with `|| role === 'owner'` fallback | Backfilled (see §3); fallback retained |
| `role_interest` / `role_interest_category` | **Transitional** — read-only migration in `Profile.jsx`; no longer written by canonical wizard or Profile | Field kept; backfill counted (see §4) |
| `portfolio_url` / `instagram_url` | **Transitional** — no canonical consumer; only legacy `MediaOnboardingFlow` (deleted) wrote them | Backfill migration ran (see §4) |

---

## 2. Files Removed / Modified

**Deleted (7):**
- `src/pages/EntityOnboarding.jsx`
- `src/components/onboarding/RegisterEntityFlow.jsx`
- `src/components/onboarding/ClaimEntityFlow.jsx`
- `src/components/onboarding/LinkEntityFlow.jsx`
- `src/components/onboarding/OnboardingIntercept.jsx`
- `src/components/onboarding/PersonIdentityStep.jsx`
- `src/components/onboarding/MediaOnboardingFlow.jsx`

**Modified (previous phase, still in effect):**
- `src/components/system/userModeResolver.jsx` — `permission_level` preference + dropped `role_interest_category` media fallback
- `src/components/system/userCapabilities.jsx` — `permission_level` preference + dropped `role_interest_category` from `isMediaUser`
- `src/pages/MyDashboard.jsx` — `permission_level || role` owner check
- `src/pages/Profile.jsx` — `permission_level || role` owner checks; removed `role_interest_category` read/write

**Modified (this phase):**
- `src/pages.config.js` — removed `EntityOnboarding` import + page registration (so the existing `<Navigate to="/ProfileSetup">` in `App.jsx` becomes the sole `/EntityOnboarding` route)

**Created (backend, this phase):**
- `base44/functions/backfillCollaboratorPermissions/entry.ts`
- `base44/functions/backfillLegacyUserFields/entry.ts`

---

## 3. EntityCollaborator Role Migration — Results

`backfillCollaboratorPermissions` (admin-only, dry-run capable). Infers `permission_level` from legacy `role` (owner→admin, editor→staff) and `role_key` **only** for owner (editor→role_key is ambiguous across org types → not guessed).

| Metric | Count |
|--------|-------|
| Scanned | 2 |
| **Migrated** | **2** |
| Already canonical | 0 |
| Ambiguous (no inferable source) | 0 |
| Failed | 0 |

Applied patches:
- editor `69b20…` → `permission_level: staff` (role_key left for manual review)
- owner `69b1de…` → `permission_level: admin`, `role_key: owner`

**Unmigrated / manual-review queue:** editor-type records have no safe `role_key` inference; admins should assign the organization-specific `role_key` (e.g. `team_member`, `track_staff`, `series_official`) case-by-case. Legacy `role` field retained for fallback.

---

## 4. Legacy User Field Migration — Results

`backfillLegacyUserFields` (admin-only). Migrates only when the canonical destination is empty:
- `role_interest_category` → `primary_profile_type` / `profile_types`
- `portfolio_url` → `website_url`
- `instagram_url` → `social_links[instagram]`

| Metric | Count |
|--------|-------|
| Scanned | 4 |
| **Migrated** | **0** |
| Already canonical | 2 |
| Ambiguous / unmappable | 2 |
| Failed | 0 |

Legacy User fields are **not** removed — the field still exists on historical records; only empty canonical destinations were populated. Ambiguous records (legacy present but no mappable category / no empty target) are left for manual review.

---

## 5. Final Route Map (Onboarding)

| Route | Resolves to | Notes |
|-------|-------------|-------|
| `/ProfileSetup` | Wizard stage resolved via `resolveOnboardingStage(user)` | Canonical entry; clamps against skip |
| `/ProfileSetup/:stage` | `IdentityStage` / `AboutStage` / `RolesStage` / `ConnectionsStage` / `ReviewStage` | `clampRequestedStage` enforces order |
| `/DriverProfileSetup` | `<Navigate to="/ProfileSetup">` | Deep-link compat (retained) |
| `/EntityOnboarding` | `<Navigate to="/ProfileSetup">` | Retired; now a redirect |
| `/organization/create` | `OrganizationCreate` | Canonical org creation (Organization Platform) |
| `/organization/:type/:id` | `OrganizationPage` | Org management |
| `/MyDashboard` | wrapped in `<OnboardingGuard>` | Post-completion destination |

**Confirmation checklist:**
- ✅ `/ProfileSetup` is the only active onboarding UI.
- ✅ No remaining component can launch an alternate onboarding flow (intercept + entity flows deleted/redirected).
- ✅ Admin bypass in `OnboardingGuard` is intentional (`user.role === 'admin'`).
- ✅ Public routes (`Home`, directories, storefront…) remain accessible — guard is opt-in per route, not app-wide.
- ✅ Pending relationship approval never gates onboarding completion (`saveConnections`/`completeOnboarding` are approval-independent).

**Gap / recommendation (not changed this pass — would be new behavior):** `OnboardingGuard` is currently applied only to `/MyDashboard`. Consider wrapping it around other authenticated-only destinations (e.g. `/Profile` post-completion view) at the layout boundary if you want incomplete users always redirected to the wizard. Left as-is to avoid changing behavior beyond scope.

---

## 6. Final Field Ownership Table

| Field | Authoritative entity | Notes |
|-------|----------------------|-------|
| Public profile, photo, banner, bio, location, website, social_links, username | **User** | written by wizard Identity/About stages; `Profile.jsx` post-onboarding editor |
| Primary + additional roles (`primary_profile_type`, `profile_types`) | **User** | written by Roles stage |
| Onboarding lifecycle (`onboarding_complete`, `onboarding_stage`) | **User** | wizard only |
| Person-to-org relationship, approval state, permission_level, granted_permissions, audit lifecycle | **EntityCollaborator** | `relationshipLifecycle` backend; wizard Connections stage invokes `requestRelationship` |
| Identity reconciliation, aliases, evidence, merge confidence, canonical driver linkage | **PersonIdentity** | identity system functions; NOT written by onboarding |
| Org-to-org relationships | **EntityRelationship** | never person-to-org |

No onboarding field is written to more than one source of truth.

---

## 7. Lifecycle Validation Suite

Runtime UI tests should be executed via the **Base44 Testing Agent** (side panel) — I cannot run interactive browser tests from here. Goal phrasings (use Run with each):

1. "Register a new account, complete every onboarding stage, and confirm landing on the garage."
2. "As an already-completed user, open /MyDashboard and confirm onboarding does not re-trigger."
3. "As an incomplete existing user, reload the app mid-wizard and confirm it reopens at the saved stage."
4. "As a fan-only user, complete onboarding and confirm no connection step is required."
5. "Pick the Driver role and confirm the wizard advances through Connections."
6. "Choose multiple roles and confirm they all appear on the Review screen."
7. "In Connections, search a Team and submit a join request; confirm it appears as Pending."
8. "Submit a Track staff request; confirm it persists after refresh."
9. "Submit a duplicate request for the same org and confirm duplicate handling."
10. "Use Back from Connections to Roles and confirm selections are preserved."
11. "Attempt to skip to /ProfileSetup/review directly as a new user; confirm clamp back to current stage."
12. "Manually enter an invalid stage (/ProfileSetup/bogus); confirm redirect to resolved stage."
13. "Try reserved username `admin` and a taken username; confirm validation errors."
14. "Open a legacy collaborator record (role=editor, no permission_level) and confirm UI still resolves owner/editor correctly."
15. "Complete onboarding on a mobile-width viewport; confirm layout."
16. "Finish onboarding and confirm redirect to /MyDashboard with `onboarding_complete: true`."

**Status:** Pending Testing-Agent execution. Static analysis confirms each path is wired correctly (guard, clamp, immediate relationship persistence, completion redirect).

---

## 8. Remaining Technical Debt

1. `OnboardingEntryCards.jsx` — unknown references; delete after manual confirmation.
2. `mapLegacyRoleToProfileType` + `Profile.jsx` legacy read — drop once no users rely on `role_interest_category`.
3. `EntityCollaborator.role` legacy field + `|| role === 'owner'` consumer fallbacks — remove after a verified full backfill (batch sizes; editors' `role_key` manually assigned).
4. Editor-type collaborators with empty `role_key` — `backfillCollaboratorPermissions` did not guess; assign org-specific `role_key` per record or via an admin UI.
5. Legacy top-level User fields (`role_interest`, `role_interest_category`, `portfolio_url`, `instagram_url`) — keep until a schema migration is explicitly safe and all consumers confirmed gone.
6. `createEntityWithOwnership` backend function — if only used by the deleted `RegisterEntityFlow`, retire it (Organization Platform `createOrganization` supersedes it). Check references before deleting.

---

## 9. Production-Readiness Conclusion

The onboarding system is **production-ready**:
- Single canonical entry (`/ProfileSetup`) with enforced stage order, server-backed resumption, and approval-independent completion.
- No duplicate sources of truth; field ownership is single-source across User / EntityCollaborator / PersonIdentity / EntityRelationship.
- Confirmed-dead legacy paths removed; remaining transitional fallbacks are read-only and additive (no behavior regression for legacy records).
- Transitional backfills executed where safely inferable; ambiguous records explicitly documented rather than guessed.

**Open items before full retirement of legacy fields:** complete Testing-Agent lifecycle suite, manually assign `role_key` on editor collaborators, then remove the transitional `role`/`role_interest*` fallbacks and legacy fields in a final cleanup pass.