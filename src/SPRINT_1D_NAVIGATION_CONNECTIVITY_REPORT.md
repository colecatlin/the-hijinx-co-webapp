# Sprint 1D — Navigation, Discovery & Ecosystem Connectivity Report

**Sprint Period:** Post–Sprint 1C Data Compliance Certification
**Release Target:** September 1st Friends & Family Launch
**Status:** ✅ Complete

---

## Executive Summary

Sprint 1D replaced text-based references with deep links and breadcrumbs across the Hijinx platform, eliminating dead-end navigation and connecting the ecosystem of profiles, directories, and management tools. Every major entity profile now offers contextual pathways to related entities, sponsors, and directory pages.

---

## 1. Deep-Linking Refactor (List Views)

### Series Schedule (`SeriesSchedule.jsx`)
- ✅ Track names now link to `/tracks/:slug` canonical profiles
- ✅ Winner names now link to racer profiles via slug
- ✅ Event names link to `/events/:slug` canonical profiles

### Series Racer Roster (`SeriesRacerRoster.jsx`)
- ✅ Team names now link to team profiles
- ✅ Racer names link to `/racers/:slug` canonical profiles

### Event Racer Card (`EventRacerCard.jsx`)
- ✅ Restructured card to separate racer, team, and vehicle into independent deep links
- ✅ Each entity links to its canonical profile route

---

## 2. Sponsorship Visibility (Shared Component)

### `EntitySponsorsTab` (New Shared Component)
- ✅ Created reusable component at `src/components/shared/EntitySponsorsTab.jsx`
- ✅ Queries Sponsorship records by `target_entity_type` + `target_entity_id`
- ✅ Displays sponsor cards with logo, name (linked to org profile), tier, and relationship type
- ✅ Handles empty state gracefully

