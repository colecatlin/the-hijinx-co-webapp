# PLATFORM PRINCIPLES

## Purpose

This document defines the non-negotiable architectural principles of RaceCore.

Its purpose is to prevent architectural drift as new modules are added. As the platform grows, the temptation to introduce parallel systems, duplicate ownership, or shortcut authorization will increase. This document exists to make those deviations obvious and easy to reject during review.

Every new feature should align with these principles before implementation. If a feature cannot be built without violating one of these principles, the architecture should be reconsidered — not the principle.

This is the internal engineering and product constitution for RaceCore. It is not onboarding documentation. It is not API documentation. It is not user documentation. It is the reference every future contributor should be able to read in under ten minutes.

---

## 1. Core Philosophy

RaceCore is built around a small number of canonical entities. Each concept in the platform has exactly one owner, and that owner is the single source of truth for its concept.

This philosophy exists to protect the platform from the most common failure mode in growing systems: the slow accumulation of parallel systems that solve the same problem in slightly different ways, until no one is sure which system is authoritative.

The core philosophy is simple:

- **One source of truth.** Every concept has one canonical owner. Data is written to that owner and read from that owner.
- **No duplicate ownership.** Two entities never own the same concept. If two appear to, one of them is wrong.
- **No duplicate validation.** Validation lives in one place and is consumed everywhere. The same rule is never implemented twice.
- **No duplicate authorization.** Authorization follows one evaluation path. Modules never implement their own.
- **No parallel systems.** If a new module needs to solve a problem that is already solved, it consumes the existing solution — it does not build a second one.
- **Business logic is centralized.** Shared behavior lives in shared infrastructure, not copied into modules.
- **Composition over special cases.** Behavior is composed from existing pieces. Special-casing a module to bypass shared infrastructure is a bug, not a feature.

---

## 2. Canonical Ownership

Every concept in the platform has exactly one canonical owner. The table below defines that ownership. If a field or concern is not listed under an owner, it does not belong to that owner.

### User

Owns:

- Account identity
- Public profile
- Display name
- First name
- Last name
- Username
- Profile photo
- Banner
- Bio
- Location
- Website
- Social links
- Onboarding status
- Primary capability
- Additional capabilities

Does NOT own:

- Organization permissions
- Organization roles
- Organization membership

### PersonIdentity

Owns:

- Identity reconciliation
- Aliases
- Merge confidence
- Canonical identity
- Evidence

Does NOT own:

- Profile information
- Permissions
- Onboarding

### EntityCollaborator

Owns:

- Person-to-organization relationships
- `role_key`
- Approval status
- `permission_level`
- `granted_permissions`
- Lifecycle
- Audit history

Does NOT own:

- Profile data

### EntityRelationship

Owns:

- Organization-to-organization relationships

Examples:

- Track → Event
- Series → Event
- Organization → Organization

EntityRelationship never represents users. A user-to-organization relationship is always an EntityCollaborator.

### Role Registry

Owns:

- Capabilities
- Navigation
- Modules
- Onboarding requirements
- Icons
- Descriptions
- Categories
- Capability mapping

The registry is configuration, not enforcement. It describes what a role implies about defaults and discoverability — it never grants permissions. Permission granting is always performed by an authorized admin action that writes to EntityCollaborator.

---

## 3. Identity Flow

RaceCore follows a strict, layered identity flow. Each layer depends on the layers above it. No layer may be skipped, and no module reads across layers.

```
Identity
   ↓
Capabilities
   ↓
Relationships
   ↓
Permissions
   ↓
Modules
```

### Identity

Answers: **Who is this person?**

This is the User record (account-level identity) and, for competitors racing across series and seasons, the PersonIdentity record (reconciled racing identity). Identity is established once and referenced everywhere.

### Capabilities

Answers: **What kind of participant are they?**

Capabilities describe how a user participates in the platform — driver, team owner, track operator, series official, media, and so on. Capabilities are derived from role selection and stored as the user's primary and additional capabilities. They drive navigation and onboarding requirements, not permissions.

### Relationships

Answers: **What organization are they connected to?**

A relationship (EntityCollaborator) ties a user to a specific organization with a status of `pending`, `approved`, `denied`, or `revoked`. A capability tells you a user is a team owner in general; a relationship tells you which team, and whether access is active.

### Permissions

Answers: **What may they do there?**

Permissions are granted on top of an approved relationship as a `permission_level` (admin / staff / viewer) and an optional set of granular `granted_permissions`. Permissions are always evaluated against the relationship — never inferred from capabilities.

### Modules

Modules consume all previous layers. A module reads identity, reads capabilities for navigation, reads the active relationship, and evaluates permissions through shared authorization helpers. No module reconstructs these layers itself. No module skips a layer.

---

## 4. Usernames

Usernames are a public identity concern, not an onboarding gate. The username philosophy is deliberately separated from the rest of the onboarding flow to reduce friction and to keep username validation in one place.

### Principles

- Usernames are **optional during onboarding.** A user can complete ProfileSetup without a username.
- Usernames become **required only when accessing public identity features.** That requirement is enforced at the feature boundary, not during onboarding.
- Organization slugs are **independent from usernames.** A slug is a URL concern owned by the organization record; a username is a public handle owned by the user. They do not share validation or uniqueness rules.
- Validation is **centralized.** Format rules, reserved-word checks, and availability checks live in one shared component and one shared backend function.
- Backend uniqueness is **authoritative.** The frontend may provide live feedback, but the backend check is the source of truth. A username is never considered valid until the backend confirms it.

