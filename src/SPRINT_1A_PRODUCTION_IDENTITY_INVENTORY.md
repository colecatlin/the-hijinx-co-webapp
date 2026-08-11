# SPRINT_1A_PRODUCTION_IDENTITY_INVENTORY

**Sprint:** 1A — Production Identity & Cleanup Inventory  
**Date:** 2026-08-11  
**Release Target:** Hijinx v1.0 — Friends & Family Stabilization  
**Task Type:** Read-only classification inventory — NOT an implementation task  
**Mission:** Inventory every public-facing artifact and classify it as KEEP, REWRITE, or REMOVE. Differentiate intentional Friends & Family roadmap messaging from unprofessional production artifacts.  
**Constraint:** Do NOT classify intentional staged-rollout messaging as launch blockers. Do NOT recommend removing intentional Friends & Family roadmap messaging. Differentiate unfinished features from unprofessional production artifacts.  

---

## 1. Executive Summary

The Hijinx platform is preparing for a **Friends & Family release** — an intentionally staged rollout that is NOT feature complete. Some "Coming Soon" messaging, beta messaging, and roadmap messaging is **intentional and correct** for this phase.

This inventory separates three categories of public-facing artifacts:

1. **KEEP** — 28 items that are intentionally part of the Friends & Family experience (apparel redirect, marketplace placeholder, beta messaging concept, claims flow, design system, branded logo, etc.)

2. **REWRITE** — 31 items whose purpose is correct but whose wording or visual treatment is not production quality (hardcoded colors on 8+ pages, unclear beta messaging, unexplained terminology, weak empty states, missing legal links, search placeholder too long, etc.)

3. **REMOVE** — 12 items that are developer-facing artifacts exposed to public users (Base44 title, Base44 favicon, AI implementation text in 404, silent failure in Report Issue, legacy route in mobile nav, etc.)

### Key Insight

The Friends & Family release does NOT need every feature finished. It needs:

- **Zero developer artifacts** visible to public users
- **Zero Base44 branding** remaining in the HTML shell
- **Consistent visual identity** (no hardcoded colors breaking the theme)
- **Clear, intentional messaging** about what's ready and what's coming
- **Legal pages** present (Privacy, Terms) — even if minimal
- **Trust infrastructure** functional (help, contact, report issue)

The difference between "intentionally unfinished" and "accidentally unprofessional" is the core of this inventory.

### Inventory Summary

| Classification | Count | Description |
|---------------|-------|-------------|
| **KEEP** | 28 | Intentional Friends & Family experience items |
| **REWRITE** | 31 | Correct purpose, wrong wording or visual treatment |
| **REMOVE** | 12 | Developer artifacts exposed to public users |
| **Total** | 71 | Public-facing artifacts inventoried |

---

## 2. KEEP Inventory

Items intentionally part of the Friends & Family experience. These should remain visible.

### 2.1 Apparel — "New Shop Coming Soon"

| Field | Value |
|-------|-------|
| **Location** | `src/pages/ApparelHome.jsx` |
| **Current wording** | "New Shop Coming Soon" / "In the meantime, check out our old one." / "Visit Hijinx.com" button |
| **Purpose** | Intentionally hides internal apparel shopping while backend is in development; redirects to external Shopify site |
| **Classification** | **KEEP** |
| **Reason** | Intentional Friends & Family staging. The apparel shop is not ready; the redirect to the existing Shopify store is the correct user experience. Messaging is clear and actionable. |
| **Priority** | N/A |
| **Owner** | Content |

### 2.2 Marketplace — "Coming Soon" Disabled Button

| Field | Value |
|-------|-------|
| **Location** | `src/pages/MarketplaceHome.jsx` (line 59-64) |
| **Current wording** | Disabled button labeled "Coming Soon" |
| **Purpose** | Shows marketplace category structure (Apparel, Parts & Hardware, Memorabilia, Accessories) with a disabled CTA communicating future availability |
| **Classification** | **KEEP** |
| **Reason** | Intentional Friends & Family staging. The marketplace is not transactional yet. Showing the category structure communicates vision; the disabled button communicates status. |
| **Priority** | N/A |
| **Owner** | Content |

### 2.3 Beta Announcement Bar (Concept)

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/AnnouncementBar.jsx` |
| **Current wording** | "WELCOME TO HIJINX BETA — THE PLATFORM IS EVOLVING IN REAL TIME" (default; overridden by admin-managed announcements) |
| **Purpose** | Communicates to visitors that the platform is in a staged rollout phase |
| **Classification** | **KEEP** (concept) — **REWRITE** (wording, see §3.1) |
| **Reason** | The concept of a beta/ Friends & Family announcement bar is intentional and correct. The specific wording should be refined to be clearer about the Friends & Family phase. |
| **Priority** | N/A (concept) |
| **Owner** | Content |

### 2.4 Join Page — Claims Concept

| Field | Value |
|-------|-------|
| **Location** | `src/pages/JoinIndex46.jsx` |
| **Current wording** | "Find your profile → Submit a claim → Build it out" 3-step process |
| **Purpose** | Explains the entity claims process for racers, teams, tracks, and series |
| **Classification** | **KEEP** |
| **Reason** | The claims concept is a core Friends & Family feature. The 3-step explanation is clear and professional. |
| **Priority** | N/A |
| **Owner** | Content |

### 2.5 Join Page — Roadmap Perk

| Field | Value |
|-------|-------|
| **Location** | `src/pages/JoinIndex46.jsx` (line 71) |
| **Current wording** | "Early access to RaceCore operations tools as they roll out" |
| **Purpose** | Communicates that RaceCore operational tools are part of a staged rollout |
| **Classification** | **KEEP** (concept) — **REWRITE** (wording, see §3.2) |
| **Reason** | Roadmap messaging is intentional for Friends & Family. The wording "as they roll out" is slightly informal and could be clearer. |
| **Priority** | N/A (concept) |
| **Owner** | Content |

### 2.6 Hijinx Logo

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/HijinxLogo.jsx` |
| **Current wording** | Branded Hijinx icon + wordmark, theme-aware (light/dark variants) |
| **Purpose** | Primary brand identity in header |
| **Classification** | **KEEP** |
| **Reason** | Properly branded, theme-aware, professional. No issues. |
| **Priority** | N/A |
| **Owner** | Branding |

### 2.7 BurnoutSpinner

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/BurnoutSpinner.jsx` |
| **Current wording** | Custom spinning wheel with smoke effect loading indicator |
| **Purpose** | Branded loading experience |
| **Classification** | **KEEP** |
| **Reason** | Delightful, branded, on-theme. A production-quality touch. |
| **Priority** | N/A |
| **Owner** | Branding |

### 2.8 SeoMeta Component

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/seoMeta.jsx` |
| **Current wording** | Injects title, description, OG, Twitter cards, canonical URLs per-page |
| **Purpose** | SEO infrastructure |
| **Classification** | **KEEP** |
| **Reason** | Well-built, professional. The infrastructure exists; it just needs to be used on every page. |
| **Priority** | N/A |
| **Owner** | Engineering |

### 2.9 Design System (Tokens)

| Field | Value |
|-------|-------|
| **Location** | `src/index.css`, `tailwind.config.js` |
| **Current wording** | Hijinx Design System v1.0 — semantic tokens (canvas, surface, motion, foreground, divider, status) with light/dark themes |
| **Purpose** | Visual foundation |
| **Classification** | **KEEP** |
| **Reason** | Professional, comprehensive, well-architected. The issue is adoption, not the system itself. |
| **Priority** | N/A |
| **Owner** | Branding |

