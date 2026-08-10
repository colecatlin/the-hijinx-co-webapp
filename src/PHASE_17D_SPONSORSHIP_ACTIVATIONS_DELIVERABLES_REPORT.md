# Phase 17D — Sponsorship Activations & Deliverables Execution Layer

**Status:** ✅ Complete  
**Date:** 2026-08-10  
**Phase:** 17D  
**Depends on:** Phase 17A (Sponsorship Foundation), Phase 17B (Read Compatibility), Phase 17C (Commercial Integration)

---

## Overview

Phase 17D introduces a first-class **execution layer** for Sponsorships, separating the *obligation* (what was promised) from the *execution* (what was actually done) and from the *financial* layer (how money flows).

### Three-Layer Separation

| Layer | Entity | Answers | Financial? |
|-------|--------|---------|------------|
| **Commercial** | Sponsorship | Who is the commercial relationship with? | No |
| **Execution** | Activation | What did we actually do for the partner? | Budget only (cents, not recognized revenue) |
| **Obligation** | SponsorshipDeliverable | What was promised? | No |

The financial layer (RevenueAgreement, RevenueEvent) remains untouched — Activations and Deliverables store **no financial values**. Budget on Activation is operational planning metadata in cents, not recognized revenue.

---

## Entities Created

### 1. Activation (`base44/entities/Activation.jsonc`)

One execution of a Sponsorship — a real-world or digital activation.

**Key fields:**
- `sponsorship_id` (required) — parent Sponsorship
- `activation_type` (17-value enum: EventExperience, Hospitality, FanActivation, Giveaway, Display, Booth, VehicleBranding, MediaIntegration, SocialCampaign, ContentCampaign, DriverAppearance, TeamAppearance, ProductSampling, Merchandise, Digital, Community, Other)
- `title`, `description`, `status` (planned → approved → active → completed → cancelled → archived)
- `start_date`, `end_date` (date-time)
- `linked_event_id`, `linked_track_id`, `linked_media_id`, `linked_advertisement_id`, `linked_media_assignment_id` (optional cross-entity links)
- `location`, `url` (free-text)
- `budget_amount` (cents, ≥0, NOT recognized revenue)
- `estimated_reach`, `actual_reach` (manual foundation metrics, ≥0)
- `public_visibility` (default `private` — Phase 17E owns public exposure)
- `normalized_activation_key` (deduplication: `sponsorship_id:activation_type:linked_event_id_or_none:start_date_or_none:normalized_title`)
- `is_archived`, `archived_at`, `created_by_user_id`, `updated_by_user_id`

### 2. SponsorshipDeliverable (`base44/entities/SponsorshipDeliverable.jsonc`)

One promised obligation tied to a Sponsorship (and optionally an Activation).

**Key fields:**
- `sponsorship_id` (required) — parent Sponsorship
- `activation_id` (optional) — parent Activation, or standalone
- `deliverable_type` (22-value enum: LogoPlacement, SocialPost, VideoIntegration, MediaArticle, Newsletter, LivestreamMention, EventSignage, VehicleBranding, HospitalityPass, VIPExperience, DriverAppearance, TeamAppearance, ProductDisplay, ProductSampling, Giveaway, MerchandiseInclusion, Booth, PhotoContent, VideoContent, PodcastIntegration, DigitalPlacement, Other)
- `title`, `description`, `status` (planned → in_progress → submitted → approved → completed → cancelled → archived)
- `quantity_required` (≥1), `quantity_completed` (≥0, may exceed required for over-delivery reporting)
- `due_date`, `completed_at` (set once on first completion — idempotent)
- `linked_event_id`, `linked_track_id`, `linked_media_id`, `linked_advertisement_id`, `linked_media_assignment_id`
- `evidence_url`, `evidence_notes`
- `public_visibility` (default `private`)
- `normalized_deliverable_key` (dedup: `sponsorship_id:activation_id_or_none:deliverable_type:linked_event_id_or_none:normalized_title`)
- `is_archived`, `archived_at`, `created_by_user_id`, `updated_by_user_id`

### 3. Deprecated Field

`Sponsorship.deliverables` (JSON array) — deprecated. 0 records use it. Retained for backward compatibility; no new code should write to it. Phase 17D replaces it with the first-class SponsorshipDeliverable entity.

---

## Shared Logic

### `base44/shared/sponsorshipActivationHelpers.ts`

- `validateSponsorshipForActivation()` — validates Sponsorship exists, is non-archived, has valid Organization
- `validateActivationLinks()` / `validateDeliverableLinks()` — validates cross-entity references + sponsorship mismatch checks
- `buildNormalizedActivationKey()` / `buildNormalizedDeliverableKey()` — deterministic dedup keys
- `calculateDeliverableProgress()` — completion %, is_complete, over_delivered
- `isValidActivationStatus()` / `isValidDeliverableStatus()` — enum validation
- `isValidActivationStatusTransition()` / `isValidDeliverableStatusTransition()` — lifecycle rules
- `validateBudget()` — cents, ≥0
- `validateReach()` — ≥0
- `validateDateRange()` — start ≤ end
- `loadSponsorshipExecutionCounts()` / `loadSponsorshipExecutionCountsBatch()` — aggregate counts for read models

### `base44/shared/orchestratorHelpers.ts`

- `archiveEntityById()` — shared archive logic used by both upsert orchestrators (eliminates duplication)

---

## Backend Functions

### Orchestrators

| Function | Purpose |
|----------|---------|
| `upsertActivation` | Single authoritative write path for Activations (create/update/archive/dry_run) |
| `upsertSponsorshipDeliverable` | Single authoritative write path for Deliverables (create/update/complete/archive/dry_run) |

