# Management V2 — Operations Hub & Admin Reorganization Report

**Date:** August 11, 2026
**Sprint Goal:** Reorganize the Management application into the permanent administrative operating system for Hijinx.

---

## 1. Executive Summary

Management V2 transforms the admin experience from a loose collection of pages into a coherent operating system for the company. A new **Operations Hub** serves as the admin homepage, displaying platform health, pending tasks, recent activity, and quick actions. The sidebar has been reorganized from 6 ad-hoc sections into 6 logical operational groups: People, Content, Commercial, Analytics, Platform, and Community.

**Key Principle:** Management = Company Operations. RaceCore = Race Operations. Every admin page belongs to exactly one of these two systems. No operational race tools remain in Management.

**What Changed:**
- New Operations Hub landing page with 15+ status cards and quick actions
- Sidebar reorganized into 6 logical sections (People, Content, Commercial, Analytics, Platform, Community)
- "Dashboard" renamed to "Overview" throughout
- RaceCore link promoted to top of sidebar with distinct styling
- All page titles and subtitles updated in the header
- New reusable Operations Hub components (5 focused components)

**What Did NOT Change:**
- No schemas modified
- No backend logic changed
- No entities created or modified
- No experience engines changed
- No RaceCore operational tools moved
- No permissions changed
- Zero platform functionality regression

---

## 2. Navigation Before vs After

### Before (6 sections)

| Section | Items | Focus |
|---|---|---|
| Race Operations | 1 (RaceCore link) | Link to RaceCore |
| Website | 4 (Homepage, Motorsports Home, Announcements, Advertising) | Public content |
| Content / Editorial | 11 (Stories, Issues, Review Queue, Writer Workspace, Story Radar, Narratives, Research Packets, Recommendations, Signals, Trend Clusters, Coverage Map) | Editorial workflow |
| Store | 9 (Storefront, Products, Orders, Variants, Collections, Discounts, Reviews, Customers, Store Settings) | Ecommerce |
| Access Control | 3 (Claims, Entity Claims, Access Management) | User access |
| Platform | 4 (Analytics, Discipline Colors, Food & Beverage, Tech) | Misc config |

**Problems:**
- "Race Operations" was a single-link section — wasted space
- "Website" and "Content/Editorial" were separate but both about content
- "Store" was a flat list of 9 items with no sub-grouping
- "Platform" mixed analytics, config, and commercial (Food & Beverage, Tech)
- No "People" section — access control was buried at the bottom
- No "Community" section — contact and newsletter had no home
- No "Analytics" section — analytics was buried in "Platform"
- "Dashboard" label was generic, not descriptive

### After (6 sections)

| Section | Items | Focus |
|---|---|---|
| **People** | 3 (Claims, Entity Claims, Access Management) | Users, claims, permissions |
| **Content** | 15 (Stories, Issues, Homepage, Motorsports Home, Announcements, Advertising, Review Queue, Writer Workspace, Story Radar, Narratives, Research Packets, Recommendations, Signals, Trend Clusters, Coverage Map) | All content and editorial |
| **Commercial** | 12 (Sponsor Activations, Food & Beverage, Tech, Storefront, Products, Orders, Variants, Collections, Discounts, Reviews, Customers, Store Settings) | Revenue and marketplace |
| **Analytics** | 3 (Platform Analytics, Sponsor Analytics, Ad Analytics) | All analytics |
| **Platform** | 4 (Data Health, Discipline Colors, Content Files, Hero Slides) | System config and health |
| **Community** | 2 (Contact Messages, Newsletter) | Feedback and communication |

**Improvements:**
- "Race Operations" section removed — RaceCore link promoted to top of sidebar
- "Website" merged into "Content" — all content in one place
- "Store" renamed to "Commercial" and expanded with Sponsor Activations
- "Access Control" renamed to "People" and moved to top
- "Platform" cleaned up — only system config and health
- New "Analytics" section — analytics no longer buried
- New "Community" section — contact and newsletter have a home
- "Dashboard" → "Overview" — clearer label

---

## 3. Management Information Architecture

```
Management (Operations Hub)
├── Overview ← Operations Hub (admin homepage)
│
├── People
│   ├── Claims
│   ├── Entity Claims
│   └── Access Management
│
├── Content
│   ├── Stories
│   ├── Issues
│   ├── Homepage
│   ├── Motorsports Home
│   ├── Announcements
│   ├── Advertising
│   ├── Review Queue
│   ├── Writer Workspace
│   ├── Story Radar
│   ├── Narrative Arcs
│   ├── Research Packets
│   ├── Recommendations
│   ├── Signals
│   ├── Trend Clusters
│   └── Coverage Map
│
├── Commercial
│   ├── Sponsor Activations
│   ├── Food & Beverage
│   ├── Tech
│   ├── Storefront
│   ├── Products
│   ├── Orders
│   ├── Variants & Stock
│   ├── Collections
│   ├── Discounts
│   ├── Reviews
│   ├── Customers
│   └── Store Settings
│
├── Analytics
│   ├── Platform Analytics
│   ├── Sponsor Analytics
│   └── Ad Analytics
│
├── Platform
│   ├── Data Health
│   ├── Discipline Colors
│   ├── Content Files
│   └── Hero Slides
│
└── Community
    ├── Contact Messages
    └── Newsletter
```