### 2.10 Page Transitions

| Field | Value |
|-------|-------|
| **Location** | `src/Layout.jsx` (AnimatePresence) |
| **Current wording** | framer-motion opacity + y transitions on page change |
| **Purpose** | Smooth navigation feel |
| **Classification** | **KEEP** |
| **Reason** | Professional, smooth, enhances perceived performance. |
| **Priority** | N/A |
| **Owner** | UX |

### 2.11 Tab Keep-Alive

| Field | Value |
|-------|-------|
| **Location** | `src/Layout.jsx`, `src/hooks/useTabKeepAlive.js` |
| **Current wording** | Bottom tab pages stay mounted (hidden) to preserve scroll/state |
| **Purpose** | Native-app-like tab preservation |
| **Classification** | **KEEP** |
| **Reason** | Production-quality mobile pattern. |
| **Priority** | N/A |
| **Owner** | Engineering |

### 2.12 Mobile Bottom Nav (Concept)

| Field | Value |
|-------|-------|
| **Location** | `src/components/layout/MobileBottomNav.jsx` |
| **Current wording** | 4 tabs: Home, Directory, Dashboard, Profile |
| **Purpose** | Primary mobile navigation |
| **Classification** | **KEEP** (concept) — **REWRITE** (route, see §3.3) |
| **Reason** | The concept is correct and professional. The Directory tab links to a legacy route (`/DriverDirectory`) instead of the canonical `/Directory`. |
| **Priority** | N/A (concept) |
| **Owner** | UX |

### 2.13 Newsletter Signup

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/NewsletterSignup.jsx`, used in Footer |
| **Current wording** | Email capture with branded styling |
| **Purpose** | Email list building |
| **Classification** | **KEEP** |
| **Reason** | Functional, branded, appropriate. |
| **Priority** | N/A |
| **Owner** | Content |

### 2.14 Report Issue (Concept)

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/reportIssueModal.jsx`, triggered from Footer |
| **Current wording** | Issue type selection + description + screenshot URL + auto-captured page URL |
| **Purpose** | User feedback channel |
| **Classification** | **KEEP** (concept) — **REWRITE** (implementation, see §3.4, §4.3) |
| **Reason** | The concept of a report issue channel is correct and important for Friends & Family. The implementation has a silent failure bug and an unusable screenshot URL field. |
| **Priority** | N/A (concept) |
| **Owner** | UX |

### 2.15 Copyright Notice

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/Footer.jsx` (line 80) |
| **Current wording** | "© {year} The Hijinx Co LLC. All rights reserved." |
| **Purpose** | Legal copyright notice |
| **Classification** | **KEEP** |
| **Reason** | Correct, professional, auto-updating year. |
| **Priority** | N/A |
| **Owner** | Legal |

### 2.16 "Built on purpose." Tagline

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/Footer.jsx` (line 91) |
| **Current wording** | "Built on purpose." |
| **Purpose** | Brand tagline |
| **Classification** | **KEEP** (concept) — **REWRITE** (clarity, see §3.5) |
| **Reason** | The concept of a brand tagline is correct. The wording "Built on purpose." is ambiguous (purpose vs. intentionally) and may confuse new users. |
| **Priority** | N/A (concept) |
| **Owner** | Branding |