### Features that require a username

Examples of public identity features that gate on username:

- Messaging
- Comments
- Mentions
- Public organizations
- Public driver profiles
- Media publishing

Any feature that surfaces a user's identity publicly must require a username at the point of access, using the shared gate. It must never require a username during onboarding.

### What not to do

- Never duplicate username validation. There is one validator and one backend check.
- Never store a username on an entity other than the user.
- Never treat a username as equivalent to a slug.
- Never require a username to complete onboarding.

---

## 5. Authorization

Authorization is the most repeated operation in the platform, which is why it must follow a single, shared evaluation path.

### Evaluation path

Authorization always evaluates, in order:

```
User
   ↓
Capabilities
   ↓
Approved EntityCollaborator
   ↓
permission_level
   ↓
granted_permissions
   ↓
identityAccess
```

A request is authorized only if every layer in the path resolves in the user's favor. Capabilities tell you what kind of participant the user is; an approved EntityCollaborator tells you which organization they belong to and with what status; `permission_level` and `granted_permissions` describe what they may do; and `identityAccess` is the shared helper that wraps the evaluation into a single, reusable answer.

### Rules

- **Never infer permissions from `profile_types`.** Capabilities and profile types describe participation, not authorization.
- **Never infer organization membership from capabilities.** Being a "team owner" in general does not grant access to any specific team. Access requires an approved EntityCollaborator.
- **Never implement custom authorization inside modules.** Modules call the shared authorization helpers; they do not re-derive access themselves.
- **Always use the shared authorization helpers.** If the shared helper does not cover a case, the helper is extended — not bypassed.

---

## 6. Onboarding

ProfileSetup is the platform's single onboarding flow. Its scope is narrow by design.

### Purpose

ProfileSetup exists to **establish identity.** It captures who the user is and how they participate in the platform. That is all.

### What ProfileSetup does

- Establishes account identity (name, email, username if provided).
- Captures capabilities (roles the user intends to participate as).
- Collects public profile fields.
- Writes every field to its one canonical owner.

### What ProfileSetup does NOT do

- It does **not** establish permissions.
- It does **not** approve relationships.
- It does **not** create authorization.

### Rules

- **Pending approvals never block onboarding completion.** A user can finish ProfileSetup while their organization join requests are still pending. Approval is a separate, asynchronous lifecycle owned by EntityCollaborator.
- **Every field writes to one canonical owner.** Onboarding never duplicates data across entities.
- **No duplicate writes.** A value captured during onboarding is written exactly once, to the entity that owns it.
- **No alternate onboarding flows.** There is one flow. New modules do not introduce their own onboarding steps that bypass it.

---

## 7. Development Rules

These are the engineering rules that keep the architecture intact as the platform grows.

### Every new module must

- Consume shared identity.
- Consume shared authorization.
- Consume shared username validation.
- Consume shared relationship lifecycle.

### Never duplicate

- Validators.
- Permission logic.
- Username checks.
- Onboarding logic.

### Prefer

- Shared services over local implementations.
- Registry-driven configuration over hardcoded lists.
- Composition over special cases.

### Avoid

- Hardcoded role lists. Roles and their metadata come from the Role Registry.
- Hardcoded navigation. Navigation is derived from capabilities and the registry.
- Module-local rules that reimplement platform rules.

---

## 8. Module Checklist

Every new module should be able to answer the following questions before implementation. If a question cannot be answered, the module is not ready to build.

1. **Who is the user?** (Identity)
2. **What capabilities do they have?** (Capabilities)
3. **Which organization are they acting within?** (Relationship)
4. **What permissions were granted?** (Authorization)
5. **Does this feature require a username?** If so, gate at the feature boundary — not during onboarding.
6. **Does this feature require an approved relationship?** If so, enforce it through the shared lifecycle.
7. **Does this feature create new data ownership?** If yes:
   - **Is that ownership already assigned elsewhere?** If a concept already has an owner, the new module must not become a second one.

---

## 9. Architecture Invariants

These are non-negotiable. A change that violates one of these invariants is, by definition, architectural drift and should be rejected during review.

- There is **one onboarding flow.**
- There is **one identity model.**
- There is **one relationship model.**
- There is **one authorization model.**
- There is **one username validation system.**
- There is **one role registry.**
- There is **one permission evaluation path.**
- There is **one source of truth for every concept.**

Modules consume infrastructure. Infrastructure does not duplicate module behavior, and modules do not duplicate infrastructure behavior. The boundary between the two is the contract that keeps the platform coherent.

---

## 10. Future Modules

Future modules — including but not limited to:

- Garage
- Registration
- Event Management
- Race Control
- Results
- Standings
- Media Portal
- Messaging
- Notifications
- Paddock
- Credentialing
- Timing & Scoring

must build on these principles rather than introducing alternate identity, authorization, onboarding, or permission systems. Each new module consumes the shared layers defined here; none of them defines its own.

A new module that appears to require a second identity model, a second relationship model, or a parallel authorization path is a signal that the module's design is wrong — not that the platform needs a new system.

---

## Final Statement

If a proposed feature conflicts with these principles, the architecture should be reconsidered before implementation.