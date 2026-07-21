# Phase 6 — Identity & Permission Integration Audit

**Phase:** 6 — Integration Audit (no new entities, no new onboarding features)
**Objective:** Migrate every RaceCore module to consume the canonical identity, role, and relationship architecture consistently.
**Outcome:** Canonical helper created, every module classified, legacy enforcement layer pinpointed, rollout roadmap defined.

---

## 0. Canonical Architecture (consumed, not rebuilt)

| Layer | Source of truth | Resolved by |
|-------|-----------------|-------------|
| Identity, username, display, primary/additional roles, onboarding status | **User** | `getUserIdentity()` / `useIdentityAccess()` |
| Identity reconciliation, merge confidence, canonical driver, aliases | **PersonIdentity** | identity functions (out of scope here — already centralized) |
| Org membership, approval status, permission level, granted permissions, lifecycle | **EntityCollaborator** | `useIdentityAccess().canManageEntity` / `hasGrantedPermission` |
| Entity-to-entity relationships | **EntityRelationship** | (org↔org only — never person) |
| Role registry: capabilities, navigation, module availability, dashboard config | **onboardingRoles.js ROLES** | `getModulesForRoles` / `getNavigationForRoles` / `getDashboardWidgetsForRoles` |

Permission model consumed by every module must answer, consistently:
**Who is the user? → User. What capabilities? → profile_types. Which org? → approved EntityCollaborator. What may they do there? → granted_permissions.**

Never infer permissions from `profile_types`. Never infer org membership from roles.

---

## 1. Shared Authorization Helpers — Created

Two new files establish the shared layer so modules stop re-implementing identity/permission logic:

- **`src/lib/identityAccess.js`** — pure canonical helpers: `isApprovedCollaborator`, `isActiveCollaborator`, `getPermissionLevel`, `getPermissionLevelForEntity`, `hasGrantedPermission`, `canManageEntityCanonical`, `isEntityOwnerCanonical`, `getUserIdentity`, `getEnabledModules`, `getEnabledNavigation`, `getEnabledDashboardWidgets`, `buildIdentityContext`. Legacy `role` / absent `status` are supported as **transitional fallbacks**; canonical fields are preferred.
- **`src/hooks/useIdentityAccess.jsx`** — cached React hook: fetches current user + collaborators ONCE (60s staleTime, shared query keys) and returns the full resolved context. Every consumer participates in one cache — no duplicate `auth.me()` / `EntityCollaborator.filter` requests per component.

This is the canonical replacement path. New and updated modules should consume `useIdentityAccess`; the legacy enforcement modules below are flagged for migration to it.

---

## 2. Infrastructure Classification (audit basis)

