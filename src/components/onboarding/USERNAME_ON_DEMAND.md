# Username On-Demand

Starting with this change, **a username is no longer required to complete
onboarding**. The goal is to remove friction from the initial sign-up flow:
users can finish setup with only a first name, last name, and contact email.

## The model

| Stage | Username required? |
|-------|-------------------|
| Onboarding → Identity stage | **Optional** |
| Any public-identity feature (create org, publish media, comment, profile interactions) | **Yes — enforced on first use** |

A user who skipped the username field at sign-up is prompted to claim one the
first time they hit a public-identity surface. They pick a handle in a single,
focused screen and are returned straight back to the feature they tried to
use.

## Components & flows

### 1. `IdentityStage` (onboarding)
- First/last name + email remain required.
- Username field renders as **optional** and is left to the user.
- When a username IS entered, every existing validation rule still applies:
  3–24 chars, `[a-z0-9_]`, reserved words, and server-authoritative
  uniqueness via `checkUsernameUnique`.
- A pre-write re-check is still performed in `OnboardingWizardContext.saveIdentity`
  before the `updateMe` call.

### 2. `UsernameFieldWithCheck` (shared input)
One reusable, controlled input used by **both** the onboarding Identity stage
and the lightweight `ClaimUsername` flow. Owns:
- inline format validation (`validateUsername` from `userCapabilities`)
- reserved-word rejection
- debounced server availability check (`checkUsernameUnique`)
- suggestion chips (`suggestUsernameCandidates`)
- status bubbles up to parents via `onStatusChange` so submit buttons gate
  correctly without duplicating the check logic.

This guarantees the two surfaces never drift — one validation contract,
two rendering contexts.

### 3. `ClaimUsername` (lightweight flow)
- Standalone full-screen route at `/ClaimUsername` (no app layout).
- Reached only from a `UsernameRequiredGuard` redirect or the Profile prompt.
- Single step: pick a username → live availability → save → return.
- `?return_to=` and `?feature=` query params preserve the originating feature
  so the user lands back where they started (`return_to` is constrained to
  same-origin absolute paths via `resolveReturnPath`).
- Performs a final pre-write uniqueness re-check (mirrors onboarding).
- Persists `username` + `username_slug` via `auth.updateMe`, invalidates the
  `currentUser` query, then navigates to the return path.
- Users who already have a username are bounced straight to `return_to`.

### 4. `UsernameRequiredGuard`
- Wraps any feature that requires a public identity.
- If the current user has no username → `<Navigate to="/ClaimUsername?...&return_to=<here>">`.
- Bypass rules:
  - Not authenticated → renders children (auth gates handle login elsewhere).
  - Route starts with `/ProfileSetup` or `/ClaimUsername` → renders children
    (avoids redirect loops during onboarding).
  - User already has a username → renders children.
- Pass `featureLabel` to surface a human description on the claim page
  (e.g. `featureLabel="create an organization"`).

### 5. `useUsernameRequired` / `useNeedsUsername` (hooks)
- `useUsernameRequired()` → `{ hasUsername, isAuthenticated, user, isLoading }`
- `useNeedsUsername()` → `{ needsUsername, isLoading }` — for components that
  want to render their **own** inline prompt instead of redirecting.

## Adding a new "username-required" feature

Two options:

**A. Wrap the route (blocks the whole feature until a username exists):**
```jsx
// src/App.jsx
<Route path="/organization/create" element={
  <LayoutWrapper currentPageName="OrganizationCreate">
    <UsernameRequiredGuard featureLabel="create an organization">
      <OrganizationCreate />
    </UsernameRequiredGuard>
  </LayoutWrapper>
} />
```

**B. Inline prompt (component decides when to nudge):**
```jsx
import { useNeedsUsername } from '@/components/onboarding/UsernameRequiredGuard';

function MyFeature() {
  const { needsUsername } = useNeedsUsername();
  if (needsUsername) return <ClaimUsernameInlinePrompt featureLabel="post a story" />;
  // ...feature body
}
```

Prefer **A** for whole-page features and **B** for in-context actions where a
hard redirect would be jarring.

## System integrity
- The backend `checkUsernameUnique` function remains the **authoritative**
  uniqueness gate and is unchanged. Both surfaces call it.
- Reserved-word lists live in `validateUsername` (`userCapabilities.jsx`) and
  are enforced identically in onboarding and the completion flow.
- Once a username is claimed, the same platform-wide standards (uniqueness,
  format, reserved words) apply — there is one source of truth, not two.

## Tests
Pure helpers are covered by `__tests__/usernameOnDemand.test.jsx`
(`suggestUsernameCandidates`, `resolveReturnPath`). Run with `vitest` once a
test runner is added to the project; the file is runner-agnostic and uses
only `vitest`'s `describe/it/expect`.