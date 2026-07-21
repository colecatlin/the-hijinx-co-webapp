# Phase 7 — Authorization Layer Migration

**Phase:** 7 — Migration (not audit, not new architecture)
**Target:** Every authorization decision consumes `identityAccess.js` / `useIdentityAccess()` → User · profile_types · approved `EntityCollaborator` · `permission_level` · `granted_permissions`.
**Strategy:** Incremental, backwards-compatible. Helper layer migrated this pass so all consumers route through the canonical model; per-module consumer call-site rewiring is staged.

---

## 1. What was migrated this phase

The authorization **helper layer** — the chokepoint every RaceCore module imports — now delegates to the canonical identity architecture. Consumers keep working; behavior is canonical.

| Helper | Before | After |
|--------|--------|-------|
| `registrationdashboard/entityAuthority.jsx` | legacy `c.role === 'owner'\|\|'editor'`, **lowercase `'track'`/`'series'` (never matched)** | delegates to `identityAccess.canManageEntityCanonical` with canonical `'Track'`/`'Series'`; added type-agnostic `canManageEntity` |
| `registrationdashboard/entityAccess.jsx` | any collaborator (incl. pending) could approve | `canApproveCollaboration` requires **relationship-admin** (`permission_level==='admin'` / legacy owner) of the same entity; `getEntityAccessForUser` returns `permission_level` |
| `access/entityAccess.jsx` | keys exclusively on legacy `role`; ignored `status`, `permission_level`, `granted_permissions` | `canManageEntity`/`isEntityOwner`/`getEntityRole` resolve through `identityAccess` (active status + permission_level); sync helpers gate on staff-or-above + active; viewer-only collaborators no longer granted management |
| `access/entityEditPermission.jsx` | separate `auth.me()` + per-entity `EntityCollaborator.filter`; admin-only RaceCore/protected | uses **`useIdentityAccess`** (shared cache); `canEditRaceCore` widened to relationship-admin of the entity; exposes `permissionLevel` |
| `config/racecorePermissions.js` | parallel matrix, bypasses relationships | added `resolvePermissionForUser(ctx, type, id, key)` delegating to `identityAccess.hasGrantedPermission`; matrix retained as transitional fallback |
| `registrationdashboard/raceCoreNavConfig.jsx` | hardcoded `adminOnly` flags | added `getRaceCoreNavForIdentity(ctx)` — registry + approved-relationships drive visibility; `adminOnly` groups (Governance/Data) stay admin-only |

Shared cache (Priority wiring):
- `useIdentityAccess` is now consumed by `useEntityEditPermission`, so entity-edit panels share a single user/collaborator fetch (60 s staleTime) instead of re-querying per edit surface.

---

## 2. Files modified

**Rewritten (canonical delegation):**
- `src/components/registrationdashboard/entityAuthority.jsx`
- `src/components/registrationdashboard/entityAccess.jsx`
- `src/components/access/entityAccess.jsx`
- `src/components/access/entityEditPermission.jsx`

**Extended (new canonical API added, legacy matrix retained):**
- `src/config/racecorePermissions.js` → `+ resolvePermissionForUser`
- `src/components/registrationdashboard/raceCoreNavConfig.jsx` → `+ getRaceCoreNavForIdentity`

**Created during Phase 6, consumed this phase:**
- `src/lib/identityAccess.js`
- `src/hooks/useIdentityAccess.jsx`

No new pillars were created; only the helper layer was migrated.

---

## 3. Bugs fixed

