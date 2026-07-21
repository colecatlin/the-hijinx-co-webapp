# ProfileSetup — Production Readiness Audit

**Reviewed:** `src/pages/ProfileSetup.jsx`, `OnboardingWizardContext.jsx`, `OnboardingWizardLayout.jsx`, `OnboardingProgress.jsx`, `onboardingConfig.js`, `OnboardingGuard.jsx`, `IdentityStage.jsx`, `AboutStage.jsx`, `RolesStage.jsx`, `ConnectionsStage.jsx`, `ReviewStage.jsx`, `relationships/relationshipService.js`, backend `relationshipLifecycle/entry.ts`, `base44/entities/User.jsonc`, `config/onboardingRoles.js`.
**Mode:** Internal pre-release QA. No fixes implemented.

---

## 1. Final Verdict

# ❌ Not Ready

A Critical schema/registry mismatch breaks the Roles stage for ~11 of 16 selectable primary roles. Combined with silent error handling (which would mask the failures from users), Team Owner (create) producing no persisted record, and a username uniqueness check that doesn't exist, the flow is not certifiable for human testing until the blockers are resolved.

---

## 2. Stage Completeness

| Stage | UI complete? | Persists real data? | Issues |
|-------|--------------|--------------------|--------|
| Identity | ✅ | ✅ (`base44.auth.updateMe` → `first_name`, `last_name`, `username`, `username_slug`) | Save errors surface under the Username field regardless of field; no uniqueness check (§4). |
| About | ✅ | ✅ (`profile_photo_url`, `banner_image_url`, `bio`, `location_display`, `website_url`, `social_links`) | Save failures are **silent** (catch resets `saving`, no message). |
| Roles | ✅ for the UI | ❌ **Fails for most selections** | Writes raw registry role ids into `primary_profile_type` / `profile_types`, which the `User` schema enum does not allow (§3, Critical B1). |
| Connections | ✅ | 🟡 partial | **Join** path persists a real pending `EntityCollaborator`; **Create** path is session-only and persists nothing (§5, High B2). Denied/revoked relationships render as "Pending approval" (§5, Med B3). |
| Review | ✅ | ✅ finalize | `relationships` rendered with same binary approved/"Pending approval" mislabeling. Launch failure is silent. |
| Completion | ✅ | ✅ | `onboarding_complete` + `onboarding_stage:'complete'` + redirect to `/MyDashboard`; idempotent on repeat. |

No literal TODOs/placeholders/console.logs in the wizard files. The "session-only create placeholder" is an unfinished *behavior*, flagged in §5.

---

## 3. Field Routing Table

| Field | Destination Entity | Write Path | Read Path | Verified |
|-------|--------------------|-----------|-----------|----------|
| first_name | User | `updateMe` (IdentityStage → `saveIdentity`) | `user.first_name` | ✅ |
| last_name | User | `updateMe` (saveIdentity) | `user.last_name` | ✅ |
| username | User | `updateMe` (saveIdentity) | `user.username` | ✅ |
| username_slug | User | `updateMe` (saveIdentity, lowercased copy of username) | `user.username_slug` | ✅ |
| profile_photo_url | User | `updateMe` (AboutStage → `saveAbout`) | `user.profile_photo_url` | ✅ |
| banner_image_url | User | `updateMe` (saveAbout) | `user.banner_image_url` | ✅ |
| bio | User | `updateMe` (saveAbout) | `user.bio` | ✅ |
| location_display | User | `updateMe` (saveAbout) | `user.location_display` | ✅ |
| website_url | User | `updateMe` (saveAbout) | `user.website_url` | ✅ |
| social_links | User | `updateMe` (saveAbout → SocialLinksEditor) | `user.social_links` | ✅ |
| primary_profile_type | User | `updateMe` (RolesStage → `saveRoles`) | `user.primary_profile_type` | ❌ **enum mismatch — write rejected for non-canonical role ids** |
| profile_types | User | `updateMe` (saveRoles) | `user.profile_types` | ❌ **enum mismatch — write rejected for non-canonical role ids** |
| onboarding_stage | User | `updateMe` (advanceTo) | `user.onboarding_stage` | ✅ (but not saved when the same payload fails on roles) |
| onboarding_complete | User | `updateMe` (completeOnboarding) | `user.onboarding_complete` | ✅ |
| Organization membership | EntityCollaborator | `relationshipLifecycle` create (ConnectionsStage) | `user_id` filter in wizard context | ✅ (join only) |
| request_message / requested_at | EntityCollaborator | relationshipLifecycle create | n/a | ✅ |
| access_code | EntityCollaborator | passed to create (empty when omitted) | n/a | ✅ |