### 2.17 Theme Toggle

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/ThemeToggle.jsx` |
| **Current wording** | Light/dark theme switcher |
| **Purpose** | User preference |
| **Classification** | **KEEP** |
| **Reason** | Functional, professional, expected on modern platforms. |
| **Priority** | N/A |
| **Owner** | UX |

### 2.18 Glass Header

| Field | Value |
|-------|-------|
| **Location** | `src/Layout.jsx` (header component) |
| **Current wording** | Floating glass header with blur, hover expansion, sub-nav |
| **Purpose** | Primary desktop navigation |
| **Classification** | **KEEP** |
| **Reason** | Professional, distinctive, on-brand. |
| **Priority** | N/A |
| **Owner** | UX |

### 2.19 Search (Concept)

| Field | Value |
|-------|-------|
| **Location** | `src/Layout.jsx` (inline search panel) |
| **Current wording** | Multi-entity search with categorized results |
| **Purpose** | Platform-wide discovery |
| **Classification** | **KEEP** (concept) — **REWRITE** (placeholder, see §3.6) |
| **Reason** | The search concept is correct and powerful. The placeholder text is too long and the search is desktop-only (hidden on mobile). |
| **Priority** | N/A (concept) |
| **Owner** | UX |

### 2.20 Entity Profile Architecture

| Field | Value |
|-------|-------|
| **Location** | RacerProfile, TeamProfile, TrackProfile, SeriesDetail, EventProfile, VehicleProfile, MediaProfilePage |
| **Current wording** | Tabbed profile pages with hero, overview, stats, timeline, media, sponsors |
| **Purpose** | Public entity profiles |
| **Classification** | **KEEP** |
| **Reason** | Architecturally sound, consistent structure, professional depth. |
| **Priority** | N/A |
| **Owner** | Engineering |

### 2.21 Claims Center

| Field | Value |
|-------|-------|
| **Location** | `src/pages/ClaimsCenter.jsx` |
| **Current wording** | Dashboard for users to track their entity claims |
| **Purpose** | Claims management |
| **Classification** | **KEEP** |
| **Reason** | Core Friends & Family feature. |
| **Priority** | N/A |
| **Owner** | Engineering |

### 2.22 Onboarding Flow

| Field | Value |
|-------|-------|
| **Location** | `src/pages/ProfileSetup.jsx`, `src/components/onboarding/*` |
| **Current wording** | Multi-stage onboarding (identity, roles, connections, review) |
| **Purpose** | New user setup |
| **Classification** | **KEEP** |
| **Reason** | Core Friends & Family feature, well-structured. |
| **Priority** | N/A |
| **Owner** | UX |

### 2.23 Directory (Concept)

| Field | Value |
|-------|-------|
| **Location** | `src/pages/Directory.jsx` |
| **Current wording** | Unified directory for drivers, teams, tracks, series, events, creators, outlets |
| **Purpose** | Primary discovery surface |
| **Classification** | **KEEP** (concept) — **REWRITE** (coming soon toasts, see §3.7) |
| **Reason** | The directory concept is correct and central to the platform. The "Coming Soon" toasts on directory profiles need evaluation. |
| **Priority** | N/A (concept) |
| **Owner** | UX |

### 2.24 RaceCore (Concept)

| Field | Value |
|-------|-------|
| **Location** | `src/components/racecore/*`, `src/pages/RaceCore*` |
| **Current wording** | Operational management system for race events |
| **Purpose** | Admin/operations tooling |
| **Classification** | **KEEP** (concept) — **REWRITE** (public exposure, see §3.8) |
| **Reason** | RaceCore is a core platform feature. Some diagnostic/repair tools within RaceCore should not be publicly navigable. |
| **Priority** | N/A (concept) |
| **Owner** | Engineering |

### 2.25 Sponsorship System

| Field | Value |
|-------|-------|
| **Location** | Sponsorship, Activation, SponsorshipDeliverable entities; SponsorProfile page |
| **Current wording** | Commercial relationship management |
| **Purpose** | Sponsorship platform |
| **Classification** | **KEEP** |
| **Reason** | Architecturally sound, Phase 17 complete. |
| **Priority** | N/A |
| **Owner** | Engineering |

### 2.26 Media Platform (Concept)

| Field | Value |
|-------|-------|
| **Location** | MediaHome, MediaProfilePage, GalleryPage, MediaPortal |
| **Current wording** | Media asset management, creator profiles, galleries |
| **Purpose** | Media ecosystem |
| **Classification** | **KEEP** (concept) — **REWRITE** (public guidance, see §3.9) |
| **Reason** | The media platform concept is correct. Public guidance for media uploads and usage rights is missing. |
| **Priority** | N/A (concept) |
| **Owner** | Engineering |

### 2.27 Safe-Area / Mobile Engineering

| Field | Value |
|-------|-------|
| **Location** | `src/index.css`, `src/components/layout/MobileBottomNav.jsx`, `src/hooks/useAndroidBackButton.js` |
| **Current wording** | env(safe-area-inset-*) padding, 44px touch targets, back-button handling |
| **Purpose** | Mobile production quality |
| **Classification** | **KEEP** |
| **Reason** | Professional mobile engineering. |
| **Priority** | N/A |
| **Owner** | Engineering |

### 2.28 Error Boundary

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/errorBoundary.jsx` |
| **Current wording** | Catches render errors and shows fallback |
| **Purpose** | Graceful error handling |
| **Classification** | **KEEP** |
| **Reason** | Production safety net. |
| **Priority** | N/A |
| **Owner** | Engineering |

---

## 3. REWRITE Inventory

Items whose purpose is correct but wording or visual treatment is not production quality.

### 3.1 Announcement Bar Default Wording

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/AnnouncementBar.jsx` (line 42) |
| **Current wording** | "WELCOME TO HIJINX BETA — THE PLATFORM IS EVOLVING IN REAL TIME" |
| **Purpose** | Communicate staged rollout phase |
| **Classification** | **REWRITE** |
| **Reason** | "BETA" and "EVOLVING IN REAL TIME" are developer-ish and vague. For Friends & Family, the wording should be warmer and clearer: e.g., "Welcome to Hijinx — we're in our Friends & Family phase. Things will change as we grow." |
| **Priority** | High |
| **Owner** | Content |

### 3.2 Join Page Roadmap Perk Wording

| Field | Value |
|-------|-------|
| **Location** | `src/pages/JoinIndex46.jsx` (line 71) |
| **Current wording** | "Early access to RaceCore operations tools as they roll out" |
| **Purpose** | Communicate staged RaceCore rollout |
| **Classification** | **REWRITE** |
| **Reason** | "As they roll out" is informal. Should be: "Early access to RaceCore operations tools as they become available" or "Priority access to RaceCore operations tools." |
| **Priority** | Medium |
| **Owner** | Content |

### 3.3 Mobile Bottom Nav — Legacy Route

| Field | Value |
|-------|-------|
| **Location** | `src/components/layout/MobileBottomNav.jsx` (line 18) |
| **Current wording** | `{ name: 'Directory', to: '/DriverDirectory', icon: Compass }` |
| **Purpose** | Mobile directory tab |
| **Classification** | **REWRITE** |
| **Reason** | Links to legacy `/DriverDirectory` which redirects to `/Directory?cat=drivers`. Should link directly to `/Directory` to avoid a redirect hop and align with the unified directory concept. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.4 Report Issue Modal — Silent Failure

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/reportIssueModal.jsx` (lines 45-49) |
| **Current wording** | `catch (_) { console.warn(...); setSubmitted(true); }` — shows "Report received" even on error |
| **Purpose** | User feedback submission |
| **Classification** | **REWRITE** |
| **Reason** | The catch block tells the user their report was received even when it failed to save. This is dishonest. Should show an error state: "Something went wrong. Please try again or email us directly." |
| **Priority** | Critical |
| **Owner** | Engineering |

### 3.5 "Built on purpose." Tagline

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/Footer.jsx` (line 91) |
| **Current wording** | "Built on purpose." |
| **Purpose** | Brand tagline |
| **Classification** | **REWRITE** |
| **Reason** | Ambiguous — "on purpose" can mean "intentionally" or "with purpose." New users won't understand the brand voice. Should be clearer or replaced with a more distinctive tagline. |
| **Priority** | Low |
| **Owner** | Branding |

### 3.6 Search Placeholder

| Field | Value |
|-------|-------|
| **Location** | `src/Layout.jsx` (search input) |
| **Current wording** | "Search stories, drivers, events, tracks, series, teams, vehicles, media..." |
| **Purpose** | Search input guidance |
| **Classification** | **REWRITE** |
| **Reason** | Too long — lists 8 entity types. Overwhelming. Should be: "Search the platform..." or "Search drivers, teams, events..." (top 3 types). |
| **Priority** | Medium |
| **Owner** | UX |

### 3.7 Coming Soon Toasts (Directory)

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/comingSoonToast.js` |
| **Current wording** | "Driver profiles are launching soon on the Hijinx Co directory. Check back shortly!" (and similar for team, track, series, event, creator, outlet) |
| **Purpose** | Placeholder for profiles not yet built |
| **Classification** | **REWRITE** (or **REMOVE** if profiles are actually live) |
| **Reason** | If entity profiles ARE live (RacerProfile, TeamProfile, etc. all exist), these toasts are inaccurate and should be removed. If some profile types are genuinely not built, the wording should be clearer: "This profile type is coming soon. Explore other records in the directory." Need to verify whether these toasts are actually triggered anywhere. |
| **Priority** | High |
| **Owner** | Content |

### 3.8 RaceCore — Public Tool Exposure

| Field | Value |
|-------|-------|
| **Location** | `src/components/racecore/RaceCoreLayout.jsx` — navigation includes Diagnostics, DuplicateMergeReview, ResultsRepairPage, IdentityReviewPage, DataQualityDashboard, IdentityOwnershipAudit |
| **Current wording** | Diagnostic and repair tools in sidebar navigation |
| **Purpose** | Admin data health management |
| **Classification** | **REWRITE** |
| **Reason** | These are internal diagnostic/repair tools, not user-facing features. They should be moved to an "Admin Tools" or "Diagnostics" sub-section, not in the primary RaceCore navigation. The tools themselves are KEEP; their navigation placement is REWRITE. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.9 Media Platform — Missing Public Guidance

| Field | Value |
|-------|-------|
| **Location** | No help page for media upload, usage rights, or verification |
| **Current wording** | N/A — missing |
| **Purpose** | Media contributor guidance |
| **Classification** | **REWRITE** (create) |
| **Reason** | Photographers and creators need to understand upload rules, usage rights, and verification before contributing. A help page or in-portal guidance is needed. |
| **Priority** | Medium |
| **Owner** | Content |

### 3.10 404 Page — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/lib/PageNotFound.jsx` |
| **Current wording** | `bg-slate-50`, `text-slate-300`, `text-slate-800`, `bg-slate-100`, `text-slate-600` |
| **Purpose** | 404 not found page |
| **Classification** | **REWRITE** |
| **Reason** | Uses hardcoded Tailwind colors instead of design system tokens. In dark theme, this renders as a white slab on a dark canvas. Should use `hsl(var(--canvas))`, `hsl(var(--foreground))`, etc. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.11 UserNotRegisteredError — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/components/UserNotRegisteredError.jsx` |
| **Current wording** | `bg-gradient-to-b from-white to-slate-50`, `bg-white`, `text-slate-900`, `bg-orange-100`, `text-orange-600` |
| **Purpose** | Access restricted page |
| **Classification** | **REWRITE** |
| **Reason** | Hardcoded colors break in dark theme. Should use design system tokens. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.12 ReportIssueModal — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/reportIssueModal.jsx` |
| **Current wording** | `bg-white`, `text-gray-900`, `bg-[#232323]`, `text-gray-500`, `border-gray-200` |
| **Purpose** | Issue report dialog |
| **Classification** | **REWRITE** |
| **Reason** | Hardcoded colors. In dark theme, this is a white modal on a dark canvas. Should use design system tokens. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.13 Contact Page — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/pages/Contact.jsx` |
| **Current wording** | `bg-[#0A0A0A]`, `text-white`, `text-gray-400`, `border-gray-200`, `bg-[#0A0A0A]` buttons |
| **Purpose** | Contact form |
| **Classification** | **REWRITE** |
| **Reason** | Hardcoded dark colors. In light theme, the hero and buttons are dark on a light page. Should use design system tokens. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.14 About Page — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/pages/About.jsx` |
| **Current wording** | `bg-[#0A0A0A]`, `text-white`, `text-gray-500`, `text-gray-600`, `bg-[#0A0A0A]` bullets |
| **Purpose** | About page |
| **Classification** | **REWRITE** |
| **Reason** | Same hardcoded dark color issue as Contact. Should use design system tokens. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.15 EmptyState — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/EmptyState.jsx` |
| **Current wording** | `text-gray-300`, `text-gray-800`, `text-gray-400` |
| **Purpose** | Reusable empty state component |
| **Classification** | **REWRITE** |
| **Reason** | Used across the platform. Hardcoded colors break in dark theme. Should use design system tokens. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.16 CreativeServices — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/pages/CreativeServices.jsx` (line 37) |
| **Current wording** | `bg-[#0A0A0A]`, `text-white`, `text-gray-500` |
| **Purpose** | Creative services inquiry page |
| **Classification** | **REWRITE** |
| **Reason** | Same hardcoded dark color issue. Should use design system tokens. |
| **Priority** | Medium |
| **Owner** | Engineering |

### 3.17 TechHome — Hardcoded Colors

| Field | Value |
|-------|-------|
| **Location** | `src/pages/TechHome.jsx` (line 17) |
| **Current wording** | `bg-[#0A0A0A]`, `text-white`, `text-gray-500`, `text-gray-400`, `border-gray-200` |
| **Purpose** | Tech products page |
| **Classification** | **REWRITE** |
| **Reason** | Same hardcoded dark color issue. Should use design system tokens. |
| **Priority** | Medium |
| **Owner** | Engineering |

### 3.18 Learning Page — Hardcoded Colors (Likely)

| Field | Value |
|-------|-------|
| **Location** | `src/pages/Learning.jsx` |
| **Current wording** | Likely uses hardcoded dark hero (pattern matches other venture pages) |
| **Purpose** | Education page |
| **Classification** | **REWRITE** |
| **Reason** | Same hardcoded dark color issue as other venture pages. Should use design system tokens. |
| **Priority** | Medium |
| **Owner** | Engineering |

### 3.19 Hospitality Page — Hardcoded Colors (Likely)

| Field | Value |
|-------|-------|
| **Location** | `src/pages/Hospitality.jsx` |
| **Current wording** | Likely uses hardcoded dark hero (pattern matches other venture pages) |
| **Purpose** | Hospitality services page |
| **Classification** | **REWRITE** |
| **Reason** | Same hardcoded dark color issue. Should use design system tokens. |
| **Priority** | Medium |
| **Owner** | Engineering |

### 3.20 FoodBeverage Page — Hardcoded Colors (Likely)

| Field | Value |
|-------|-------|
| **Location** | `src/pages/FoodBeverage.jsx` |
| **Current wording** | Likely uses hardcoded dark hero (pattern matches other venture pages) |
| **Purpose** | Food & beverage page |
| **Classification** | **REWRITE** |
| **Reason** | Same hardcoded dark color issue. Should use design system tokens. |
| **Priority** | Medium |
| **Owner** | Engineering |

### 3.21 Footer — Missing Legal Links

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/Footer.jsx` |
| **Current wording** | Footer has Platform, Ventures, Company columns + copyright + Report Issue + "Built on purpose." — NO legal links |
| **Purpose** | Footer navigation |
| **Classification** | **REWRITE** |
| **Reason** | Footer needs Privacy Policy, Terms of Service, and Community Guidelines links (even if the pages are minimal for Friends & Family). A "Legal" column or bottom-bar links should be added. |
| **Priority** | Critical |
| **Owner** | Legal |

### 3.22 INDEX46 — Unexplained Term

| Field | Value |
|-------|-------|
| **Location** | Navigation (`src/Layout.jsx`), Join page, Directory |
| **Current wording** | "INDEX46" used in navigation and page names without explanation |
| **Purpose** | Platform naming |
| **Classification** | **REWRITE** |
| **Reason** | New users don't know what INDEX46 is. Needs a brief explanation on first encounter or in a help page. |
| **Priority** | Medium |
| **Owner** | Content |

### 3.23 RaceCore — Unexplained to Public

| Field | Value |
|-------|-------|
| **Location** | Join page mentions it once; no public explanation elsewhere |
| **Current wording** | "RaceCore" used without explanation |
| **Purpose** | Platform naming |
| **Classification** | **REWRITE** |
| **Reason** | Users encountering RaceCore in the Join page perks or admin context don't know what it is. Needs explanation in a help page or about section. |
| **Priority** | Medium |
| **Owner** | Content |

### 3.24 "The Outlet" — Unclear Term

| Field | Value |
|-------|-------|
| **Location** | Navigation, footer, homepage |
| **Current wording** | "The Outlet" — unclear if it's a store, media outlet, or something else |
| **Purpose** | Platform naming |
| **Classification** | **REWRITE** |
| **Reason** | New users don't understand what "The Outlet" is. Needs a subtitle or brief description in navigation or on the Outlet home page. |
| **Priority** | Medium |
| **Owner** | Content |

### 3.25 Brand Name Inconsistency

| Field | Value |
|-------|-------|
| **Location** | Across platform |
| **Current wording** | "Hijinx Co" vs "The Hijinx Co" vs "HIJINX" vs "Hijinx" — inconsistent |
| **Purpose** | Brand identity |
| **Classification** | **REWRITE** |
| **Reason** | Brand name should be consistent. Recommend "HIJINX" for logo/wordmark, "The Hijinx Co" for legal/formal, "Hijinx" for conversational. Document the standard. |
| **Priority** | Medium |
| **Owner** | Branding |

### 3.26 Report Issue — Screenshot URL Field

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/reportIssueModal.jsx` (lines 122-131) |
| **Current wording** | "Screenshot URL" text input with "https://..." placeholder |
| **Purpose** | Screenshot attachment |
| **Classification** | **REWRITE** |
| **Reason** | No normal user has a hosted screenshot URL. Should be a file upload (using UploadFile integration) or removed entirely for Friends & Family. |
| **Priority** | High |
| **Owner** | Engineering |

### 3.27 Empty States — Generic Copy

| Field | Value |
|-------|-------|
| **Location** | `src/components/shared/EmptyState.jsx` |
| **Current wording** | Default: "Nothing here yet" / "Content is coming soon." |
| **Purpose** | Empty state messaging |
| **Classification** | **REWRITE** |
| **Reason** | Generic and passive. Empty states should be actionable: "No results found. Try a different filter." or "No events yet. Check back soon." |
| **Priority** | Medium |
| **Owner** | Content |

### 3.28 Contact Page — No Response Expectation

| Field | Value |
|-------|-------|
| **Location** | `src/pages/Contact.jsx` |
| **Current wording** | "We'll get back to you as soon as we can." |
| **Purpose** | Contact form confirmation |
| **Classification** | **REWRITE** |
| **Reason** | Vague. For Friends & Family, should set an expectation: "We'll get back to you within 2-3 business days." |
| **Priority** | Low |
| **Owner** | Content |

### 3.29 About Page — Thin Content

| Field | Value |
|-------|-------|
| **Location** | `src/pages/About.jsx` |
| **Current wording** | Three short paragraphs (The Company, The Approach, The Verticals) |
| **Purpose** | Company about page |
| **Classification** | **REWRITE** |
| **Reason** | Content is thin for a production About page. Should include mission, team (or founding story), and what makes Hijinx different. Adequate for Friends & Family but needs expansion before public launch. |
| **Priority** | Low |
| **Owner** | Content |

### 3.30 Search — Desktop Only

| Field | Value |
|-------|-------|
| **Location** | `src/Layout.jsx` (search button: `className="hidden lg:flex"`) |
| **Current wording** | Search icon hidden on mobile (`hidden lg:flex`) |
| **Purpose** | Search access |
| **Classification** | **REWRITE** |
| **Reason** | Search is not accessible on mobile. Should be available via the mobile menu or a mobile search bar. |
| **Priority** | High |
| **Owner** | UX |

### 3.31 Help — Missing Help Center

| Field | Value |
|-------|-------|
| **Location** | No help page exists |
| **Current wording** | N/A — missing |
| **Purpose** | User self-service support |
| **Classification** | **REWRITE** (create) |
| **Reason** | Friends & Family users need a place to find answers. Even a minimal FAQ (What is Hijinx? What is INDEX46? What is RaceCore? How do claims work? How do I upload media?) would reduce support load. |
| **Priority** | High |
| **Owner** | Content |

---

## 4. REMOVE Inventory

Developer-facing artifacts that should not be visible to public users.

### 4.1 index.html — "Base44 APP" Title

| Field | Value |
|-------|-------|
| **Location** | `index.html` (line 8) |
| **Current wording** | `<title>Base44 APP</title>` |
| **Purpose** | Browser tab title |
| **Classification** | **REMOVE** |
| **Reason** | Stock Base44 template title. Every visitor's browser tab says "Base44 APP." Should be "Hijinx — Motorsports, Culture & Competition" or similar. |
| **Priority** | Critical |
| **Owner** | Branding |

### 4.2 index.html — Base44 Favicon

| Field | Value |
|-------|-------|
| **Location** | `index.html` (line 5) |
| **Current wording** | `<link rel="icon" type="image/svg+xml" href="https://base44.com/logo_v2.svg" />` |
| **Purpose** | Browser favicon |
| **Classification** | **REMOVE** |
| **Reason** | Base44 logo as favicon. Should be the Hijinx icon asset. |
| **Priority** | Critical |
| **Owner** | Branding |

### 4.3 index.html — Missing Meta Description

| Field | Value |
|-------|-------|
| **Location** | `index.html` (head) |
| **Current wording** | No `<meta name="description">` tag |
| **Purpose** | SEO meta description |
| **Classification** | **REMOVE** (the gap) |
| **Reason** | The SeoMeta component injects this per-page, but the initial HTML shell has no description. Crawlers and link previews that don't execute JS see no description. Should have a default meta description in index.html. |
| **Priority** | Critical |
| **Owner** | Branding |

### 4.4 index.html — Missing Open Graph / Twitter Cards

| Field | Value |
|-------|-------|
| **Location** | `index.html` (head) |
| **Current wording** | No OG or Twitter card meta tags |
| **Purpose** | Social sharing previews |
| **Classification** | **REMOVE** (the gap) |
| **Reason** | Same as meta description — SeoMeta injects per-page, but initial HTML has none. Link previews before JS hydration show no image/title/description. |
| **Priority** | High |
| **Owner** | Branding |

### 4.5 404 Page — Developer Text

| Field | Value |
|-------|-------|
| **Location** | `src/lib/PageNotFound.jsx` (lines 50-53) |
| **Current wording** | "This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat." |
| **Purpose** | Admin debugging note |
| **Classification** | **REMOVE** |
| **Reason** | Developer-facing text exposed to admin users. References "the AI" and "the chat" — internal development context. Should be removed entirely. |
| **Priority** | Critical |
| **Owner** | Engineering |

### 4.6 Report Issue — Silent Failure Behavior

| Field | Value |
|-------|-------|
| **Location** | `src/components/system/reportIssueModal.jsx` (lines 45-49) |
| **Current wording** | `catch (_) { console.warn(...); setSubmitted(true); }` |
| **Purpose** | Error handling |
| **Classification** | **REMOVE** |
| **Reason** | The silent failure behavior (showing "Report received" on error) is dishonest. The `setSubmitted(true)` in the catch block should be removed and replaced with an error state. |
| **Priority** | Critical |
| **Owner** | Engineering |

### 4.7 Mobile Bottom Nav — Legacy Route

| Field | Value |
|-------|-------|
| **Location** | `src/components/layout/MobileBottomNav.jsx` (line 18) |
| **Current wording** | `to: '/DriverDirectory'` |
| **Purpose** | Mobile directory tab link |
| **Classification** | **REMOVE** (legacy route usage) |
| **Reason** `/DriverDirectory` is a legacy route that redirects. The mobile nav should use the canonical `/Directory` route directly. |
| **Priority** | High |
| **Owner** | Engineering |

### 4.8 RaceCore — Diagnostic Tools in Navigation

| Field | Value |
|-------|-------|
| **Location** | RaceCore navigation: Diagnostics, ResultsRepairPage, DuplicateMergeReview, IdentityReviewPage, DataQualityDashboard, IdentityOwnershipAudit |
| **Current wording** | Internal diagnostic and repair tools in sidebar |
| **Purpose** | Data health management |
| **Classification** | **REMOVE** (from public navigation) |
| **Reason** | These are internal tools, not user-facing features. They should be behind an "Admin Tools" sub-menu or accessible by URL only, not in primary navigation. |
| **Priority** | High |
| **Owner** | Engineering |

### 4.9 RaceCore — Backfill Functions Exposed

| Field | Value |
|-------|-------|
| **Location** | Multiple `backfill*` backend functions exist in production |
| **Current wording** | Data migration functions |
| **Purpose** | One-time data migrations |
| **Classification** | **REMOVE** (after verification) |
| **Reason** | Backfill functions are one-time migration tools. If they've been run and are no longer needed, they should be removed from production. If still needed, they should not be exposed in any UI. |
| **Priority** | Low |
| **Owner** | Engineering |

### 4.10 RaceCore — "Verify" and "Audit" Functions Exposed

| Field | Value |
|-------|-------|
| **Location** | Multiple `verify*` and `audit*` backend functions |
| **Current wording** | Diagnostic functions |
| **Purpose** | Data integrity verification |
| **Classification** | **REMOVE** (from any public UI) |
| **Reason** | Diagnostic functions should not be exposed in any user-facing UI. They should be run by admins via backend only. |
| **Priority** | Low |
| **Owner** | Engineering |

### 4.11 Legacy Driver Entity / DriverProfile

| Field | Value |
|-------|-------|
| **Location** | Driver entity, DriverProfile page (legacy) coexist with RacerProfile (current) |
| **Current wording** | Two profile systems for the same concept |
| **Purpose** | Legacy compatibility |
| **Classification** | **REMOVE** (eventually) |
| **Reason** | The legacy Driver/DriverProfile system should be fully migrated to RacerProfile. For Friends & Family, the legacy redirect is acceptable, but the duplicate system should be removed before public launch. |
| **Priority** | Low |
| **Owner** | Engineering |

### 4.12 pages.config.js — Dual Routing System

| Field | Value |
|-------|-------|
| **Location** | `src/pages.config.js` + explicit `<Route>` elements in `src/App.jsx` |
| **Current wording** | Old pages in pagesConfig loop + new pages as explicit routes |
| **Purpose** | Routing |
| **Classification** | **REMOVE** (eventually) |
| **Reason** | The dual routing system (pagesConfig loop + explicit routes) is a transitional artifact. For Friends & Family it works, but it should be consolidated before public launch. |
| **Priority** | Low |
| **Owner** | Engineering |

---

## 5. Branding Inventory

| # | Item | Location | Current State | Classification | Priority |
|---|------|----------|---------------|---------------|----------|
| 1 | Browser tab title | `index.html` | "Base44 APP" | REMOVE | Critical |
| 2 | Favicon | `index.html` | Base44 logo URL | REMOVE | Critical |
| 3 | Meta description | `index.html` | Missing | REMOVE (gap) | Critical |
| 4 | Open Graph tags | `index.html` | Missing | REMOVE (gap) | High |
| 5 | Twitter card tags | `index.html` | Missing | REMOVE (gap) | High |
| 6 | Hijinx logo (header) | `HijinxLogo.jsx` | Branded, theme-aware | KEEP | N/A |
| 7 | Hijinx wordmark (footer) | `Footer.jsx` | "HIJINX" text | KEEP | N/A |
| 8 | Brand name consistency | Platform-wide | "Hijinx Co" / "The Hijinx Co" / "HIJINX" / "Hijinx" | REWRITE | Medium |
| 9 | "Built on purpose." tagline | `Footer.jsx` | Ambiguous | REWRITE | Low |
| 10 | BurnoutSpinner | `BurnoutSpinner.jsx` | Branded loading | KEEP | N/A |
| 11 | Motion teal accent | Design system | `#20ACAC` / `#1E9E9E` | KEEP | N/A |
| 12 | Mono labels | Platform-wide | JetBrains Mono, tracking-[0.3em]+ | KEEP | N/A |
| 13 | Glass header | `Layout.jsx` | Branded floating header | KEEP | N/A |
| 14 | Background texture | `Layout.jsx` | Motorsports grid + film grain | KEEP | N/A |
| 15 | Hero background image | `globals.css` | Branded Hijinx background | KEEP | N/A |
| 16 | Announcement bar | `AnnouncementBar.jsx` | "BETA" default wording | REWRITE | High |
| 17 | Copyright notice | `Footer.jsx` | "© The Hijinx Co LLC" | KEEP | N/A |

---

## 6. Developer Artifact Inventory

| # | Artifact | Location | Visible To | Classification | Priority |
|---|----------|----------|-----------|---------------|----------|
| 1 | "Base44 APP" title | `index.html` | All visitors | REMOVE | Critical |
| 2 | Base44 favicon | `index.html` | All visitors | REMOVE | Critical |
| 3 | "Ask it to implement it in the chat" | `PageNotFound.jsx` | Admin users | REMOVE | Critical |
| 4 | Silent failure in Report Issue | `reportIssueModal.jsx` | All users | REMOVE | Critical |
| 5 | Legacy `/DriverDirectory` route in mobile nav | `MobileBottomNav.jsx` | Mobile users | REMOVE | High |
| 6 | Diagnostic tools in RaceCore nav | RaceCore sidebar | Admin users | REMOVE (from nav) | High |
| 7 | Repair tools in RaceCore nav | RaceCore sidebar | Admin users | REMOVE (from nav) | High |
| 8 | Backfill functions in production | Backend functions | Not directly visible | REMOVE (eventually) | Low |
| 9 | Verify/audit functions in production | Backend functions | Not directly visible | REMOVE (from UI) | Low |
| 10 | Legacy Driver/DriverProfile system | Multiple files | Via redirects | REMOVE (eventually) | Low |
| 11 | Dual routing system (pagesConfig + explicit) | `App.jsx`, `pages.config.js` | Not directly visible | REMOVE (eventually) | Low |
| 12 | Console.warn in Report Issue catch | `reportIssueModal.jsx` | Dev console | REMOVE | Medium |

---

## 7. Roadmap Messaging Review

### Items reviewed for intentional roadmap/staged-rollout messaging.

| # | Item | Location | Current Wording | Intentional? | Classification |
|---|------|----------|-----------------|--------------|---------------|
| 1 | Apparel "New Shop Coming Soon" | `ApparelHome.jsx` | "New Shop Coming Soon" + Shopify redirect | ✅ Yes | KEEP |
| 2 | Marketplace "Coming Soon" button | `MarketplaceHome.jsx` | Disabled "Coming Soon" button | ✅ Yes | KEEP |
| 3 | Marketplace category grid | `MarketplaceHome.jsx` | 4 categories shown (non-clickable) | ✅ Yes | KEEP |
| 4 | Join page RaceCore perk | `JoinIndex46.jsx` | "Early access to RaceCore operations tools as they roll out" | ✅ Yes | KEEP (REWRITE wording) |
| 5 | Beta announcement bar | `AnnouncementBar.jsx` | "WELCOME TO HIJINX BETA" | ✅ Yes | KEEP (REWRITE wording) |
| 6 | Coming Soon toasts | `comingSoonToast.js` | "Driver profiles are launching soon" | ❓ Uncertain | REWRITE or REMOVE (verify if triggered) |
| 7 | Apparel "Coming Soon" SEO title | `ApparelHome.jsx` | "Apparel | Coming Soon" | ✅ Yes | KEEP |
| 8 | Marketplace SEO description | `MarketplaceHome.jsx` | "The HIJINX Marketplace — motorsports apparel, parts, memorabilia, and gear." | ✅ Yes | KEEP |

### Determination

Most roadmap messaging is **intentional and correct** for Friends & Family. The two items needing attention:

1. **Beta announcement bar wording** — The concept is intentional; the wording should be warmer and clearer (REWRITE, not REMOVE)
2. **Coming Soon toasts** — Need verification: if entity profiles ARE live, these toasts are inaccurate and should be removed. If some profile types are genuinely not built, the wording should be clarified.

---

## 8. Friends & Family Messaging Review

### Items reviewed for intentional Friends & Family / early-access messaging.

| # | Item | Location | Current Wording | Intentional? | Classification |
|---|------|----------|-----------------|--------------|---------------|
| 1 | Beta announcement bar | `AnnouncementBar.jsx` | "WELCOME TO HIJINX BETA — THE PLATFORM IS EVOLVING IN REAL TIME" | ✅ Yes | KEEP (REWRITE wording) |
| 2 | Apparel Coming Soon | `ApparelHome.jsx` | "New Shop Coming Soon" | ✅ Yes | KEEP |
| 3 | Marketplace Coming Soon | `MarketplaceHome.jsx` | Disabled "Coming Soon" button | ✅ Yes | KEEP |
| 4 | Join page perks | `JoinIndex46.jsx` | "Early access to RaceCore operations tools as they roll out" | ✅ Yes | KEEP (REWRITE wording) |
| 5 | Claims flow | `JoinIndex46.jsx` | 3-step claims explanation | ✅ Yes | KEEP |
| 6 | Verification badge perk | `JoinIndex46.jsx` | "Official HIJINX verification badge once reviewed" | ✅ Yes | KEEP |

### Determination

All Friends & Family messaging is **intentional**. None should be removed. Two items need wording refinement (beta bar, RaceCore perk) but the concepts are correct.

---

## 9. Top 50 Cleanup Tasks

| # | Task | Classification | Priority | Owner | Effort |
|---|------|---------------|----------|-------|--------|
| 1 | Replace "Base44 APP" title with Hijinx title in index.html | REMOVE | Critical | Branding | 5 min |
| 2 | Replace Base44 favicon with Hijinx icon in index.html | REMOVE | Critical | Branding | 5 min |
| 3 | Add meta description to index.html | REMOVE (gap) | Critical | Branding | 5 min |
| 4 | Add OG/Twitter card tags to index.html | REMOVE (gap) | High | Branding | 15 min |
| 5 | Remove developer text from 404 page | REMOVE | Critical | Engineering | 5 min |
| 6 | Fix Report Issue silent failure | REMOVE | Critical | Engineering | 15 min |
| 7 | Fix 404 page hardcoded colors | REWRITE | High | Engineering | 15 min |
| 8 | Fix UserNotRegisteredError hardcoded colors | REWRITE | High | Engineering | 15 min |
| 9 | Fix ReportIssueModal hardcoded colors | REWRITE | High | Engineering | 30 min |
| 10 | Fix Contact page hardcoded colors | REWRITE | High | Engineering | 30 min |
| 11 | Fix About page hardcoded colors | REWRITE | High | Engineering | 30 min |
| 12 | Fix EmptyState hardcoded colors | REWRITE | High | Engineering | 15 min |
| 13 | Fix CreativeServices hardcoded colors | REWRITE | Medium | Engineering | 30 min |
| 14 | Fix TechHome hardcoded colors | REWRITE | Medium | Engineering | 30 min |
| 15 | Fix Learning page hardcoded colors | REWRITE | Medium | Engineering | 30 min |
| 16 | Fix Hospitality page hardcoded colors | REWRITE | Medium | Engineering | 30 min |
| 17 | Fix FoodBeverage page hardcoded colors | REWRITE | Medium | Engineering | 30 min |
| 18 | Fix mobile nav legacy route (/DriverDirectory → /Directory) | REMOVE | High | Engineering | 5 min |
| 19 | Rewrite beta announcement bar wording | REWRITE | High | Content | 10 min |
| 20 | Rewrite Join page RaceCore perk wording | REWRITE | Medium | Content | 5 min |
| 21 | Verify and fix/remove Coming Soon toasts | REWRITE/REMOVE | High | Content | 30 min |
| 22 | Move diagnostic tools out of RaceCore nav | REMOVE | High | Engineering | 1 hour |
| 23 | Move repair tools out of RaceCore nav | REMOVE | High | Engineering | 30 min |
| 24 | Add legal links to footer | REWRITE | Critical | Legal | 15 min |
| 25 | Create minimal Privacy Policy page | REWRITE (create) | Critical | Legal | 2 hours |
| 26 | Create minimal Terms of Service page | REWRITE (create) | Critical | Legal | 2 hours |
| 27 | Create minimal Community Guidelines | REWRITE (create) | High | Legal | 1 hour |
| 28 | Replace Report Issue screenshot URL with file upload | REWRITE | High | Engineering | 1 hour |
| 29 | Add search to mobile | REWRITE | High | UX | 2 hours |
| 30 | Create minimal help/FAQ page | REWRITE (create) | High | Content | 2 hours |
| 31 | Explain INDEX46 in help or about | REWRITE | Medium | Content | 30 min |
| 32 | Explain RaceCore in help or about | REWRITE | Medium | Content | 30 min |
| 33 | Add subtitle for "The Outlet" | REWRITE | Medium | Content | 15 min |
| 34 | Standardize brand name usage | REWRITE | Medium | Branding | 30 min |
| 35 | Rewrite "Built on purpose." tagline | REWRITE | Low | Branding | 15 min |
| 36 | Shorten search placeholder | REWRITE | Medium | UX | 5 min |
| 37 | Improve EmptyState default copy | REWRITE | Medium | Content | 15 min |
| 38 | Set contact form response expectation | REWRITE | Low | Content | 5 min |
| 39 | Expand About page content | REWRITE | Low | Content | 1 hour |
| 40 | Remove console.warn in Report Issue | REMOVE | Medium | Engineering | 5 min |
| 41 | Verify manifest.json branding | REWRITE | Medium | Engineering | 15 min |
| 42 | Verify robots.txt output | REWRITE | Medium | Engineering | 30 min |
| 43 | Verify sitemap.xml output | REWRITE | Medium | Engineering | 30 min |
| 44 | Add image lazy loading | REWRITE | Medium | Engineering | 30 min |
| 45 | Add image onError handlers | REWRITE | Medium | Engineering | 30 min |
| 46 | Create branded placeholder avatar | REWRITE | Low | Branding | 1 hour |
| 47 | Design branded skeletons | REWRITE | Low | Branding | 1 hour |
| 48 | Add ARIA labels to tab bars | REWRITE | Medium | Engineering | 1 hour |
| 49 | Add keyboard focus indicators | REWRITE | Medium | Engineering | 1 hour |
| 50 | Add skip-to-content link | REWRITE | Medium | Engineering | 15 min |

---

## 10. Quick Wins (< 30 min)

| # | Task | Classification | Priority | Effort |
|---|------|---------------|----------|--------|
| 1 | Replace "Base44 APP" title in index.html | REMOVE | Critical | 5 min |
| 2 | Replace Base44 favicon in index.html | REMOVE | Critical | 5 min |
| 3 | Add meta description to index.html | REMOVE (gap) | Critical | 5 min |
| 4 | Remove developer text from 404 page | REMOVE | Critical | 5 min |
| 5 | Fix mobile nav legacy route | REMOVE | High | 5 min |
| 6 | Rewrite beta announcement bar wording | REWRITE | High | 10 min |
| 7 | Add legal links to footer | REWRITE | Critical | 15 min |
| 8 | Add OG/Twitter card tags to index.html | REMOVE (gap) | High | 15 min |
| 9 | Fix Report Issue silent failure | REMOVE | Critical | 15 min |
| 10 | Fix 404 page hardcoded colors | REWRITE | High | 15 min |
| 11 | Fix UserNotRegisteredError hardcoded colors | REWRITE | High | 15 min |
| 12 | Fix EmptyState hardcoded colors | REWRITE | High | 15 min |
| 13 | Shorten search placeholder | REWRITE | Medium | 5 min |
| 14 | Rewrite Join page RaceCore perk wording | REWRITE | Medium | 5 min |
| 15 | Set contact form response expectation | REWRITE | Low | 5 min |
| 16 | Remove console.warn in Report Issue | REMOVE | Medium | 5 min |
| 17 | Add skip-to-content link | REWRITE | Medium | 15 min |
| 18 | Verify manifest.json branding | REWRITE | Medium | 15 min |
| 19 | Add subtitle for "The Outlet" | REWRITE | Medium | 15 min |
| 20 | Improve EmptyState default copy | REWRITE | Medium | 15 min |

**Total quick-win effort: ~2.5 hours for 20 tasks.**

---

## 11. Medium Tasks

| # | Task | Classification | Priority | Effort |
|---|------|---------------|----------|--------|
| 1 | Fix ReportIssueModal hardcoded colors | REWRITE | High | 30 min |
| 2 | Fix Contact page hardcoded colors | REWRITE | High | 30 min |
| 3 | Fix About page hardcoded colors | REWRITE | High | 30 min |
| 4 | Fix CreativeServices hardcoded colors | REWRITE | Medium | 30 min |
| 5 | Fix TechHome hardcoded colors | REWRITE | Medium | 30 min |
| 6 | Fix Learning page hardcoded colors | REWRITE | Medium | 30 min |
| 7 | Fix Hospitality page hardcoded colors | REWRITE | Medium | 30 min |
| 8 | Fix FoodBeverage page hardcoded colors | REWRITE | Medium | 30 min |
| 9 | Verify and fix/remove Coming Soon toasts | REWRITE/REMOVE | High | 30 min |
| 10 | Move repair tools out of RaceCore nav | REMOVE | High | 30 min |
| 11 | Replace Report Issue screenshot URL with file upload | REWRITE | High | 1 hour |
| 12 | Move diagnostic tools out of RaceCore nav | REMOVE | High | 1 hour |
| 13 | Add search to mobile | REWRITE | High | 2 hours |
| 14 | Create minimal Community Guidelines | REWRITE (create) | High | 1 hour |
| 15 | Explain INDEX46 in help or about | REWRITE | Medium | 30 min |
| 16 | Explain RaceCore in help or about | REWRITE | Medium | 30 min |
| 17 | Standardize brand name usage | REWRITE | Medium | 30 min |
| 18 | Add image lazy loading | REWRITE | Medium | 30 min |
| 19 | Add image onError handlers | REWRITE | Medium | 30 min |
| 20 | Add ARIA labels to tab bars | REWRITE | Medium | 1 hour |
| 21 | Add keyboard focus indicators | REWRITE | Medium | 1 hour |
| 22 | Verify robots.txt output | REWRITE | Medium | 30 min |
| 23 | Verify sitemap.xml output | REWRITE | Medium | 30 min |
| 24 | Create minimal help/FAQ page | REWRITE (create) | High | 2 hours |
| 25 | Expand About page content | REWRITE | Low | 1 hour |

---

## 12. Large Tasks

| # | Task | Classification | Priority | Effort |
|---|------|---------------|----------|--------|
| 1 | Create Privacy Policy page | REWRITE (create) | Critical | 2-3 hours |
| 2 | Create Terms of Service page | REWRITE (create) | Critical | 2-3 hours |
| 3 | Create comprehensive help center | REWRITE (create) | High | 3-4 hours |
| 4 | Consolidate legacy Driver with RacerProfile | REMOVE | Low | 1 week |
| 5 | Consolidate dual routing system | REMOVE | Low | 2-3 hours |
| 6 | Remove backfill functions from production | REMOVE | Low | 2-3 hours |
| 7 | Create branded placeholder avatar | REWRITE | Low | 1 hour |
| 8 | Design branded skeletons | REWRITE | Low | 1-2 hours |
| 9 | Create 500 error page | REWRITE (create) | Medium | 1 hour |
| 10 | Create offline/connectivity page | REWRITE (create) | Medium | 1 hour |

---

## 13. Critical Launch Blockers

These must be resolved before Friends & Family launch. All are achievable in < 1 day.

| # | Blocker | Classification | Effort | Owner |
|---|--------|---------------|--------|-------|
| 1 | Replace "Base44 APP" title with Hijinx title | REMOVE | 5 min | Branding |
| 2 | Replace Base44 favicon with Hijinx icon | REMOVE | 5 min | Branding |
| 3 | Add meta description to index.html | REMOVE (gap) | 5 min | Branding |
| 4 | Remove developer text from 404 page | REMOVE | 5 min | Engineering |
| 5 | Fix Report Issue silent failure | REMOVE | 15 min | Engineering |
| 6 | Add legal links to footer | REWRITE | 15 min | Legal |
| 7 | Create minimal Privacy Policy | REWRITE (create) | 2 hours | Legal |
| 8 | Create minimal Terms of Service | REWRITE (create) | 2 hours | Legal |

**Total critical blocker effort: ~4.5 hours.**

---

## 14. Recommended Sprint 1A Implementation Order

### Phase 1: Brand Identity (30 min)

| Order | Task | Effort |
|-------|------|--------|
| 1 | Replace "Base44 APP" title in index.html | 5 min |
| 2 | Replace Base44 favicon in index.html | 5 min |
| 3 | Add meta description to index.html | 5 min |
| 4 | Add OG/Twitter card tags to index.html | 15 min |

### Phase 2: Developer Artifact Removal (30 min)

| Order | Task | Effort |
|-------|------|--------|
| 5 | Remove developer text from 404 page | 5 min |
| 6 | Fix Report Issue silent failure | 15 min |
| 7 | Fix mobile nav legacy route | 5 min |
| 8 | Remove console.warn in Report Issue | 5 min |

### Phase 3: Legal Foundation (4 hours)

| Order | Task | Effort |
|-------|------|--------|
| 9 | Add legal links to footer | 15 min |
| 10 | Create minimal Privacy Policy | 2 hours |
| 11 | Create minimal Terms of Service | 2 hours |

### Phase 4: Visual Consistency (3 hours)

| Order | Task | Effort |
|-------|------|--------|
| 12 | Fix 404 page hardcoded colors | 15 min |
| 13 | Fix UserNotRegisteredError hardcoded colors | 15 min |
| 14 | Fix EmptyState hardcoded colors | 15 min |
| 15 | Fix ReportIssueModal hardcoded colors | 30 min |
| 16 | Fix Contact page hardcoded colors | 30 min |
| 17 | Fix About page hardcoded colors | 30 min |
| 18 | Fix CreativeServices hardcoded colors | 30 min |
| 19 | Fix TechHome hardcoded colors | 30 min |
| 20 | Fix Learning page hardcoded colors | 30 min |
| 21 | Fix Hospitality page hardcoded colors | 30 min |
| 22 | Fix FoodBeverage page hardcoded colors | 30 min |

### Phase 5: Content & Messaging (1 hour)

| Order | Task | Effort |
|-------|------|--------|
| 23 | Rewrite beta announcement bar wording | 10 min |
| 24 | Rewrite Join page RaceCore perk wording | 5 min |
| 25 | Verify and fix/remove Coming Soon toasts | 30 min |
| 26 | Shorten search placeholder | 5 min |
| 27 | Improve EmptyState default copy | 15 min |
| 28 | Add subtitle for "The Outlet" | 15 min |

### Phase 6: Navigation & Help (3 hours)

| Order | Task | Effort |
|-------|------|--------|
| 29 | Move diagnostic tools out of RaceCore nav | 1 hour |
| 30 | Move repair tools out of RaceCore nav | 30 min |
| 31 | Create minimal help/FAQ page | 2 hours |
| 32 | Explain INDEX46 and RaceCore in help | 30 min |

### Phase 7: UX Polish (2 hours)

| Order | Task | Effort |
|-------|------|--------|
| 33 | Replace Report Issue screenshot URL with file upload | 1 hour |
| 34 | Add search to mobile | 2 hours |

### Phase 8: Deferred (Post-Friends & Family)

| Order | Task | Effort |
|-------|------|--------|
| 35 | Create Community Guidelines | 1 hour |
| 36 | Consolidate legacy Driver with RacerProfile | 1 week |
| 37 | Consolidate dual routing system | 2-3 hours |
| 38 | Remove backfill functions | 2-3 hours |
| 39 | Create 500 error page | 1 hour |
| 40 | Create offline page | 1 hour |

### Sprint 1A Total Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Brand Identity | 30 min |
| Phase 2: Developer Artifact Removal | 30 min |
| Phase 3: Legal Foundation | 4 hours |
| Phase 4: Visual Consistency | 3 hours |
| Phase 5: Content & Messaging | 1 hour |
| Phase 6: Navigation & Help | 3 hours |
| Phase 7: UX Polish | 3 hours |
| **Total Sprint 1A** | **~15 hours (2 days)** |

---

*End of inventory. This report is read-only. No code was modified, no files were created (other than this report), no data was written. This report is the implementation checklist for Sprint 1A.*