**Contract — upsertActivation:**
```json
// Create/Update
{ "operation": "upsert", "activation": { "sponsorship_id": "...", "activation_type": "...", "title": "...", ... }, "dry_run": false }

// Archive
{ "operation": "archive", "activation": { "activation_id": "..." } }
```

**Contract — upsertSponsorshipDeliverable:**
```json
// Create/Update
{ "operation": "upsert", "deliverable": { "sponsorship_id": "...", "deliverable_type": "...", "title": "...", ... } }

// Complete (idempotent)
{ "operation": "complete", "deliverable": { "deliverable_id": "..." } }

// Archive
{ "operation": "archive", "deliverable": { "deliverable_id": "..." } }
```

### Audit Functions

| Function | Purpose |
|----------|---------|
| `auditSponsorshipActivationIntegrity` | Validates all Activation records (links, budget, reach, dates, dedup, visibility) |
| `auditSponsorshipDeliverableIntegrity` | Validates all Deliverable records (links, quantities, completion, dedup, visibility) |

### Extended Audits

- `auditSponsorshipIntegrity` — now includes `total_activations`, `total_deliverables`, `orphaned_activations`, `orphaned_deliverables`, `inconsistent_public_execution`, and an `execution_relationships` section
- `auditCommercialRelationshipIntegrity` — now includes `total_activations`, `total_deliverables`, `activations_with_sponsorship`, `deliverables_with_sponsorship`, `orphaned_activations`, `orphaned_deliverables`

### Extended Read Models

- `sponsorshipCommercialHelpers.ts` — `buildSponsorshipsForTargetWithCommercial()` now enriches each sponsorship with execution counts: `activation_count`, `active_activation_count`, `completed_activation_count`, `deliverable_count`, `deliverables_completed`, `deliverables_outstanding`, `deliverable_completion_percent`

---

## Management UI

### `src/pages/ManageSponsorshipActivations.jsx`

Admin-only internal management page with:
- Sponsorship search/picker
- Activation list with inline deliverables
- Create/edit/archive activations
- Create/edit/complete/archive deliverables
- Standalone deliverable support (deliverables not tied to a specific activation)

**Components:**
- `src/components/sponsorship/SponsorshipPicker.jsx`
- `src/components/sponsorship/ActivationForm.jsx`
- `src/components/sponsorship/DeliverableForm.jsx`
- `src/components/sponsorship/ActivationCard.jsx`

**Route:** `/ManageSponsorshipActivations`

---

## Controlled Test Results

All 10 controlled tests passed:

| # | Test | Result |
|---|------|--------|
| 1 | upsertActivation dry_run | ✅ Projected, no writes |
| 2 | upsertActivation create | ✅ Created, normalized key correct |
| 3 | upsertActivation invalid sponsorship | ✅ Rejected with 400 |
| 4 | upsertActivation idempotent update | ✅ Updated, reused: true |
| 5 | upsertSponsorshipDeliverable create (with activation) | ✅ Created, progress 0% |
| 6 | upsertSponsorshipDeliverable create (standalone) | ✅ Created, normalized key correct |
| 7 | upsertSponsorshipDeliverable complete | ✅ Completed, idempotent: false |
| 8 | upsertSponsorshipDeliverable complete (idempotent) | ✅ Completed, idempotent: true |
| 9 | upsertSponsorshipDeliverable archive | ✅ Archived |
| 10 | upsertActivation archive | ✅ Archived |

### Audit Results

| Audit | Total Issues | Critical | Warnings |
|-------|-------------|----------|----------|
| auditSponsorshipActivationIntegrity | 0 | 0 | 0 |
| auditSponsorshipDeliverableIntegrity | 1 | 0 | 1 (completed_quantity_below_required — expected for test) |
| auditSponsorshipIntegrity | 0 execution issues | 0 orphaned | 0 inconsistent |
| auditCommercialRelationshipIntegrity | 0 execution issues | 0 orphaned | 0 orphaned |

---

## Design Decisions

1. **Strict separation** — Execution (Activation/Deliverable) is separate from Financial (RevenueAgreement/RevenueEvent). No financial values on execution entities.
2. **Budget in cents** — `budget_amount` on Activation is stored in cents (smallest currency unit) for precision, but is NOT recognized revenue.
3. **Idempotent completion** — `completed_at` is set once on first completion and never changed on repeat complete calls.
4. **Over-delivery allowed** — `quantity_completed` may exceed `quantity_required` (reported as warning, not blocked).
5. **Private by default** — Both Activation and Deliverable default to `public_visibility: 'private'`. Phase 17E owns public exposure.
6. **Admin-only writes** — Both orchestrators require admin role (conservative for Phase 17D, same as upsertSponsorship).
7. **Deterministic dedup** — Normalized keys use deterministic components (no fuzzy matching), consistent with Phase 17A patterns.
8. **Shared archive logic** — `orchestratorHelpers.ts` eliminates archive pattern duplication between the two orchestrators.
9. **Backward compatible** — `Sponsorship.deliverables` JSON field deprecated but retained (0 records use it). No existing behavior changed.

---

## What Phase 17D Does NOT Do

- Does NOT auto-complete parent Activation when all Deliverables complete
- Does NOT create RevenueEvent from Activation budget
- Does NOT change RevenueAgreement status
- Does NOT change Sponsorship financial fields
- Does NOT expose Activations/Deliverables on public surfaces (Phase 17E)
- Does NOT generate RaceCore IDs for Activations/Deliverables (future phase)