**No duplicate owners** among canonical fields — each field writes to exactly one entity. The blocker is that the *values written* for roles are not in the User enum, not a routing issue.

---

## 4. Stage Lifecycle Checklist

(T = Identity/About/Roles/Connections/Review/Completion)

| Behavior | Identity | About | Roles | Connections | Review |
|---------|----------|-------|-------|-------------|--------|
| Initial load (seeds from `user`) | ✅ | ✅ | ✅ | ✅ (reads `relationships`) | ✅ |
| Validation | ✅ names required, username format | ✅ none required | ✅ primary required | ✅ none required | ✅ |
| Save (real persist) | ✅ | ✅ | ❌ enum rejection for most roles | 🟡 join only persists; create does not | ✅ finalize |
| Resume after refresh | ✅ reads `onboarding_stage` | ✅ | ✅ (stays on stage; but cannot advance past enum failure) | ✅ reads relationships live | ✅ |
| Back navigation | ✅ layout Back → prevStage | ✅ | ✅ | ✅ | ✅ |
| Forward navigation | ✅ Continue → advanceTo | ✅ | ❌ blocked by save failure | ✅ Continue → review | ✅ Launch |
| Loading states | ✅ spinner in button | ✅ | ✅ | ✅ | ✅ |
| Error handling | 🟡 error shown under **Username** for non-username failures | ❌ **silent** | 🟡 generic message only | ❌ **silent** on continue error | ❌ **silent** on launch error |
| Completion | n/a | n/a | n/a | n/a | ✅ idempotent |

---

## 5. Issues — by severity

### Critical blockers
**B1 — Roles stage writes non-canonical `profile_type` value to User enum**
- Severity: Critical · Files: `src/components/onboarding/RolesStage.jsx`, `OnboardingWizardContext.jsx`, `base44/entities/User.jsonc`
- Reason: `saveRoles` writes `primary_profile_type = primaryRole` and `profile_types = ['fan', primaryRole, ...additionalRoles]` using raw registry role ids. `User.primary_profile_type` / `profile_types` enums allow only `fan, driver, team, media, brand, track, series, crew, builder, sponsor, photographer, creator`. Selecting `team_owner`, `team_member`, `crew_member`, `track_staff`, `series_staff`, `official`, `videographer`, `vendor`, `manufacturer`, `partner`, or `volunteer` makes `updateMe` reject the payload → `onboarding_stage` is *not* advanced → user cannot progress past Roles. This blocks Team Owner/Member, Track Staff, Series Staff, Official, Vendor, Manufacturer, Partner, Volunteer primary-role paths, and any additional role containing those ids.
- Recommended fix: align the contracts — either (a) expand the User schema enum to include every registry role id used as `profile_type`, or (b) introduce an explicit registry-role → canonical-`profile_type` mapping in `onboardingConfig`/`identityAccess` and have `saveRoles` write the mapped type while the true registry role id is preserved in a relationship `role_key` only. Decide whether `User.profile_types` is coarse identity (recommended) or granular role registry.

### High priority
**B2 — Team Owner (create) path performs no persistent operation**
- Severity: High · File: `src/components/onboarding/ConnectionsStage.jsx`
- Reason: `submitCreate` only pushes the typed name into `localCreateEntries` (session-only). Nothing is written to `Team` or `EntityCollaborator`. The placeholder vanishes on refresh and the "Add new Team" affordance looks like a real create action that does nothing. Violates "every visible action performs a real persistent operation."
- Recommended fix: either remove the create affordance from onboarding and direct Team Owners to post-launch org creation (`/organization/create`), or wire `submitCreate` to the Organization Platform create flow so a real Team + owner-collaborator is persisted before advancing.

**B3 — Username uniqueness not validated**
- Severity: High · Files: `IdentityStage.jsx`, `OnboardingWizardContext.saveIdentity`, `User.jsonc`
- Reason: `validateUsername` only checks format and reserved words. `User.username` is not marked unique in the schema. Two users can claim the same username, breaking `/u/:username` routing. The QA matrix scenario "taken username → validation error" will fail.
- Recommended fix: server-side uniqueness enforcement on `username` + a uniqueness check before `saveIdentity` advances (display "this handle is taken").

