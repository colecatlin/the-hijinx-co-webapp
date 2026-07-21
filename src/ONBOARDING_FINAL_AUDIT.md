# Onboarding Final Integration Audit

**Scope:** Certify that onboarding is complete, consistent, and fully integrated into the RaceCore architecture. No new entities, no new features — integration, cleanup, and validation only.

**Status:** ✅ Canonical onboarding flow certified. Legacy consumers migrated. Remaining debt isolated and documented.

---

## 1. Data Flow Diagram

```
                        ┌─────────────────────────────────────────────────┐
                        │            /ProfileSetup/:stage (wizard)          │
                        │   OnboardingWizardProvider (OnboardingWizardContext) │
                        └─────────────────────────────────────────────────┘
   identity ─► User(first_name,last_name,username,username_slug)
   about    ─► User(profile_photo_url,banner_image_url,bio,location_display,website_url,social_links)
   roles    ─► User(primary_profile_type,profile_types,onboarding_stage)
   connections ─► EntityCollaborator (via relationshipService.requestRelationship → relationshipLifecycle fn)
   review   ─► User(onboarding_complete=true,onboarding_stage='complete') → /MyDashboard

   OnboardingGuard (server-backed) ── incomplete ──► redirect to resolveOnboardingStage(user)
                       complete  ──► allow
                       admin    ──► allow
                       /ProfileSetup path ──► allow (no loop)

   PersonIdentity  ◄── created by createPersonIdentityFromDriver / mergePersonIdentities (NOT by onboarding wizard)
   EntityRelationship ── org-to-org only; onboarding NEVER writes person-to-org here
```

**Key invariant:** The wizard never owns relationship records. `EntityCollaborator` is the single source of truth — the wizard only reads/refreshes it. Pending approvals never gate completion.

---

## 2. Entity Ownership Table

| Data | Authoritative home | Written by onboarding | Read by |
|------|--------------------|------------------------|---------|
| Public profile fields (photo, banner, bio, location, website, socials) | **User** | AboutStage → `auth.updateMe` | ProfileIdentityHero, Profile, Public Profile |
| Username / username_slug | **User** | IdentityStage → `auth.updateMe` | /u/:username route, Profile |
| Primary role + additional roles | **User** (primary_profile_type, profile_types) | RolesStage → `auth.updateMe` | userModeResolver, GarageAdaptiveModules, Profile |
| Onboarding status | **User** (onboarding_complete, onboarding_stage) | Wizard advanceTo / completeOnboarding | OnboardingGuard, ProfileSetup |
| Organization relationships / approval / permission_level / granted_permissions / audit | **EntityCollaborator** | ConnectionsStage → relationshipLifecycle fn | ConnectionsStage, ReviewStage, MyDashboard, Profile, userCapabilities, userModeResolver |
| Identity reconciliation / merge history / confidence | **PersonIdentity** | (not wizard) | Identity system functions |
| Org-to-org relationships | **EntityRelationship** | (not wizard — never person-to-org) | Organization Platform |

**No duplicate sources of truth.** The wizard is the only onboarding writer to User; `relationshipLifecycle` is the only onboarding writer to EntityCollaborator.

---

## 3. Legacy References Found & Actions Taken This Phase

### Replaced (this phase)
| Location | Legacy | Replacement |
|----------|--------|-------------|
| `userModeResolver.jsx` | `c.role === 'owner'` | `c.permission_level === 'admin' \|\| c.role === 'owner'` (transitional) |
| `userModeResolver.jsx` | `role_interest_category === 'Media / Creator'` media fallback | removed — `primary_profile_type` covers media identity |
| `userCapabilities.jsx` | `c.role === 'owner'` / `!== 'owner'` owner/editor split | `permission_level === 'admin' \|\| role === 'owner'` (transitional) |
| `userCapabilities.jsx` | `role_interest_category` in `isMediaUser` | removed — `profile_types` is the source |
| `MyDashboard.jsx` (RacingProfileCard) | `entity.role === 'owner'` | `permission_level === 'admin' \|\| role === 'owner'` |
| `Profile.jsx` | `role_interest_category` media-gate read | removed |
| `Profile.jsx` | `entity.role === 'owner'` (two sites) | `permission_level === 'admin' \|\| role === 'owner'` |
| `Profile.jsx` | `role_interest_category` write-back in `updateMe` | removed — stops persisting the legacy field |
| `Profile.jsx` | `role_interest_category` in formData | removed |

The `role` field is retained on EntityCollaborator for backwards compatibility (per schema). New code prefers `permission_level` and falls back to `role` so legacy records keep working until a backfill migrates them.

---

## 4. Remaining Legacy / Technical Debt

1. **Legacy alternate onboarding paths (retirement candidates — confirm zero references before deleting):**
   - `src/components/onboarding/OnboardingIntercept.jsx` — pre-wizard intercept. Writes `role_interest`, `role_interest_category`, `media_outlet_name`, `portfolio_url`, `instagram_url`, `disciplines_covered`, `regions_covered` and short-circuits `onboarding_complete=true`. Not imported by `App.jsx`, `pages.config.js`, or `Layout.jsx`. **Likely dead.** Delete once a full reference scan confirms no importer.
   - `src/components/onboarding/PersonIdentityStep.jsx` — only consumed by OnboardingIntercept.
   - `src/components/onboarding/MediaOnboardingFlow.jsx` — only consumed by OnboardingIntercept; writes the legacy fields above.
   - `src/pages/EntityOnboarding.jsx` + `RegisterEntityFlow.jsx` / `ClaimEntityFlow.jsx` / `LinkEntityFlow.jsx` / `OnboardingEntryCards.jsx` — pre-Organization-Platform entity creation flow. `/EntityOnboarding` is shadowed by an `<Navigate to="/ProfileSetup">` route in `App.jsx` and superseded by `/organization/create` + `createOrganization`. Still registered in `pages.config.js` (auto-generated file). Retiring requires removing the page file (which auto-removes the pages.config entry) and the `createEntityWithOwnership` legacy writer.
   - `/DriverProfileSetup` and `/EntityOnboarding` `<Navigate>` safety redirects in `App.jsx` — harmless; keep until link inventory is clean.