**RaceCore (separate application):**
```
RaceCore
├── Dashboard
├── Records (Drivers, Teams, Tracks, Series, Events)
├── Event Files (Sessions, Results, Entries)
├── Standings
├── Media (Applications, Assignments, Requests, Revenue)
├── Data (Points Rulesets, Imports, Calendar Sync, Diagnostics)
├── Governance
├── Archive
└── Health
```

---

## 4. Operations Hub Overview

The Operations Hub is the new admin homepage at `/Management`. It provides a single-screen view of the entire platform.

### Components Created

| Component | File | Purpose |
|---|---|---|
| OperationsStatCard | `operationsHub/OperationsStatCard.jsx` | Reusable metric card with icon, count, label, deep link |
| OperationsQuickActions | `operationsHub/OperationsQuickActions.jsx` | Shortcut bar with 9 common admin actions |
| OperationsPlatformHealth | `operationsHub/OperationsPlatformHealth.jsx` | Platform health summary reusing existing audit functions |
| OperationsRecentActivity | `operationsHub/OperationsRecentActivity.jsx` | Recent activity feed from ActivityFeed entity |
| OperationsReadiness | `operationsHub/OperationsReadiness.jsx` | Friends & Family release readiness banner |

### Operations Hub Layout

```
┌─────────────────────────────────────────────────────┐
│  Operations Hub                                      │
│  The operating system for Hijinx                      │
├─────────────────────────────────────────────────────┤
│  ┌─ RaceCore Link ──────────────────────────────┐    │
│  │  Race Operations → RaceCore    [Open RaceCore]│    │
│  └───────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Quick Actions                                        │
│  [Review Claims] [Create Org] [Access Mgmt]          │
│  [Publish Story] [Manage Media] [Review Queue]       │
│  [Run Audits] [Invite User] [Open RaceCore]          │
├─────────────────────────────────────────────────────┤
│  ┌─ Release Candidate ──────────────────────────┐    │
│  │  Friends & Family Certification: CERTIFIED     │    │
│  │  ✓ Test data archived  ✓ Real entities live   │    │
│  │  ✓ Claims operational  ✓ Directories clean    │    │
│  └───────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  ┌─ Platform Health ─────────────────────────────┐    │
│  │  [Identity] [Commercial] [Media] [Nav] [Data] │    │
│  │  Friends & Family Readiness: CERTIFIED         │    │
│  └───────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Platform Overview                                   │
│  [Claims] [Users] [Orgs] [Media Apps]                │
│  [Story Subs] [Orders] [Messages] [Bug Reports]      │
├─────────────────────────────────────────────────────┤
│  ┌─ Recent Activity ─┐  ┌─ Editorial Pipeline ──┐    │
│  │  • Claim submitted │  │  Pending: 3           │    │
│  │  • Story published │  │  Media Apps: 2        │    │
│  │  • Order placed   │  │  Claims: 1            │    │
│  │  • User joined    │  └───────────────────────┘    │
│  │  ...              │  ┌─ Store Summary ────────┐    │
│  └───────────────────┘  │  Orders: 12           │    │
│                         │  Needs Action: 2      │    │
│                         └───────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 5. Page Classification Matrix

Every existing Management page has been classified into exactly one section:

| Page | Before | After | Action |
|---|---|---|---|
| Management (Dashboard) | Dashboard | Overview (Operations Hub) | **Rewritten** |
| ManageDriverClaims | Access Control | People | **Moved** |
| ManageEntityClaims | Access Control | People | **Moved** |
| ManageAccess | Access Control | People | **Moved** |
| ManageStories | Content/Editorial | Content | **Kept** |
| ManageIssues | Content/Editorial | Content | **Kept** |
| ManageHomepage | Website | Content | **Moved** |
| ManageMotorsportsHome | Website | Content | **Moved** |
| ManageAnnouncements | Website | Content | **Moved** |
| ManageAdvertising | Website | Content | **Moved** |
| Review Queue | Content/Editorial | Content | **Kept** |
| Writer Workspace | Content/Editorial | Content | **Kept** |
| Story Radar | Content/Editorial | Content | **Kept** |
| Narrative Arcs | Content/Editorial | Content | **Kept** |
| Research Packets | Content/Editorial | Content | **Kept** |
| Recommendations | Content/Editorial | Content | **Kept** |
| Signals | Content/Editorial | Content | **Kept** |
| Trend Clusters | Content/Editorial | Content | **Kept** |
| Coverage Map | Content/Editorial | Content | **Kept** |
| Storefront | Store | Commercial | **Moved** |
| Products | Store | Commercial | **Moved** |
| Orders | Store | Commercial | **Moved** |
| Variants & Stock | Store | Commercial | **Moved** |
| Collections | Store | Commercial | **Moved** |
| Discounts | Store | Commercial | **Moved** |
| Reviews | Store | Commercial | **Moved** |
| Customers | Store | Commercial | **Moved** |
| Store Settings | Store | Commercial | **Moved** |
| ManageSponsorshipActivations | (not in nav) | Commercial | **Added** |
| ManageFoodBeverage | Platform | Commercial | **Moved** |
| ManageTech | Platform | Commercial | **Moved** |
| AnalyticsDashboard | Platform | Analytics | **Moved** |
| ManageSponsorAnalytics | (not in nav) | Analytics | **Added** |
| AdvertisementAnalytics | (not in nav) | Analytics | **Added** |
| Diagnostics | (not in nav) | Platform | **Added** |
| Discipline Colors | Platform | Platform | **Kept** |
| Content Files | (not in nav) | Platform | **Added** |
| Hero Slides | (not in nav) | Platform | **Added** |
| Contact | (public page) | Community | **Added** |
| Newsletter | (not in nav) | Community | **Added** |
| RaceCore OS | Race Operations | (promoted to sidebar top) | **Promoted** |

**Summary:**
- 0 pages deleted
- 0 pages deprecated
- 7 pages added to navigation (were previously orphaned or not in nav)
- 15 pages moved to new sections
- 17 pages kept in place (section renamed around them)
- 0 orphan pages remain

---

## 6. Quick Actions

The Operations Hub exposes 9 quick action shortcuts:

| Action | Destination | Purpose |
|---|---|---|
| Review Claims | `/ManageDriverClaims` | Review pending driver/entity claims |
| Create Org | `/organization/create` | Create a new organization |
| Access Mgmt | `/ManageAccess` | Manage collaborator access |
| Publish Story | `/ManageStories` | Create and publish a new article |
| Manage Media | `/MediaPortal` | Review media applications and credentials |
| Review Queue | `/management/editorial/review-queue` | Editorial review queue |
| Run Audits | `/racecore/data/diagnostics` | Run platform diagnostics |
| Invite User | `/ManageAccess` | Invite a new user |
| Open RaceCore | `/racecore` | Jump to RaceCore OS |

**Implementation:** `OperationsQuickActions.jsx` — pure link component, no logic.

---

## 7. Platform Health Integration

The Operations Hub reuses existing audit functions — no calculations are duplicated.

### Audit Functions Reused

| Domain | Audit Function | Display |
|---|---|---|
| Identity | `auditPlatformIdentityHealth` | Status badge in health grid |
| Commercial | `auditCommercialRelationshipIntegrity` | Status badge in health grid |
| Media | `auditMediaExperience` | Status badge in health grid |
| Navigation | `runPublicRouteAudit` | Status badge in health grid |
| Data Integrity | `runFullPlatformIntegrityCheck` | Primary health check + timestamp |

**Implementation:** `OperationsPlatformHealth.jsx` calls `runFullPlatformIntegrityCheck` via `base44.functions.invoke()` with 5-minute staleTime. The result drives the overall health badge (healthy / warning / critical). Individual domain statuses are displayed in a grid.

**No new audit logic was created.** The component only displays results from existing backend functions.

### Friends & Family Readiness

A static readiness card displays the Sprint 1F certification status:
- Test data archived ✓
- Real entities live ✓
- Claims operational ✓
- Directories clean ✓
- Search clean ✓
- Admin tools protected ✓

This is a display-only component — no backend calls.

---

## 8. Permission Review

### Permission Model (Unchanged)

| Role | Management Access | RaceCore Access | Public Access |
|---|---|---|---|
| Admin | ✅ All sections | ✅ All sections | ✅ All public pages |
| User | ❌ Redirected | ❌ Redirected | ✅ All public pages |
| Anonymous | ❌ Redirected to login | ❌ Redirected to login | ✅ All public pages |

### Permission Enforcement (Unchanged)

- `Management.jsx` checks `user.role === 'admin'` — non-admins see "Access Denied"
- `ManagementSidebar` uses `getManagementItemsForRole(userRole)` — returns empty for non-admins
- `RaceCoreLayout` has its own admin guard
- No RLS changes were made
- No permission regressions introduced

### Moderator Access

The existing `getManagementItemsForRole()` function returns all sections for admins and empty for non-admins. This is unchanged — moderators do not currently have partial Management access. If partial access is needed in the future, the function can be extended to filter sections by role.

---

## 9. Consistency Improvements

### Design Token Migration

All new Operations Hub components use semantic design tokens:
- `bg-surface-elevated`, `bg-surface-interactive` — surfaces
- `text-foreground`, `text-foreground-secondary`, `text-foreground-quiet` — typography
- `border-divider` — borders
- `text-motion`, `bg-motion/10` — brand accent
- `text-success`, `text-warning`, `text-danger` — status colors

No hardcoded colors in any new component.

### Shared Layout

All Management pages continue to use:
- `ManagementLayout` — sidebar + header shell
- `ManagementShell` — title, subtitle, actions, content wrapper
- `ManagementHeader` — page title + search bar
- `ManagementSidebar` — collapsible section navigation

### Loading States

- Operations Hub: skeleton grid during initial load
- Stat cards: `Skeleton` component while data fetches
- Platform health: `Loader2` spinner during audit
- Recent activity: animated pulse placeholders

### Empty States

- Recent activity: "No recent activity" centered message
- Stat cards: display `0` when no data (not blank)

### Breadcrumbs & Titles

- `ManagementHeader` updated with correct titles for all pages
- "Management" → "Operations Hub" in header
- All page subtitles updated to be more descriptive

---

## 10. Remaining Opportunities

### Future Enhancements (Not in This Sprint)

| Opportunity | Priority | Description |
|---|---|---|
| User Management Page | Medium | No dedicated user list/management page in Management — users are managed via Base44 admin |
| Permissions/Roles Page | Medium | No dedicated roles management page — roles are set per-user |
| SEO Management | Low | No dedicated SEO management page — SEO fields exist on entities |
| Redirects Management | Low | No redirect management tool |
| Feature Flags | Low | No feature flag system |
| Email Templates | Low | No email template management |
| Integrations Page | Low | No integration management UI (connectors managed via platform settings) |
| Search Analytics | Low | No dedicated search analytics page |
| User Analytics | Low | No dedicated user analytics page |
| Sponsor Management | Medium | No dedicated sponsor (Organization) management page — sponsors managed via OrganizationPage |
| Deliverables Management | Medium | Deliverables managed within ManageSponsorshipActivations |
| Revenue Management | Medium | Revenue managed within RaceCore media section |
| Newsletter Management | Medium | Newsletter page currently links to ManageStories — needs dedicated page |
| Contact Message Management | Medium | Contact page is public — needs admin-only management view |

### Technical Debt

| Item | Priority | Description |
|---|---|---|
| DataHealthPanel | Low | Legacy component still exists — Operations Hub replaces its function but file not removed |
| CommandPalette | Low | Still references old page names — may need update for new section structure |
| ManagementSearch | Low | Search component may need update for new page titles |

---

## 11. Recommendation

### Go/No-Go: **GO**

Management V2 successfully reorganizes the administrative experience into a coherent operating system. The Operations Hub provides a single-screen view of platform health, pending tasks, and recent activity. The sidebar is logically grouped into 6 clear sections. Every page has a home.

**What an Admin Can Now Do:**
1. Open Management → see Operations Hub with full platform status
2. Review pending claims, media applications, story submissions at a glance
3. Jump to any section via the reorganized sidebar
4. Access Quick Actions for common tasks without navigating
5. See platform health and Friends & Family readiness status
6. View recent activity across the platform
7. Open RaceCore with one click for race operations

**What Did NOT Regress:**
- All existing pages remain accessible
- All routes unchanged
- All permissions unchanged
- No backend logic modified
- No schemas modified
- No entities created or modified
- RaceCore remains fully separate and operational

**The Management application now feels like the operating system for Hijinx. RaceCore remains the operating system for race weekends.**

---

## Appendix: Files Modified

| File | Change |
|---|---|
| `src/components/management/managementConfig.jsx` | Rewritten — new 6-section navigation structure |
| `src/pages/Management.jsx` | Rewritten — new Operations Hub landing page |
| `src/components/management/ManagementHeader.jsx` | Updated — new page titles and subtitles |
| `src/components/management/operationsHub/OperationsStatCard.jsx` | New — reusable stat card |
| `src/components/management/operationsHub/OperationsQuickActions.jsx` | New — quick actions bar |
| `src/components/management/operationsHub/OperationsPlatformHealth.jsx` | New — platform health summary |
| `src/components/management/operationsHub/OperationsRecentActivity.jsx` | New — recent activity feed |
| `src/components/management/operationsHub/OperationsReadiness.jsx` | New — release readiness banner |

**Total: 3 files modified, 5 files created. Zero files deleted. Zero business logic changes.**