### Medium priority
**B4 — Denied / revoked relationships rendered as "Pending approval"**
- Severity: Medium · Files: `ConnectionsStage.jsx`, `ReviewStage.jsx`
- Reason: `status === 'approved' ? 'Approved' : 'Pending approval'` collapses `denied` and `revoked` into "Pending approval". QA requirement "Denied displayed / Revoked displayed" fails and users are misled about their access state.
- Recommended fix: branch on `c.status` to show Approved / Pending / Denied / Revoked labels and colors.

**B5 — Silent save failures on About / Connections(continue) / Review(launch)**
- Severity: Medium · Files: `AboutStage.jsx`, `ConnectionsStage.jsx`, `ReviewStage.jsx`
- Reason: `catch (e) { setSaving(false); }` discards the error. On any `updateMe`/`completeOnboarding` failure the button re-enables with no message. This also masks B1 from the user.
- Recommended fix: surface the message via an error banner (ConnectionsStage has an `error` state already; reuse the pattern in About/Review).

**B6 — OnboardingGuard coverage not verified at the router**
- Severity: Medium · Files: `App.jsx`, `OnboardingGuard.jsx`
- Reason: The centralized guard exists and is loop-safe, but the reviewed `App.jsx` does not wrap `/MyDashboard` (or other authenticated routes) in `<OnboardingGuard>` at the router level. If `MyDashboard.jsx` does not self-guard with equivalent logic, an incomplete user can bypass onboarding by navigating directly.
- Recommended fix: verify MyDashboard's internal guard; preferably wrap authenticated routes (`<Route element={<OnboardingGuard><Outlet/></OnboardingGuard>}>`) once, removing per-page duplication. The guard's `location.pathname.startsWith('/ProfileSetup')` short-circuit and admin bypass are correct.

**B7 — Identity save errors attributed to the Username field**
- Severity: Medium · File: `IdentityStage.jsx`
- Reason: `handleContinue` catch sets `setUsernameError(e?.message)` for any save failure, including first/last-name write errors. Mislocalizes errors.
- Recommended fix: route generic save errors to a stage-level error banner; reserve `usernameError` for username-specific failures.

### Low priority polish
**B8 — Dead import** · `ReviewStage.jsx` imports `ArrowLeft` but never uses it. Remove.
**B9 — No `<form>` / Enter-to-submit** · Each stage uses bare buttons; pressing Enter inside inputs does not submit. Wrap in `<form onSubmit>` for keyboard parity.
**B10 — Labels not bound to inputs** · `Label` lacks `htmlFor`/`id` association across stages; screen readers won't tie labels to fields. Add `htmlFor`.
**B11 — Search results list already-requested orgs** · `ConnectionsStage` doesn't exclude entities the user already has a relationship with; clicking shows a duplicate error from the backend. Filter results client-side.
**B12 — "Add new" affordance discoverability during Team Owner join** · When `mode==='create'` the search box is hidden (only the create field shows); a user who wants to join an existing team on the Team Owner role can't. Consider offering both modes for `requires_approval === 'conditional'`.
**B13 — Minor** `OnboardingWizardContext` hardcodes `error: null` in the context value — mildly misleading; consider threading real load errors.

---

## 6. Connections stage — requirements checklist

| Requirement | Status | Note |
|-------------|--------|------|
| Registry drives required relationships | ✅ | `rolesNeedingConnection` filters by `requires_relationship && relationship_required_on_onboarding` |
| Relationship requests persist | ✅ (join) | `requestRelationship` → `relationshipLifecycle:create` writes a real pending record |
| Duplicate requests prevented | ✅ | backend rejects duplicate active (pending/approved) same user+entity+role_key |
| Pending requests displayed | ✅ | `pendingForRole(by role_key)` lists them |
| Approved displayed | ✅ | approved label shown |
| Denied displayed | ❌ | rendered as "Pending approval" — B4 |
| Revoked displayed | ❌ | rendered as "Pending approval" — B4 |
| Completion never blocked by pending approval | ✅ | `saveConnections` → `advanceTo({},"review")` regardless of pending state |

---

## 7. Onboarding paths — scenario matrix