2. **Transitional read-only migration retained (intentional):**
   - `mapLegacyRoleToProfileType` in `userCapabilities.jsx` + its use in `Profile.jsx` useEffect: derives `profile_types`/`primary_profile_type` from `role_interest_category` for pre-wizard users on first Profile save. This is a *promoting* migration (legacy → canonical) and is safe to keep until legacy users are re-onboarded. Remove after confirming no users rely on `role_interest_category`.

3. **`media_outlet_name`, `portfolio_url`, `instagram_url` (top-level User fields):** only written by the legacy `MediaOnboardingFlow`. No canonical consumer. Once that flow is retired, these fields can be dropped from active writes; they may remain on historical User records.

4. **`EntityCollaborator.role` legacy field:** kept per schema for backwards compat. After all consumers read `permission_level`, a one-time backfill (`role='owner' → permission_level='admin'`, `role='editor' → permission_level='staff'`) plus dropping `role`-based fallbacks closes the transition.

5. **`Profile.jsx` `city` → `location_display` fallback** (line 185) — legacy `city` field read; harmless but can be removed once no User records carry `city`.

---

## 5. Recommended Cleanup Items (next pass)

1. Reference-scan & delete: `OnboardingIntercept.jsx`, `PersonIdentityStep.jsx`, `MediaOnboardingFlow.jsx`.
2. Reference-scan & delete: `EntityOnboarding.jsx`, `RegisterEntityFlow.jsx`, `ClaimEntityFlow.jsx`, `LinkEntityFlow.jsx`, `OnboardingEntryCards.jsx`; remove the `/EntityOnboarding` & `/DriverProfileSetup` `<Navigate>` shims in `App.jsx`.
3. Backfill `EntityCollaborator.permission_level` from `role`, then drop the `|| c.role === 'owner'` fallbacks added this phase.
4. Remove `mapLegacyRoleToProfileType` + the Profile-effect legacy fallback once legacy users are re-onboarded.
5. Audit `createEntityWithOwnership` backend function — if only used by `RegisterEntityFlow`, retire it alongside that flow (Organization Platform `createOrganization` replaces it).

---

## 6. Onboarding Lifecycle Validation

Runtime validation should be run via the Base44 Testing Agent (side panel). Recommended goal phrasings for each scenario:

- **New user onboarding:** "Register a new account, complete identity/about/roles, finish onboarding, and land on the garage."
- **Existing user migration:** "A legacy user with only role_interest_category logs in — confirm Profile Setup resolves them correctly."
- **Resume after exit:** "Leave onboarding at the Roles stage, reload the app, and confirm the wizard reopens at Roles."
- **Back navigation:** "Use Back from the Connections stage to reach Roles and confirm data is preserved."
- **Pending org requests:** "Submit a team join request in Connections, finish onboarding, and confirm the request shows as Pending on the garage."
- **Multiple / additional roles:** "Select a primary role and two additional roles, then add a third role later from Profile."
- **Team owner create flow:** "Pick Team Owner role, finish onboarding, then create a team from the garage."
- **Team join flow:** "Pick a join-capable role, search a team in Connections, submit the request."
- **Refresh during onboarding:** "Hard-refresh the browser mid-wizard and confirm stage state is restored from the server."
- **Browser restart / mobile:** "Complete onboarding on a mobile-width viewport."
- **Validation errors:** "Submit Identity with empty names and confirm validation blocks Continue."
- **Username conflicts:** "Try a reserved username (`admin`) and a taken username and confirm errors surface."
- **Organization search / duplicate requests:** "Search a team, request access, then request the same team again and confirm duplicate handling."
- **Review screen accuracy:** "Reach Review and confirm name, username, bio, location, roles, and connections all match prior inputs."
- **Completion redirect:** "Finish onboarding and confirm redirect to /MyDashboard with onboarding_complete true."

**Static validation (this phase):**
- ✅ Wizard writes only to User (auth.updateMe) and EntityCollaborator (relationshipLifecycle). No duplicate writes.
- ✅ No temporary onboarding-only state on the User (onboarding_stage/onboarding_complete are the sanctioned lifecycle fields).
- ✅ OnboardingGuard is approval-independent and loop-safe; admins bypass; /ProfileSetup is exempt.
- ✅ ConnectionsStage persists relationships immediately (survives refresh); Review reads them live.
- ✅ Stages cannot be skipped (clampRequestedStage).

---

## 7. Architecture Concerns / Pre-Production Notes

- **No new concerns introduced.** The canonical wizard is the single onboarding entry; Profile Setup is NOT legacy — it is the live wizard.
- The only architecture risk is the **undead legacy parallel paths** (§4.1). They are unreachable from routing but still importable; until deleted they are a future-footgun if anyone re-routes to them. Recommend deleting in the next pass after a reference scan.
- `permission_level` migration is transitional; the `|| role === 'owner'` fallbacks are safe and additive — no behavior change for existing records.