1. **Lowercase `entity_type` bug** — `registrationdashboard/entityAuthority.jsx` filtered `EntityCollaborator` on `'track'`/`'series'`; canonical enum casing is `'Track'`/`'Series'`. Non-admin `canManageTrack`/`canManageSeries` silently returned `false` for every backfilled record. Fixed via canonical casing through `identityAccess.canManageEntityCanonical` — Track/Series staff now receive the access that was silently blocked.
2. **Pending/denied/revoked collaborators treated as valid access** — `access/entityAccess.jsx` accepted any matching collaborator regardless of `status`. Now gated on `isActiveCollaborator` (only `status==='approved'` or transitional records without the field).
3. **Anyone with access could approve a collaboration** — `registrationdashboard/entityAccess.canApproveCollaboration` accepted any `hasAccess`. Now requires the approver to be a relationship-admin of the same entity.
4. **Viewer-level collaborators granted management** — implicit (viewer role didn't exist before). Canonicalized: `canManageEntity*` now requires staff-or-above; viewer is read-only.

---

## 4. Legacy helpers still in use (transitional)

| Helper | Status | Why retained |
|--------|--------|--------------|
| `config/racecorePermissions.js` `PERMISSION_MATRIX` + `hasPermission(role, key)` | **Still imported by RaceControl / Results / Event-management panels** that only carry a role string (no collaborator context). | Consumer call-site rewiring (Priority 1 panels) not yet done. `hasPermission` left intact so consumers keep working; new code uses `resolvePermissionForUser`. |
| `access/entityAccess.jsx` legacy-role branch | Internally mapped via `identityAccess.getPermissionLevel` (owner→admin, editor→staff). | Transitional for backfilled records without `permission_level`. Removed once backfill verified complete. |
| `access/entityEditPermission.jsx` Driver `owner_user_id` short-circuit | Retained as `isDirectOwner`. | Until every Driver has an owner-collaborator record |

`entityAccess` / `entityAuthority` / `entityEditPermission` are **no longer legacy-consumers of `role`** — they translate `role` into canonical `permission_level` via `identityAccess` and gate on approved status. They remain as compatibility shims until per-module call sites switch directly to `useIdentityAccess`, at which point they can be deleted.

---

## 5. Compatibility layers remaining

- **`entities/entityPermissions.jsx`** — pure re-export shim over `access/entityAccess`. Consumers still import from here; harmless; delete after importers point at `identityAccess`.
- **`identityAccess` legacy fallback** in `getPermissionLevel`/`isApprovedCollaborator` — maps absent `status`/`permission_level` from legacy `role`. Drop after final backfill verification + zero legacy records remain.
- **`mapLegacyRoleToProfileType` + `role_interest_category` reads** — from Phase 5; orthogonal to authorization. Retained.

---

## 6. Performance changes

| Item | Before | After |
|------|--------|-------|
| Identity fetches in `useEntityEditPermission` | `auth.me()` + per-entity `EntityCollaborator.filter` per editing surface | single `useIdentityAccess` shared cache (60 s staleTime) |
| Repeated `EntityCollaborator.filter` per access check | Async helpers re-query on every call | unchanged for async/handler call sites (rare); render-time now cached via `useIdentityAccess` |
| RaceCore nav resolution | cheap map lookups | unchanged cost; only the *source* changed (registry/relationships vs hardcoded flags) |

No throttling/batching added beyond the shared cache; `useIdentityAccess` already dedupes across every consumer.

---

## 7. Remaining migration work before legacy authorization can be fully removed

**Priority 1 — Consumer call-site rewiring (thread collaborator context into operational panels):**
1. **Race Control** panels: replace `hasPermission(role, perm)` call sites with `resolvePermissionForUser(useIdentityAccess(), 'Series'\|'Track', id, perm)` for lifecycle/publish/grid/penalty/protest/officials gates.
2. **Registration / Entries**: switch `entityAuthority.canManageTrack/Series` call sites to the new type-agnostic `canManageEntity` OR `useIdentityAccess().canManageEntity(type,id)`.
3. **Results publish pipeline**: gate `publish_results` via `hasGrantedPermission('Track'\|'Series', id, 'publish_results')`.
4. **Standings**: gate recalcs/publish via `canManageEntityCanonical('Series', id)` + `hasGrantedPermission(...,'manage_standings')`.
5. **Credentialing**: gate credential issuance on `isRelationshipAdmin(collaboratorRecord)` of the issuing entity.
6. **Paddock / Gate / Timing / Announcements**: derive specialist module availability from `granted_permissions` keys on the active Event relationship, surfaced through `useIdentityAccess().modules`.
7. **Event Management**: `canEditRaceCore` (now relationship-admin) — verify panels consume the hook's widened gate; thread event entity id through lifecycle/closeout buttons.

**Priority 2:**
8. **Garage / MyDashboard** — consume `useIdentityAccess().dashboardWidgets` / `modules`; drop `workspace_access`/`media_roles` reads in `userCapabilities`.
9. **Directories** — gate edit affordances on `canManageEntity(type,id)`; remove Driver `owner_user_id` short-circuit import path.
10. **Media Portal** — resolve entitlements via `hasGrantedPermission` on the issuing org; portal visibility via `identity.roles`.
11. **Management / Messaging** — narrow `canEditManagement` to granted-permission keys once keys are defined per Management surface.

**Priority 2 — Navigation wiring:**
12. `RaceCoreSidebar.jsx` — adopt `getRaceCoreNavForIdentity(useIdentityAccess())` instead of rendering `RACE_CORE_NAV_GROUPS` with inline `adminOnly` checks. (Filter helper is ready; sidebar is the remaining consumer.)

**Priority 3 — Removal (after every consumer migrated):**
13. Delete `config/racecorePermissions.js` (`PERMISSION_MATRIX`, `APP_ROLE_TO_RACECORE`, `hasPermission`) once no call sites remain.
14. Delete `access/entityAccess.jsx`, `access/entityEditPermission.jsx`, `entities/entityPermissions.jsx`, `registrationdashboard/entityAccess.jsx`, `registrationdashboard/entityAuthority.jsx` once consumers point at `identityAccess`/`useIdentityAccess`.
15. Remove the legacy fallbacks inside `identityAccess` (`getPermissionLevel` role map, `isApprovedCollaborator` missing-status branch) once backfill verification confirms no legacy records.

---

## 8. Testing matrix (re-run after each Priority-1 panel migrates)

Use the Base44 Testing Agent. Goal phrasings: Platform Admin / Fan / Driver / Team Owner / Team Member / Track Staff / Official / Media / Sponsor / Vendor / multiple roles / multiple organization memberships / pending relationship / denied / revoked / no relationship / permission override (custom `granted_permissions`).

Critical verifications from this phase:
- Track Staff now reach Race Core nav and can manage entries (lowercase bug fixed) when they have an approved Track collaborator.
- Pending/denied/revoked collaborators have no management access on any migrated helper.
- An editor (staff) of an entity can approve collaborations only if they are relationship-admin — otherwise the Approve button is gated.
- Viewer-level collaborators see read-only affordances (no edit/publish/manage).

**Status:** Pending Testing-Agent execution per migrated panel.

---

## 9. Definition of Done — current status

- ✅ Authorization helper layer consumes `identityAccess` / `useIdentityAccess`.
- 🟡 Per-module consumer call sites still import legacy helpers (routed through canonical behavior now via delegation).
- ❌ `racecorePermissions` matrix still imported by operational panels (Priority 1 rewiring).
- ❌ `raceCoreNavConfig` filter created; sidebar not yet wired (Priority 2 nav).
- ❌ Legacy helper files not deleted (Priority 3, after consumers migrated).

The legacy authorization layer still exists but is now a **delegating compatibility shim** over the canonical architecture. Per-module call-site migration (§7) is the remaining work to delete it.