| Scenario | Complete internally? | Blocker |
|----------|--------------------|--------|
| Fan only | ✅ | none |
| Driver | ✅ (enum permits `driver`) | none |
| Driver + Media | ✅ (both enum-valid) | none |
| Team Member (join) | ❌ | B1 (`team_member` not in User enum) |
| Team Owner (create) | ❌ | B1 + B2 |
| Team Owner (join) | ❌ | B1 |
| Track Staff | ❌ | B1 (`track_staff`) |
| Series Staff | ❌ | B1 (`series_staff`) |
| Official | ❌ | B1 (`official`) |
| Sponsor | ✅ (`sponsor` enum) | none |
| Vendor | ❌ | B1 (`vendor`) |
| Manufacturer | ❌ | B1 (`manufacturer`) |
| Partner | ❌ | B1 (`partner`) |
| Volunteer | ❌ | B1 (`volunteer`) |
| Multiple simultaneous roles | ❌ | B1 (any non-canonical role id in payload fails the whole save) |

A single non-enum role in the selected set fails the entire `profile_types` payload, so multi-role combos regress too.

---

## 8. Guard behavior

- Redirect loop: none. Guard short-circuits inside `/ProfileSetup` and only redirects when `pathname !== target`.
- Public route exemptions: public routes (Home, directories, store, outlet) are not wrapped → accessible. ✅
- Completed users bypass onboarding: `onboarding_complete === true` returns children. ✅
- Incomplete users cannot bypass: **verify** — depends on MyDashboard self-guarding (B6).
- Admin behavior: documented (guard returns children for `user.role === 'admin'`); admin manually visiting `/ProfileSetup` is not specially routed, which is acceptable.

---

## 9. UI polish

- Copy: consistent ("Continue", "Launch my garage", stage labels). ✅
- Button labels: consistent. ✅
- Loading indicators: present on all submit buttons. ✅
- Alignment/spacing: refined glass card, responsive `max-w-lg`. ✅
- Empty states: Connections "No organization connections required"; Review "No connection requests." ✅
- Validation messages: present where validation exists; About/Connections expose none because nothing is required.
- Error surfaces: inconsistent / absent in 3 stages (B5).
- Accessibility: label association missing (B10); Enter submit missing (B9).
- Mobile responsiveness: acceptable.
- Keyboard navigation: buttons reachable; input Enter does not submit (B9).

---

## 10. Code quality

- Dead import: `ArrowLeft` in `ReviewStage.jsx` (B8).
- Duplicate logic: none significant; relationship lifecycle centralized in `relationshipLifecycle`.
- Unused state: `error` in `OnboardingWizardContext` is always `null` (B13).
- Unreachable branches: none.
- TODO comments / console logging: none in the wizard.
- Temporary compatibility code: `localCreateEntries` create placeholder is the clearest temp shim (B2).
- Refactor opportunity: pull a shared `StageErrorBanner` so all stages surface errors uniformly (addresses B5).

---

## 11. Release Checklist

**Critical blockers**
- [ ] B1 Resolve User profile_type enum vs registry role-id mismatch (otherwise 11+ primary roles unusable).

**High priority**
- [ ] B2 Make Team Owner create a real persistent Team/relationship (or remove the create affordance).
- [ ] B3 Enforce username uniqueness (server + onboarding check).

**Medium priority**
- [ ] B4 Show denied/revoked relationship statuses accurately.
- [ ] B5 Surface save/launch errors on About, Connections, Review.
- [ ] B6 Verify/strengthen OnboardingGuard coverage on authenticated routes.
- [ ] B7 Route identity save errors to the correct surface.

**Low priority polish**
- [ ] B8 Remove unused `ArrowLeft`.
- [ ] B9 `<form>` Enter-to-submit.
- [ ] B10 `htmlFor` label association.
- [ ] B11 Exclude already-requested orgs from search.
- [ ] B12 Offer join + create together for the Team Owner role.
- [ ] B13 Thread real load errors through context.

**Known limitations / intentionally deferred**
- "Create new organization during onboarding" deferred to post-launch (Organization Platform), per code comment — but the affordance still renders (B2).
- Preview/file uploads (`MediaUploader`) not re-QA'd here — assumed functional from prior phases.
- `relationshipLifecycle` deliberately writes legacy `role = 'editor'` on all new joins (transitional, see Phase 5 audit).

---

## 12. Recommended order of work before re-certification

1. Resolve B1 (decide coarse-vs-granular profile_types; align schema and/or mapping). This unblocks nearly all scenarios.
2. Resolve B5 (unified error banner) so B1 and other failures stop hiding.
3. Resolve B2 and B3 (real create persistence + username uniqueness).
4. Resolve B4, B6, B7.
5. Polish B8–B13.

Re-run the QA persona matrix in §7 and the field-routing table in §3 after fixes; the flow is certifiable only when every scenario in §7 reaches the dashboard and every §3 field is "Verified ✅".