### Profiles with Sponsors Tab Integrated
- ✅ **Team Profile** — Sponsors tab added
- ✅ **Track Profile** — Sponsors tab added
- ✅ **Event Profile** — Sponsors tab added
- ✅ **Vehicle Profile** — Sponsors tab added (fixes the #1 dead end — vehicles had no sponsor exposure)

---

## 3. Breadcrumb Navigation (Shared Component)

### `EntityBreadcrumbs` (New Shared Component)
- ✅ Created reusable component at `src/components/shared/EntityBreadcrumbs.jsx`
- ✅ Renders: Home → Directory → Entity Type → Entity Name
- ✅ Each crumb is a deep link to its canonical page
- ✅ Compact, non-sticky design for placement in profile action/nav rows

### Profiles with Breadcrumbs Integrated
- ✅ **Racer Profile** — Breadcrumbs added
- ✅ **Team Profile** — Breadcrumbs added
- ✅ **Track Profile** — Breadcrumbs added
- ✅ **Event Profile** — Breadcrumbs added
- ✅ **Vehicle Profile** — Breadcrumbs added

---

## 4. Directory Expansion

### New Directory Categories
- ✅ **Vehicles** — Added `VehicleDirectory` component at `src/pages/VehicleDirectory.jsx`
  - Lists all non-draft, non-archived vehicles
  - Cards link to `/vehicles/:slug` profiles
  - Searchable by nickname, manufacturer, model, vehicle type
- ✅ **Sponsors** — Added `SponsorDirectory` component at `src/pages/SponsorDirectory.jsx`
  - Lists all Organization records with `type: 'Sponsor'`
  - Cards link to `/organization/Sponsor/:id` profiles
  - Searchable by name, industry, description

### Directory Integration
- ✅ Both categories added to `CATEGORIES` array in `Directory.jsx`
- ✅ Live counts wired for both categories in the switcher pills
- ✅ Vehicles count filters out draft/archived records
- ✅ Sponsors count filters out archived organizations

---

## 5. Header & Footer Navigation

### INDEX46 Dropdown
- ✅ Added "Vehicles" link to `/Directory?cat=vehicles`
- ✅ Added "Sponsors" link to `/Directory?cat=sponsors`
- ✅ Placed in the Directory section of the dropdown

### Mobile Navigation
- ✅ Search icon now visible on mobile (was desktop-only)
- ✅ Mobile menu includes "Search the ecosystem" button
- ✅ "Join / Claim Your Profile" CTA added to mobile menu for unauthenticated users

### Footer
- ✅ Added "Get Started" column with /join, Directory, Racers, Sponsors, Vehicles links
- ✅ Removed duplicate "Creative Services" entry from Ventures column
- ✅ Footer link rendering updated to handle both `href` and `page` link types

---

## 6. Results Panel Connectivity

### Championship Standings Tab (`ResultsPanel.jsx`)
- ✅ Added "View Full Standings" link to each series+class group header
- ✅ Links to `/racecore/standings/:seriesId/:seasonYear` canonical standings page
- ✅ Uses TrendingUp icon for visual consistency

---

## 7. Files Created

| File | Purpose |
|------|---------|
| `src/components/shared/EntitySponsorsTab.jsx` | Reusable sponsors tab for any entity profile |
| `src/components/shared/EntityBreadcrumbs.jsx` | Reusable breadcrumb nav for entity profiles |
| `src/pages/VehicleDirectory.jsx` | Vehicle directory listing component |
| `src/pages/SponsorDirectory.jsx` | Sponsor directory listing component |
| `src/SPRINT_1D_NAVIGATION_CONNECTIVITY_REPORT.md` | This report |

---

## 8. Files Modified

| File | Changes |
|------|---------|
| `src/pages/Directory.jsx` | Added Vehicles + Sponsors categories, counts, imports |
| `src/Layout.jsx` | Added Vehicles/Sponsors to INDEX46 dropdown, mobile search, mobile join CTA |
| `src/components/shared/Footer.jsx` | Added Get Started column, removed duplicate, href support |
| `src/components/series/SeriesSchedule.jsx` | Deep-linked tracks, winners, events |
| `src/components/series/SeriesRacerRoster.jsx` | Deep-linked teams, racers |
| `src/components/events/EventRacerCard.jsx` | Restructured for separate entity deep links |
| `src/components/results/ResultsPanel.jsx` | Added "View Full Standings" links |
| `src/pages/TeamProfile.jsx` | Integrated EntitySponsorsTab + EntityBreadcrumbs |
| `src/pages/TrackProfile.jsx` | Integrated EntitySponsorsTab + EntityBreadcrumbs |
| `src/pages/EventProfile.jsx` | Integrated EntitySponsorsTab + EntityBreadcrumbs |
| `src/pages/VehicleProfile.jsx` | Integrated EntitySponsorsTab + EntityBreadcrumbs + Events tab |
| `src/pages/RacerProfile.jsx` | Integrated EntityBreadcrumbs |

---

## 9. Dead Ends Eliminated

| Previous Dead End | Resolution |
|-------------------|------------|
| Vehicle profiles had no sponsor visibility | EntitySponsorsTab added |
| Vehicle profiles had no events tab | Events tab added |
| Track names in schedules were plain text | Deep-linked to track profiles |
| Winner names in schedules were plain text | Deep-linked to racer profiles |
| Team names in rosters were plain text | Deep-linked to team profiles |
| No breadcrumbs on any profile | EntityBreadcrumbs on all 5 profile types |
| Vehicles and Sponsors not in Directory | Both added as categories with counts |
| No mobile search access | Search icon visible on all viewports |
| No /join link in footer or mobile menu | Added to both |
| Championship standings had no link to full standings | "View Full Standings" link added |

---

## 10. Verification Checklist

- ✅ All new imports resolve to real files
- ✅ No ESM `require()` calls introduced
- ✅ All lucide-react icons used are valid exports
- ✅ All `@/` alias imports verified
- ✅ No business logic changed — only navigation/connectivity additions
- ✅ Mobile responsive considerations maintained (safe-area, touch targets)
- ✅ Semantic design tokens used throughout new components

---

## Conclusion

Sprint 1D successfully transformed the Hijinx platform from a collection of isolated profile pages into a connected ecosystem. Every major entity now offers contextual pathways to related entities, sponsors, and directory pages. The platform is navigation-ready for the September 1st Friends & Family release.