| File | Classification | Finding |
|------|----------------|---------|
| `src/config/onboardingRoles.js` | ✅ Already migrated | Role registry is fully canonical: drives modules, navigation, dashboard Widgets, permission templates, relationship requirements. |
| `src/components/system/userCapabilities.jsx` | 🟡 Transitional | Reads `profile_types` + collaborators + `permission_level \|\| role === 'owner'`. Still reads legacy `user.workspace_access`, `user.media_roles`, `mapLegacyRoleToProfileType`. Identity/permission correct for canonical data. |
| `src/components/system/userModeResolver.jsx` | 🟡 Transitional | Permission priority admin > entity_owner (by `permission_level \|\| role==='owner'`) > entity_editor; identity uses `primary_profile_type`. Correct; legacy fallbacks retained. |
| `src/components/system/userContextResolver.jsx` | 🟡 Transitional | Source of truth = EntityCollaborator + `primary_entity_type/id`. **Still sorts owned/editor by legacy `role`**, and reads `user.data.driver_id/team_id/...` for diagnostics only (`resolveLegacyEntityLinks`). Conflict detector useful. |
| `src/components/system/userContextChecker.jsx` | ✅ Already migrated | Sync helpers, EntityCollaborator-only. |
| `src/components/system/entityOwnershipMap.jsx` | ✅ N/A | Subsystem ownership (management/racecore/system) — not user permission. |
| `src/components/access/entityAccess.jsx` | ❌ **Needs migration** | Canonical EntityCollaborator source BUT keys exclusively on legacy `role` (`['owner','editor']`, `role === 'owner'`). **Ignores `permission_level`, `granted_permissions`, and `status` entirely.** Pending/denied/revoked records are treated as valid access. |
| `src/components/entities/entityPermissions.jsx` | 🟡 Compat shim | Re-exports entityAccess + local `getHighestEntityRole` (legacy ROLE_RANK). No new logic; flagged to delegate to identityAccess. |
| `src/components/access/entityEditPermission.jsx` | ❌ **Needs migration** | `useEntityEditPermission` resolves `collabRole` from `c.role === 'owner'` and `['owner','editor']`; `canEditRaceCore` / `canEditProtectedFields` are admin-only. Has a **Driver ownership assumption** (`owner_user_id === user.id`) — should route through identityAccess + relationship admin. |
| `src/components/registrationdashboard/entityAuthority.jsx` | ❌ **Needs migration** | `canManageTrack/Series` use `c.role === 'owner' \|\| 'editor'`; **entity_type passed as lowercase `'track'`/`'series'`** — inconsistent with canonical enum casing elsewhere, breaks matching for backfilled canonical records. |
| `src/components/registrationdashboard/entityAccess.jsx` | ❌ **Needs migration** | `getEntityAccessForUser` returns `record?.role`; `canApproveCollaboration` treats any `hasAccess` collaborator as approver. Should gate approval on relationship-admin (`permission_level === 'admin'` \|\| owner) of the same entity. |
| `src/config/racecorePermissions.js` | ❌ **Needs migration / consolidation** | Defines a **parallel role model** (platform_admin, race_director, steward, tech_director, timing_scoring, gate_staff, announcer, …) with its own permission matrix. Not connected to EntityCollaborator.permission_level / granted_permissions / approval status. `hasPermission` maps `user.role` ('admin'/'user') to platform_admin/read_only — bypasses the relationship model entirely. **This is the largest divergence from canonical.** |
| `src/components/registrationdashboard/raceCoreNavConfig.jsx` | ❌ **Needs migration** | Hardcoded RaceCore nav groups with `adminOnly` flags — **not driven by role registry `/ approved collaborators `/ granted_permissions`. Invisible to fans/media with legit track/series access unless admin. |
| `src/hooks/useUserDisplayMap.js` | ✅ Good pattern | Caches user list once; reused for id→display lookups. Model for the identity cache. |
| `src/components/registrationdashboard/useDashboardQueries.jsx` | 🟡 Partial | Caches operational entities (sessions/results/entries/standings) via REG_QK. Does **not** cache user/collaborators — modules that use it still fetch identity separately. Route identity through `useIdentityAccess`. |

---

## 3. Permission Consumption Checklist (module row model)

Every module should answer, using `useIdentityAccess()`:

| Question | Answer | Helper |
|----------|--------|--------|
| Who is the user? | User | `identity` / `user` |
| What capabilities (identity)? | `profile_types` | `identity.roles` |
| Which org are they acting within? | approved `EntityCollaborator` | `collaborators`, `canManageEntityType` |
| What may they do there? | `granted_permissions` / `permission_level` | `hasGrantedPermission(type,id,key)`, `permissionLevelFor(type,id)` |
| Admin override? | `user.role === 'admin'` | baked into every `*Canonical` helper |

---

## 4. Module Audit

Classification legend: ✅ Migrated · 🟡 Partial (canonical with transitional fallback) · ❌ Needs migration · ⚪ Inferred from shared infra (module imports flagged enforcement helpers; inherits their state).

| Module | Current identity source | Current permission source | Remaining legacy assumptions | Recommended migration | Status |
|--------|------------------------|----------------------------|------------------------------|----------------------|--------|
| **Garage / MyDashboard** | `userCapabilities` + `userModeResolver` | collaborators via `permission_level \|\| role==='owner'` | legacy `workspace_access`/`media_roles` read in capabilities; sort-by-role in context resolver | Swap capabilities reader to `useIdentityAccess`; drop `workspace_access`/`media_roles` reads once no legacy users depend | 🟡 |
| **Race Control** (EventFile workspace + RaceControlProvider panels) | event-scoped user + `entityAuthority`/`entityAccess` | legacy `c.role === 'owner'\|\|'editor'`; RaceCore `racecorePermissions` matrix | race_director/steward/tech/timing roles are a parallel model; approval status ignored | Resolve operational role from the event's `EventCollaboration`/`EntityCollaborator` `granted_permissions`; replace `hasPermission(role, perm)` with `hasGrantedPermission` for the event/series entity | ❌ |
| **Registration** (EventSelfRegister, EntriesManager, registration panels) | `entityAuthority.canManageTrack/Series` + EventFile access | legacy role checks | lowercase entity_type bug; view-only collaborators can edit | Use `canManageEntityCanonical('Track'\|'Series', id)` + `hasGrantedPermission(...,'manage_entries')`; gate write actions on staff-or-above | ❌ |
| **Media Portal** (assignments, requests, credentials, deliverables, revenue) | mediaProfile + `userCapabilities.can_access_media_portal` | media_roles/workspace_access + credential helpers | media access inferred from identity, not relationship; credential issuance not scoped to approved collaborator entities | Resolve media entitlements through `hasGrantedPermission` on the org that issued the credential; portal visibility through `identity.roles` includes media/photographer/creator + approved media contributor | 🟡 |
| **Paddock / Gate / Timing / Announcements** (Operational Specialists) | `raceCoreNavConfig` + `racecorePermissions` | racecorePermissions matrix by role string | role strings (gate_staff, announcer, timing_scoring) not derived from approved collaborators | Derive specialist module availability from `granted_permissions` keys (e.g. `manage_entries`, `announce`, `timing_scoring`) on the active event relationship; surface via `modules` | ❌ |
| **Directories** (Driver/Team/Track/Series/Event/Creators/MediaOutlets) | public reads + admin auth | admin or `canManageEntity` by legacy role | edit buttons gated on legacy role; some read Driver ownership assumption | Gate edit affordances on `canManageEntity(type,id)`; remove Driver `owner_user_id` short-circuit beyond identityAccess | ⚪ |
| **Results** (ResultsManualTable, ResultsCsvImportDialog, publish pipeline) | event-scoped + `racecorePermissions.hasPermission` | `publish_results` permission from matrix by role | `timing_scoring`/`race_director` roles inferred, not relationship-derived | Gate publish on `hasGrantedPermission('Track'\|'Series', id, 'publish_results')` (or event-collaboration equivalent) | ❌ |
| **Standings** (StandingsManager, recalc, tie-breakers) | series-scoped user | admin + series collaborator via legacy role | `canManageSeries` lowercase bug; recalcs not permission-gated by granted_perms | `canManageEntityCanonical('Series', id)` + `hasGrantedPermission(...,'manage_standings')` | ❌ |
| **Admin / Management Studio** (Management sidebar, CRUD forms) | `user.role === 'admin'` + `entityEditPermission` | admin-only protected fields; `canEditManagement` allows any collaborator by legacy role | any editor collaborator gets full management edit (no granularity) | Keep admin-only protected fields; narrow `canEditManagement` to `isEntityOwner` OR `hasGrantedPermission` keys, not "any collaborator" | ⚪ |
| **Search** (Layout global search) | none (public read) | visibility_status live | n/a — public search filters by `visibility_status` | No change; ensure it never leaks `visibility_status !== 'live'` private records | ✅ |
| **Messaging / Policy threads** | user identity | admin + scoped by policy holders | policy participants inferred from legacy fields | Resolve participant set from approved collaborators + identityAccess | ⚪ |
| **Credentialing** (MediaCredential, credential requests) | `userCapabilities` media flags | media_roles + approval status of MediaProfile/org | `canApproveCollaboration` lets any collaborator approve | Gate approval on relationship-admin (`permission_level==='admin'` \|\| owner) of the issuing entity | ❌ |
| **Event Management** (EventBuilder, EventFile settings, lifecycle) | `entityAccess` + `racecorePermissions.lifecycle_change` | admin + collaborator legacy role | lifecycleChange permission from RaceCore matrix; collaborator can't trigger close without admin | Map lifecycle ops to `granted_permissions('...manage_lifecycle')` on the event/series collaborator record | ❌ |
| **Editorial / Outlet / Story Radar** | writer trust + submission authorship | admin + writer-trust flags | identity for writers correct (`identity.roles` includes creator); ✅ | No material change; route story-approval permission through org verification_status | 🟡 |
| **Storefront / Marketplace** | public + customer | admin + storefront admin | storefront admin gating by app role only | Keep; product/variant/order edits remain admin-or-storefront-admin (separate domain, intentionally not relationship-scoped) | ✅ |
| **Organization Platform** (OrganizationPage/Create, organizationService) | User (creator) | `OrganizationSettings` verification + EntityCollaborator | ✅ already canonical; uses permission_level + granted_permissions | Surface module gating through identityAccess instead of re-implementing | ✅ |
| **Onboarding Wizard** (ProfileSetup + stages) | User writes | registry-driven role requirements | ✅ alreadycanonical | No change | ✅ |
| **Identity reconciliation** (PersonIdentity, aliases, merge, review queue) | PersonIdentity | governed identity confidence | ✅ (separate system) | No change | ✅ |

---

## 5. Remaining Legacy Consumers (explicit)

Patterns still present in source, classified:

| Pattern | Locations | Classification | Action |
|---------|-----------|----------------|--------|
| `c.role === 'owner'` / `['owner','editor']` checks | `access/entityAccess.jsx`, `entities/entityPermissions.jsx`, `access/entityEditPermission.jsx`, `registrationdashboard/entityAccess.jsx`, `registrationdashboard/entityAuthority.jsx`, `system/userCapabilities.jsx` (fallback) | Transitional compatibility | Replace primary check with `permission_level`/`granted_permissions`; keep `role` fallback only for backfilled records (identityAccess already does this). |
| `APP_ROLE_TO_RACECORE` + `racecorePermissions` matrix | `config/racecorePermissions.js` + every Race Core panel using `hasPermission` | **Needs migration** | Either (a) deprecate and derive operational capability from `granted_permissions`, or (b) keep as a convenience layer that internally calls `hasGrantedPermission`. Recommend (a). |
| `user.workspace_access` / `user.media_roles` | `userCapabilities.jsx`, `userModeResolver.jsx` | False-positive risk | Drop once media entitlements are resolved from MediaProfile + approved collaborator. |
| `mapLegacyRoleToProfileType(role_interest_category)` | `userCapabilities.jsx` (export), `Profile.jsx` (read, transitional) | Transitional compatibility | Retain until zero users rely on `role_interest_category`; covered already. |
| `user.data.driver_id/team_id/series_id/track_id` | `userContextResolver.resolveLegacyEntityLinks` (diagnostics only) | Transitional / diagnostics | Keep conflict detector; stop surfacing as access. |
| Driver `owner_user_id === user.id` short-circuit | `entityEditPermission.useEntityEditPermission`, `canEditManagementEntity` | Driver ownership assumption | Route through `isEntityOwnerCanonical`; `owner_user_id` becomes redundant once every Driver has an owner-collaborator record. |
| Hardcoded `adminOnly` nav flags | `raceCoreNavConfig.jsx` | Hardcoded role menu | Drive from `getEnabledNavigation` + approved collaborators + granted_permissions. |
| `entity_type: 'track'/'series'` (lowercase) | `registrationdashboard/entityAuthority.jsx` | False-positive bug | Use canonical enum casing `'Track'/'Series'`. |

---

## 6. Performance Audit

| Concern | Current | Recommendation |
|---------|---------|----------------|
| Repeated `base44.auth.me()` | Many components independently query `['currentUser']` (shared key, so cached by React Query — acceptable) | Route new code through `useIdentityAccess` for the resolved context, not raw `me()`. |
| Repeated `EntityCollaborator.filter({user_id})` | Several helpers re-fetch per-entity or per-user (`canManageEntity`, `getEntityRole`, `isEntityOwner`, `useEntityEditPermission`) | Pre-fetch once via `useIdentityAccess` (key `myCollaborators`); use sync `canManageEntityCanonical` against the cached array. The async helpers remain for out-of-context call sites (event handlers). |
| Full user list fetch | `useUserDisplayMap` loads all users (5-min cache) | Acceptable for lookup; keep but ensure not joined with identity access path (different cache key). |
| Workspace queries | `useDashboardQueries` caches operational entities; identity not cached there | Leave operational here; route identity through `useIdentityAccess`. |
| RaceCore nav permission eval | Evaluated per-panel via `hasPermission` (cheap map lookup) | Cheap; only the *source* of the role string is wrong, not the cost. |

---

## 7. Testing Matrix

Verify via the Base44 Testing Agent (side panel). Goal phrasings, one per persona/scenario:

1. "Log in as a Fan and confirm RaceCore nav is hidden and no management UI surfaces."
2. "Log in as a Driver (driver profile, no collaborator) and confirm the driver dashboard renders but no RaceCore panel is editable."
3. "Log in as a Team Owner (approved Team collaborator, admin level) and confirm team management is editable with granted_permissions."
4. "Log in as a Team Member (approved Team collaborator, staff level) and confirm roster-view but no manager-grade edits."
5. "Log in as approved Track Staff and confirm the RaceCore nav appears and Event Files are reachable."
6. "Log in as a Series Official (approved Series collaborator, steward granted_permissions) and confirm protest/penalty UI but not lifecycle/publish."
7. "Log in as approved Media and confirm the Media Portal and credential request flows, but no org management UI."
8. "Log in as a Sponsor with multiple approved org relationships and confirm sponsor dashboard aggregates across memberships."
9. "Log in as a user holding Driver + Track Staff + Media simultaneously and confirm all three dashboards/sections surface."
10. "Log in as a user with a pending relationship and confirm the module is NOT yet editable (pending badge only)."
11. "Log in as a user with a denied relationship and confirm no access surfaces."
12. "Log in as a user with a revoked relationship and confirm access was withdrawn."
13. "Log in as admin and confirm governance/data nav appears and all modules are openable."
14. "Log in as a viewer-level collaborator and confirm read-only rendering (no write affordances) per module."

Record pass/fail per row in the running test matrix. **Status: pending Testing Agent execution.**

---

## 8. Deliverables Summary

- ✅ **Complete migration report** — §2 infrastructure classification + §4 module audit + §5 legacy consumers.
- ✅ **Remaining legacy consumers** — enumerated in §5 with action per pattern.
- ✅ **Modules fully migrated** — Onboarding Wizard, Organization Platform, Editorial/Outlet, Storefront/Marketplace, Search, Identity reconciliation system (PersonIdentity/aliases/merge).
- 🟡 **Modules partially migrated** — Garage/MyDashboard, Media Portal, Directories, Admin/Management Studio (entity edit), Messaging/Policy.
- ❌ **Modules needing migration** — Race Control, Registration, Results, Standings, Paddock/Gate/Timing/Announcements, Credentialing, Event Management — all centered on `racecorePermissions` matrix + legacy `role` enforcement.
- ✅ **Shared authorization helpers created** — `src/lib/identityAccess.js` + `src/hooks/useIdentityAccess.jsx` (cached, consolidated, canonical).
- ✅ **Remaining technical debt** — §5 + §9.
- ✅ **Recommended next implementation priorities** — §9.

---

## 9. Remaining Technical Debt & Next Priorities

**Priority 1 — Migrate the enforcement layer to identityAccess (highest leverage):**
1. `config/racecorePermissions.js` → derive operational capability from `granted_permissions` (deprecate `APP_ROLE_TO_RACECORE`). Decide: collapse into identityAccess, or keep as a thin wrapper that internally calls `hasGrantedPermission`.
2. `access/entityAccess.jsx` → `canManageEntity*` consult `permission_level` + `status` via identityAccess; keep async helpers for handler call sites.
3. `access/entityEditPermission.jsx` → `useEntityEditPermission` resolve `collabRole`/`canEditManagement` from `getPermissionLevelForEntity` + `hasGrantedPermission`; narrow "any collaborator" to staff-or-above + granted keys.
4. `registrationdashboard/entityAuthority.jsx` → fix lowercase entity_type bug; route through `canManageEntityCanonical('Track'\|'Series')`.
5. `registrationdashboard/entityAccess.jsx` → `canApproveCollaboration` requires relationship-admin of the same entity.

**Priority 2 — Drive navigation dynamically:**
6. `raceCoreNavConfig.jsx` → filter groups by `useIdentityAccess().navigation` + `hasGrantedPermission` keys. Replace `adminOnly` flags with granted-permission checks where a staff-level collaborator legitimately needs the section.

**Priority 3 — Route dashboards/widgets through registry + approved relationships:**
7. `MyDashboard` + dashboard widget selectors → consume `useIdentityAccess().dashboardWidgets` and `modules`. Drop the legacy `workspace_access`/`media_roles` reads in `userCapabilities`.

**Priority 4 — Operational panel permission gates:**
8. Results publish, Event lifecycle/closeout, Grid approval, Penalty issue, Protest resolve, Officials management → gate each on the relevant `granted_permissions` key (not the RaceCore role string).

**Priority 5 — Retire transitional fields:**
9. After all modules read canonical fields, remove `role` fallbacks from identityAccess enforcement edge; remove `mapLegacyRoleToProfileType` + legacy `role_interest*` reads; confirm no users depend.

---

## 10. Definition of Done

The RaceCore application consistently consumes the onboarding identity architecture when:
- Every module resolves the user via `useIdentityAccess` (no per-module `auth.me` + ad-hoc collaborator re-interpretation).
- Every capability decision uses `identity.roles` (identity only).
- Every access decision uses approved `EntityCollaborator` + `permission_level` / `granted_permissions`.
- The `racecorePermissions` parallel model is either removed or reduced to a wrapper over `identityAccess`.
- Navigation is registry- and relationship-derived; no hardcoded role menus remain.
- Dashboards select widgets from role registry + approved relationships; no Driver-only assumption.
- No module contains its own custom interpretation of users, roles, or ownership.

**Current state:** identity/role/relationship *model* is canonical and centralized; the *enforcement* layer still carries legacy `role` semantics and a parallel RaceCore role matrix. Priority 1–3 close the gap; Priority 4–5 retire the transitional scaffolding. The shared `identityAccess` helper is ready to consume as the canonical path.