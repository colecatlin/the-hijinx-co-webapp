# PXV_AUDIT_02_INFORMATION_ARCHITECTURE

**Audit Type:** Read-only navigation & information architecture audit  
**Date:** 2026-08-10  
**Scope:** Every navigation system, entity relationship path, cross-link, search journey, and hierarchy structure across the complete platform  
**Methodology:** Mapped all navigation surfaces (header, footer, mobile, dashboard, entity pages, RaceCore, Management), traced cross-links between every entity type, measured navigation depth, and evaluated information grouping  

---

## 1. Executive Summary

The Hijinx platform has a **deep and rich entity model** with 40+ entity types connected through well-modeled relationships. The backend architecture (experience functions, sponsorship platform, commercial layer) is excellent. However, the **information architecture as experienced by a user is fragmented across three disconnected shells** (public site, RaceCore, Management) with no unified navigation between them, and the **entity hierarchy is not obvious** to a first-time visitor.

The platform operates as **three separate products sharing a database**:
1. **Public Site** (Hijinx/INDEX46) — browse entities, read stories, view profiles
2. **RaceCore** — operational tools for entity owners and admins
3. **Management** — legacy admin panel (being absorbed by RaceCore)

These three shells have **completely different layouts, navigation systems, color themes, and back-link patterns**. Moving between them is a jarring context switch. The RaceCore sidebar has a "Back to HIJINX" button (a logo), but the public site has no link to RaceCore except from the dashboard's "Race Core" button on entity cards. Management is accessible only from the header "Admin Tools" button (admins only).

**The core IA problem:** Users don't know which shell they're in, why they're there, or how to get to the other shells. The three names (Hijinx / INDEX46 / RaceCore) are used inconsistently and never explained as a coherent ecosystem.

**Entity cross-linking is strong within entity pages** — every entity profile has tabs and sidebar links to related entities. But **directory-level discovery is incomplete**: Vehicles and Sponsors have no dedicated directory tab, and Organizations (non-sponsor) have no public directory at all.

---

## 2. Navigation Map

### 2.1 Primary Header (Public Site)

```
ANNOUNCEMENT BAR (rotating messages)
├── HIJINX LOGO → /Home
├── DESKTOP NAV (5 items)
│   ├── Home → /Home
│   ├── The Outlet ▼
│   │   ├── Stories → /OutletHome
│   │   └── Submit a Story → /OutletSubmit
│   ├── INDEX46 ▼
│   │   ├── — Directory — (label)
│   │   ├── All Records → /Directory
│   │   ├── Racers → /Directory?cat=drivers
│   │   ├── Teams → /Directory?cat=teams
│   │   ├── Tracks → /Directory?cat=tracks
│   │   ├── Series → /Directory?cat=series
│   │   ├── — Events — (label)
│   │   ├── Events → /Directory?cat=events
│   │   ├── — Registration — (label)
│   │   ├── Register for Event → /Registration
│   │   ├── — Media — (label)
│   │   ├── Media Home → /MediaHome
│   │   ├── Creator Directory → /Directory?cat=creators
│   │   ├── Media Outlets → /Directory?cat=outlets
│   │   └── Media Portal → /MediaPortal
│   ├── Apparel → /ApparelHome
│   └── Marketplace → /MarketplaceHome
├── ACTIONS
│   ├── Theme Toggle
│   ├── Search (desktop only)
│   ├── Admin Tools → /Management (admin only)
│   ├── User Menu / Login
│   └── Cart Icon
└── MOBILE MENU (hamburger)
    └── Same nav items, stacked
```

**Issues:**
- "INDEX46" is an opaque label — users don't know what it is
- "The Outlet" is an opaque label — users don't know it means stories
- Search is desktop-only (`hidden lg:flex`)
- No "Join" or "Claim" link in the header
- No "Sponsors" or "Vehicles" in the INDEX46 dropdown
- The dropdown uses section labels ("— Directory —", "— Events —", "— Registration —", "— Media —") which are good dividers but look like disabled items

### 2.2 Mobile Bottom Nav

```
├── Home → /Home
├── Directory → /DriverDirectory (redirects to /Directory?cat=drivers)
├── Dashboard → /MyDashboard (requires auth)
└── Profile → /Profile (requires auth)
```

**Issues:**
- No search tab
- "Directory" always defaults to Racers — no way to pick category from the bottom nav
- "Dashboard" and "Profile" require auth with no explanation for anonymous users
- No "Join" or "Claim" entry point on mobile

### 2.3 Footer

```
├── Brand + Newsletter Signup
├── Platform
│   ├── The Outlet → /OutletHome
│   ├── Motorsports → /MotorsportsHome
│   ├── Apparel → /ApparelHome
│   └── Creative Services → /CreativeServices
├── Ventures
│   ├── Creative Services → /CreativeServices (DUPLICATE)
│   ├── Tech → /TechHome
│   ├── Learning → /Learning
│   ├── Hospitality → /Hospitality
│   └── Food & Beverage → /FoodBeverage
├── Company
│   ├── About → /About
│   ├── Contact → /Contact
│   ├── Advertise → /OutletAdvertising
│   └── Submit a Story → /OutletSubmit
└── Bottom Bar
    ├── Copyright
    ├── Report an Issue
    └── "Built on purpose."
```

**Issues:**
- "Creative Services" appears in both Platform and Ventures columns
- No "Join" or "Claim Your Profile" link
- No "Sponsors" or "For Partners" section
- No link to RaceCore or Management
- "Ventures" links may lead to placeholder/empty pages

### 2.4 RaceCore Layout (Operational Shell)

```
┌─────────────────────────────────────────┐
│ SIDEBAR (persistent, collapsible)       │
│ ├── HIJINX LOGO → / (back to public)    │
│ ├── Dashboard → /racecore               │
│ ├── OPERATIONS                          │
│ │   └── Event Files → /racecore/event-files │
│ ├── RECORDS                             │
│ │   ├── Drivers → /racecore/records/drivers │
│ │   ├── Teams → /racecore/records/teams    │
│ │   ├── Series → /racecore/records/series   │
│ │   ├── Tracks → /racecore/records/tracks   │
│ │   └── Events → /racecore/records/events   │
│ ├── STANDINGS                           │
│ │   └── Championship → /racecore/standings │
│ ├── MEDIA                               │
│ │   ├── Applications                    │
│ │   ├── Assignments                     │
│ │   ├── Requests                         │
│ │   └── Revenue                          │
│ ├── GOVERNANCE (admin only)             │
│ │   ├── Overview                         │
│ │   ├── Archive                          │
│ │   ├── Data Health                      │
│ │   ├── Identity Review                  │
│ │   └── Data Quality                     │
│ └── DATA                                 │
│     ├── Points Rulesets                  │
│     ├── Imports / CSV                    │
│     ├── Calendar Sync                    │
│     ├── Results Repair                   │
│     ├── Duplicate Merge                  │
│     ├── Identity Ownership               │
│     └── Diagnostics                      │
├── QUICK ACTIONS (top)                   │
│ ├── Quick Create (admin)                │
│ ├── New Event                            │
│ ├── Media Portal                         │
│ └── Announcer Toggle                     │
└── MAIN CONTENT (Outlet)                 │
    └── No header, no footer, no back     │
        button to public site except       │
        the HIJINX logo in sidebar          │
```

**Issues:**
- No header bar — the only "back to public" link is the small HIJINX logo at the top of the sidebar
- No breadcrumb showing where you are in the RaceCore hierarchy
- The sidebar has 7 groups with 20+ items — high information density
- "Records" uses "Drivers" (not "Racers") — inconsistent with public site
- No visible connection to the Management shell
- Mobile: hamburger menu with "RACECORE" label — no context about what RaceCore is

### 2.5 Management Layout (Legacy Admin)

```
┌─────────────────────────────────────────┐
│ SIDEBAR (w-64, sticky)                  │
│ ├── Management (label)                   │
│ ├── Search                               │
│ ├── Dashboard → /Management               │
│ ├── RaceCore → /racecore (bordered link) │
│ └── [Management Sections]                │
│     (expandable groups of admin tools)   │
├── HEADER                                 │
│ └── Page title + actions                  │
└── CONTENT (scrollable)                   │
```

**Issues:**
- Management is a separate shell from RaceCore but links to it
- The Management sidebar has its own search and section structure
- Management pages are being absorbed by RaceCore (many redirect to /racecore/*)
- The relationship between Management and RaceCore is unclear to admins

### 2.6 Entity Profile Pages (Shared Pattern)

All entity profiles follow a similar structure:
```
├── Mobile Back Header (some pages)
├── HERO (dark background, entity name, badges)
├── IDENTITY BAR / META INFO (some pages)
├── ACTION ROW
│   ├── Back link (← Racers / ← Teams / ← Series / ← Tracks)
│   ├── Claim Button (some pages)
│   └── Social Share Buttons
├── TAB NAVIGATION (horizontal scroll)
│   └── 8-15 tabs depending on entity type
├── CONTENT (tab panels)
│   └── Sidebar with related entities, completeness, social links
└── ProfileClaimFooter (some pages)
```

**Tab counts by entity:**
| Entity | Tab Count | Tabs |
|--------|-----------|------|
| Racer | 8 | Overview, Career, Timeline, Statistics, Achievements, Schedule & Results, Media, Sponsors |
| Team | 9 | Overview, Roster, Timeline, Statistics, Achievements, Drivers, Programs, Schedule & Results, Media |
| Series | 15 | Overview, Schedule, Classes, Standings, Racers, Teams, Vehicles, Champions, Records, Statistics, Timeline, History, Tracks, Sponsors, Media |
| Track | 12 | Overview, Schedule, History, Timeline, Records, Champions, Racers, Teams, Vehicles, Gallery, Visitor Info, Statistics |
| Event | 9 | Overview, Schedule, Entries, Classes, Results, Standings, Timeline, Venue, Media |
| Vehicle | 8 | Overview, History, Chassis, Engine, Timeline, Statistics, Achievements, Media |
| Organization (Sponsor) | ~10 | Via SponsorProfile component |

---

## 3. Information Architecture Map

### 3.1 Platform Hierarchy (As Experienced)

```
HIJINX (Brand/Company)
├── PUBLIC SITE
│   ├── Home (homepage)
│   ├── The Outlet (editorial)
│   │   ├── Stories
│   │   ├── Submit a Story
│   │   └── Advertise
│   ├── INDEX46 (motorsports database)
│   │   ├── Directory
│   │   │   ├── Racers
│   │   │   ├── Teams
│   │   │   ├── Tracks
│   │   │   ├── Series
│   │   │   ├── Events
│   │   │   ├── Creators
│   │   │   └── Media Outlets
│   │   ├── Registration
│   │   └── Media
│   │       ├── Media Home
│   │       ├── Creator Directory
│   │       ├── Media Outlets
│   │       └── Media Portal
│   ├── Apparel (shop)
│   ├── Marketplace (coming soon)
│   └── Ventures
│       ├── Creative Services
│       ├── Tech
│       ├── Learning
│       ├── Hospitality
│       └── Food & Beverage
├── RACECORE (operational tools)
│   ├── Dashboard
│   ├── Operations (Event Files)
│   ├── Records (Drivers, Teams, Series, Tracks, Events)
│   ├── Standings
│   ├── Media (Applications, Assignments, Requests, Revenue)
│   ├── Governance (admin: Overview, Archive, Health, Identity, Quality)
│   └── Data (Points, Imports, Calendar, Diagnostics, etc.)
├── MANAGEMENT (legacy admin)
│   └── [Being absorbed by RaceCore]
└── USER SPACE
    ├── Dashboard (My Garage)
    ├── Profile
    ├── Claims Center
    └── Onboarding Wizard
```

### 3.2 What Users See vs What Exists

| Concept | Public Name | Internal Name | User Confusion |
|---------|------------|--------------|----------------|
| The brand | Hijinx | The Hijinx Co LLC | Clear |
| The database | INDEX46 | (no internal name) | **Opaque** — users don't know what INDEX46 is |
| The operations system | RaceCore | RaceCore | **Opaque** — users don't know what RaceCore is |
| The editorial platform | The Outlet | OutletHome | **Opaque** — users don't know what "The Outlet" is |
| The user dashboard | "My Garage" / "Dashboard" | MyDashboard | **Inconsistent** — two names for the same thing |
| The entity editor | "Race Core" button / "Edit" button | RaceCore entity editors | **Confusing** — two buttons, unclear difference |
| The admin panel | "Admin Tools" / "Management" | Management | **Inconsistent** — two names |

### 3.3 Hierarchy Clarity Assessment

**Can users understand what INDEX46 is?**
No. The label "INDEX46" appears in the header nav with a dropdown of directory links. A first-time visitor sees "INDEX46" and has no idea it means "the motorsports database." The dropdown items (Racers, Teams, Tracks, Series, Events) give context, but the label itself is a barrier. The Directory page says "INDEX46 · Directory" in its masthead, but the homepage never explains what INDEX46 is.

**Can users understand what RaceCore is?**
No. "RaceCore" appears as a button on dashboard entity cards, as a section name on the homepage ("RaceCoreSection"), and as the label for the operational shell. None of these explain what RaceCore is. A user who clicks "Race Core" on their dashboard is transported to a completely different layout with no explanation of what they're looking at.

**Can users understand what Hijinx is?**
Partially. The homepage says "Motorsports, Culture, and Competition" and "where motorsports, media, and culture collide." This gives a brand impression but doesn't explain the platform's structure.

**Can users understand how they relate?**
No. The relationship between Hijinx (brand), INDEX46 (database), RaceCore (operations), and The Outlet (editorial) is never stated. Users must infer it from context.

---

## 4. Entity Relationship Navigation

### 4.1 Entity Relationship Model

The platform's entity model is deep and well-connected:

```
PersonIdentity (person-centered identity)
├── RacerProfile (public racing identity)
│   ├── → Driver (legacy record)
│   ├── → SeasonParticipation → Entry → Results → Standings
│   ├── → DriverCareerStats
│   ├── → Team (via programs)
│   ├── → Vehicle (via entries)
│   ├── → Series (via programs)
│   ├── → Sponsors (DriverSponsor + Sponsorship)
│   └── → Media (MediaAsset)
├── Team
│   ├── → Drivers (roster)
│   ├── → Vehicles
│   ├── → Series (via programs)
│   ├── → Sponsors
│   └── → Events (via entries)
├── Vehicle
│   ├── → Driver (owner)
│   ├── → Team (owner)
│   ├── → Series (via participation)
│   ├── → Chassis History
│   ├── → Engine History
│   └── → Events (via entries)
├── Track
│   ├── → Events
│   ├── → Series (via events)
│   ├── → Racers (leaders)
│   ├── → Teams (leaders)
│   ├── → Vehicles (leaders)
│   └── → Champions
├── Series
│   ├── → Events
│   ├── → Tracks (via events)
│   ├── → Racers (roster)
│   ├── → Teams (roster)
│   ├── → Vehicles (participation)
│   ├── → Classes
│   ├── → Standings
│   ├── → Champions
│   ├── → Records
│   ├── → Sponsors
│   └── → Media
├── Event
│   ├── → Track (venue)
│   ├── → Series
│   ├── → Sessions → Results
│   ├── → Entries → Drivers, Teams, Vehicles
│   ├── → Classes
│   ├── → Standings Impact
│   ├── → Timeline
│   ├── → Sponsors
│   └── → Media
├── Organization (Sponsor, Vendor, Manufacturer, etc.)
│   ├── → Sponsorship → Target Entity
│   ├── → Activations
│   ├── → Deliverables
│   ├── → RevenueAgreement
│   ├── → RevenueEvent
│   ├── → Advertisements
│   └── → MediaAssignments
├── MediaProfile (creator)
│   ├── → MediaOutlet
│   ├── → MediaAsset
│   ├── → MediaAssignment
│   └── → MediaCredential
├── MediaOutlet
│   ├── → OutletStory
│   ├── → MediaProfile (contributors)
│   └── → MediaAssignment
└── OutletStory
    └── → MediaAsset, MediaProfile, MediaOutlet
```

### 4.2 Cross-Link Matrix

For each entity profile, which related entities can users navigate to directly?

| From \ To | Racer | Team | Vehicle | Track | Series | Event | Sponsor | Media | Results | Standings | Career | Timeline |
|-----------|-------|------|---------|-------|--------|-------|---------|-------|---------|-----------|--------|---------|
| **Racer** | — | ✅ (sidebar) | ✅ (career tab) | ❌ | ✅ (sidebar) | ✅ (schedule) | ✅ (sponsors tab) | ✅ (media tab) | ✅ (schedule) | ✅ (schedule) | ✅ | ✅ |
| **Team** | ✅ (drivers tab) | — | ❌ | ❌ | ✅ (programs) | ✅ (schedule) | ❌ | ✅ (media) | ✅ (schedule) | ❌ | ❌ | ✅ |
| **Vehicle** | ✅ (history) | ✅ (history) | — | ❌ | ❌ | ❌ | ❌ | ✅ (media) | ❌ | ❌ | ✅ (history) | ✅ |
| **Track** | ✅ (racers tab) | ✅ (teams tab) | ✅ (vehicles tab) | — | ✅ (via events) | ✅ (schedule) | ❌ | ✅ (gallery) | ❌ | ❌ | ❌ | ✅ |
| **Series** | ✅ (racers tab) | ✅ (teams tab) | ✅ (vehicles tab) | ✅ (tracks tab) | — | ✅ (schedule) | ✅ (sponsors tab) | ✅ (media tab) | ✅ (via schedule) | ✅ (standings) | ✅ (history) | ✅ |
| **Event** | ✅ (entries) | ✅ (entries) | ✅ (entries) | ✅ (venue) | ✅ (header) | — | ❌ | ✅ (media) | ✅ (results) | ✅ (standings) | ✅ (timeline) | ✅ |
| **Sponsor** | ✅ (entity grid) | ✅ (entity grid) | ✅ (entity grid) | ✅ (entity grid) | ✅ (entity grid) | ✅ (entity grid) | — | ✅ (media summary) | ❌ | ❌ | ✅ (timeline) | ✅ |
| **Media** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ |

**Key:**
- ✅ = Direct link from profile page
- ❌ = No direct link from profile page

### 4.3 Missing Cross-Links

**Racer → Track:** A racer's profile doesn't link to the tracks they've raced at. Users must go Racer → Schedule → Event → Track (3 clicks).

**Team → Vehicle:** Teams have a "Drivers" tab but no "Vehicles" tab. Team vehicles are only visible through individual driver entries.

**Team → Sponsor:** Teams don't have a "Sponsors" tab. Team sponsors are only visible if the team has Sponsorship records, but there's no tab for it.

**Vehicle → Event:** Vehicles don't link to the events they've participated in. Users must go Vehicle → History → (no event link).

**Vehicle → Series:** Vehicles don't link to the series they compete in.

**Event → Sponsor:** Events don't have a "Sponsors" tab despite the Sponsorship entity supporting Event targets.

**Track → Sponsor:** Tracks don't have a "Sponsors" tab.

**Media → Entities:** Media profiles don't link to the entities they've covered. There's no "covered racers" or "covered events" tab.

**Sponsor → Results/Standings:** Sponsor profiles don't link to race results or standings for their sponsored racers.

---

## 5. Search Journey

### 5.1 Search as Primary Navigation

The global search (header, desktop only) is the **most powerful navigation tool** on the platform. It searches 9 entity types simultaneously and groups results by category. For a user who knows what they're looking for, search is faster than navigating the INDEX46 dropdown → Directory → category → entity.

**However, search is desktop-only.** Mobile users have no search access from the header or bottom nav. This is a critical IA gap — search should be a primary navigation method on all devices.

### 5.2 Search Categories

The search returns 9 categories:
1. Stories (OutletStory)
2. Racers (RacerProfile)
3. Events (Event)
4. Tracks (Track)
5. Series (Series)
6. Teams (Team)
7. Vehicles (Vehicle)
8. Media (MediaAsset)
9. Sponsors (Organization with type=Sponsor)

**Missing from search:**
- Organizations (non-sponsor) — not searchable
- Media Outlets — not searchable
- Media Profiles (creators) — not searchable
- Series Classes — not searchable
- Disciplines — not searchable

### 5.3 Search Ranking & Prioritization

Search results are **not ranked** — they're filtered by substring match and sliced to 4 per category. There's no relevance scoring, no popularity ranking, no personalization. A search for "John" returns the first 4 racers whose name contains "john" sorted by created_date, not by relevance.

### 5.4 Cross-Category Discovery

Search does not support cross-category discovery. A user searching for "Bark River" (a track name) will find the track but not the events held at that track. There's no "related results" or "you might also like" feature.

### 5.5 No-Result Experience

When search returns no results: "No results for '{query}'" — adequate but doesn't suggest:
- Alternative spellings
- Browsing the Directory
- Clearing filters
- Searching a different entity type

---

## 6. Cross-Link Matrix (Detailed)

### 6.1 Racer Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Team | Hero (team name) + Sidebar | Direct Link | ✅ Good |
| Series | Sidebar (series list) | Direct Link | ✅ Good |
| Event | Schedule tab (past + upcoming) | Direct Link | ✅ Good |
| Vehicle | Career tab (vehicle history) | Panel | ✅ Good |
| Sponsor | Sponsors tab | Tab panel | ✅ Good |
| Media | Media tab | Gallery | ✅ Good |
| Track | ❌ Not linked | — | ❌ Missing |
| Results | Schedule tab (official results) | Table | ✅ Good |
| Standings | Schedule tab (standings panel) | Panel | ✅ Good |
| Career | Career tab | Tab panel | ✅ Good |
| Timeline | Timeline tab | Tab panel | ✅ Good |
| Achievements | Achievements tab | Grid | ✅ Good |

### 6.2 Team Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Racer | Drivers tab + Active drivers in schedule | Direct Link | ✅ Good |
| Series | Programs tab (series names) | Text only | ⚠️ Not linked |
| Event | Schedule tab | Direct Link | ✅ Good |
| Vehicle | ❌ Not linked | — | ❌ Missing |
| Sponsor | ❌ Not linked | — | ❌ Missing |
| Media | Media tab | Gallery | ✅ Good |
| Track | ❌ Not linked (only via events) | — | ❌ Missing |
| Results | Schedule tab | Panel | ✅ Good |
| Standings | ❌ Not linked | — | ❌ Missing |
| Timeline | Timeline tab | Tab panel | ✅ Good |

### 6.3 Series Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Racer | Racers tab | Roster | ✅ Good |
| Team | Teams tab | Roster | ✅ Good |
| Vehicle | Vehicles tab | List | ✅ Good |
| Track | Tracks tab | List | ✅ Good |
| Event | Schedule tab | Direct Link | ✅ Good |
| Sponsor | Sponsors tab | Panel | ✅ Good |
| Media | Media tab | Panel | ✅ Good |
| Results | Via Schedule → Event | Indirect | ⚠️ Indirect |
| Standings | Standings tab | Table | ✅ Good |
| Champions | Champions tab | Grid | ✅ Good |
| Records | Records tab | Grid | ✅ Good |
| Timeline | Timeline tab | Tab panel | ✅ Good |
| History | History tab | Tab panel | ✅ Good |

**Series is the best-connected entity profile** — 15 tabs covering all related entities.

### 6.4 Track Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Racer | Racers tab (racer leaders) | List | ✅ Good |
| Team | Teams tab (team leaders) | List | ✅ Good |
| Vehicle | Vehicles tab (vehicle leaders) | List | ✅ Good |
| Series | ❌ Not linked directly | — | ❌ Missing |
| Event | Schedule tab | Direct Link | ✅ Good |
| Sponsor | ❌ Not linked | — | ❌ Missing |
| Media | Gallery tab | Gallery | ✅ Good |
| Champions | Champions tab | Panel | ✅ Good |
| Records | Records tab | Grid | ✅ Good |
| Timeline | Timeline tab | Tab panel | ✅ Good |
| History | History tab | Tab panel | ✅ Good |

### 6.5 Event Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Track | Venue tab + Hero | Direct Link | ✅ Good |
| Series | Hero (series name) | Direct Link | ✅ Good |
| Racer | Entries tab | List | ✅ Good |
| Team | Entries tab (via racers) | Indirect | ⚠️ Indirect |
| Vehicle | Entries tab (via racers) | Indirect | ⚠️ Indirect |
| Sponsor | ❌ Not linked | — | ❌ Missing |
| Media | Media tab | Section | ✅ Good |
| Results | Results tab | View | ✅ Good |
| Standings | Standings tab | Impact panel | ✅ Good |
| Timeline | Timeline tab | Tab panel | ✅ Good |

### 6.6 Vehicle Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Racer | History tab (owner history) | Panel | ✅ Good |
| Team | History tab (team history) | Panel | ✅ Good |
| Series | ❌ Not linked | — | ❌ Missing |
| Event | ❌ Not linked | — | ❌ Missing |
| Track | ❌ Not linked | — | ❌ Missing |
| Sponsor | ❌ Not linked | — | ❌ Missing |
| Media | Media tab | Gallery | ✅ Good |
| Results | ❌ Not linked | — | ❌ Missing |
| Timeline | Timeline tab | Tab panel | ✅ Good |
| Achievements | Achievements tab | Grid | ✅ Good |

**Vehicle has the weakest cross-linking** — no links to events, series, tracks, or results.

### 6.7 Sponsor Profile Cross-Links

| Target | Link Location | Link Type | Quality |
|--------|-------------|-----------|---------|
| Racer | Entity grid | Grid | ✅ Good |
| Team | Entity grid | Grid | ✅ Good |
| Vehicle | Entity grid | Grid | ✅ Good |
| Track | Entity grid | Grid | ✅ Good |
| Series | Entity grid | Grid | ✅ Good |
| Event | Entity grid | Grid | ✅ Good |
| Media | Media summary | Panel | ✅ Good |
| Results | ❌ Not linked | — | ❌ Missing |
| Standings | ❌ Not linked | — | ❌ Missing |
| Timeline | Timeline tab | Tab panel | ✅ Good |
| Activations | Activation timeline | Panel | ✅ Good |

---

## 7. Dead Ends

### 7.1 Navigation Dead Ends (No Forward Path)

| Page | Dead End Description |
|------|---------------------|
| RaceCore layout (any /racecore/* page) | No link back to public site except small HIJINX logo in sidebar. No breadcrumb. No "back to profile" link. |
| Management layout (any /Management page) | Separate shell. Link to RaceCore exists but no link to public profiles. |
| 404 page | "Go Home" button does full page reload. No "back" button. No suggested pages. |
| UserNotRegisteredError | No "back" or "home" button. User is trapped. |
| ClaimsCenter | Light theme. No link to /join (the alternative claim flow). |
| Profile → Racing Profiles tab (no entities) | Shows code input form but no "Claim instead" link. |
| Dashboard (no entities, non-admin) | Invite code prompt with "Enter Code" but no link to /join. |
| OrganizationPage (non-sponsor) | No "Claim this organization" button. |
| Vehicle profile | No links to events, series, or results. |
| Media profile | No links to covered entities. |

### 7.2 Content Dead Ends (No Content Available)

| Location | What Happens |
|----------|-------------|
| Entity profile with no data | Tab renders but shows "No data available" or empty space |
| Series with no events | Schedule tab shows empty state |
| Racer with no results | Schedule tab shows "No past events" |
| Team with no drivers | Drivers tab shows empty state |
| Track with no schedule | Schedule tab shows empty state |
| Event with no entries | Entries tab shows empty state |
| Sponsor with no sponsorships | Entity grid shows empty state |

**Most empty states don't explain why** the content is missing or **what the user should do**.

### 7.3 Circular Navigation

| Path | Description |
|------|-------------|
| Racer → Team → Racer | Racer links to team, team links back to racer — no way to break out to a higher level |
| Event → Track → Event | Event links to track, track schedule links back to event |
| Series → Event → Series | Series links to event, event links back to series |

These aren't true circular references (they're different entities), but they can feel circular if users don't have a clear "up" navigation.

### 7.4 Orphan Pages

| Page | Why It's Orphaned |
|------|-------------------|
| /join (JoinIndex46) | Not linked from header, footer, or dashboard |
| /organization/create | Not linked from any public page |
| /ClaimsCenter | Only linked from /join and dashboard (mobile) |
| /PlatformDataMap | Not linked from public navigation |
| /StandingsHome | Not linked from header (only via /racecore/standings) |
| /Directory (as a standalone concept) | The INDEX46 dropdown links to it, but it's not in the mobile bottom nav by name |
| /MarketplaceHome | "Coming soon" — linked from header but leads to placeholder |
| /ApparelHome | "Coming soon" — linked from header but leads to placeholder |
| /CreativeServices, /TechHome, /Learning, /Hospitality, /FoodBeverage | Footer links that may lead to placeholder pages |

---

## 8. Duplicate Navigation

### 8.1 Duplicate Destinations

| Destination | Path A | Path B | Path C |
|-------------|--------|--------|--------|
| Racers Directory | INDEX46 → Racers | INDEX46 → All Records → (defaults to Racers) | Mobile bottom nav → Directory |
| Events Directory | INDEX46 → Events | INDEX46 → All Records → Events tab | Homepage → EventsSection |
| Media Home | INDEX46 → Media Home | (No alternative) | — |
| Claim Profile | /join → JoinSignUp | /ClaimsCenter → ClaimForm | Profile → Racing Profiles → (code input, not claim) |
| Entity Records (admin) | RaceCore → Records → Drivers | Management → ManageDrivers (redirects to RaceCore) | — |
| Standings | RaceCore → Standings | /StandingsHome | Series profile → Standings tab |

### 8.2 Duplicate Concepts

| Concept | Location A | Location B |
|---------|-----------|-----------|
| "Claim this profile" | ProfileClaimFooter (entity pages) | ClaimProfileButton (racer profile) | JoinSignUp (join flow) |
| "Enter invite code" | Dashboard prompt | Profile → Racing Profiles tab | — |
| Entity search | Global header search | Directory category search | ClaimsCenter search | JoinSignUp cross-check |
| "Race Core" button | Dashboard entity card | Profile → Racing Profiles tab | — |
| "Edit" button | Dashboard entity card | Profile → Racing Profiles tab | — |

### 8.3 Duplicate Labels

| Label | Meaning A | Meaning B |
|-------|-----------|-----------|
| "Dashboard" | /MyDashboard (user home) | /Management (admin dashboard) | /racecore (RaceCore dashboard) |
| "Directory" | /Directory (INDEX46 directory) | Mobile bottom nav "Directory" tab | — |
| "Profile" | /Profile (user settings) | Entity "profile" pages | — |
| "Home" | /Home (homepage) | Mobile bottom nav "Home" tab | RaceCore sidebar "Home" logo |
| "Media" | INDEX46 → Media Home | INDEX46 → Media Portal | Entity profile → Media tab |

---

## 9. Navigation Depth

### 9.1 Clicks from Homepage

| Destination | Clicks | Path |
|------------|--------|------|
| Any entity via search | 2 | Home → Search → Click result |
| Racer profile via directory | 3 | Home → INDEX46 → Racers → Click racer |
| Team profile via directory | 3 | Home → INDEX46 → Teams → Click team |
| Series profile | 3 | Home → INDEX46 → Series → Click series |
| Track profile | 3 | Home → INDEX46 → Tracks → Click track |
| Event profile | 3 | Home → INDEX46 → Events → Click event |
| Vehicle profile | 4+ | Home → Search → Click vehicle (or Home → Racer → Career → Vehicle) |
| Sponsor profile | 2-3 | Home → Search → Click sponsor (or Home → Racer → Sponsors tab → Click sponsor) |
| Organization (non-sponsor) | URL only | No public navigation path |
| Join / Claim flow | 2+ | Home → Footer (not present) → /join (must know URL) |
| Claims Center | 2+ | Home → Dashboard → (mobile only) Claims Center |
| RaceCore | 3+ | Home → Login → Dashboard → Race Core button |
| Management | 2 | Home → Admin Tools (admin only) |

### 9.2 Clicks from Search

| Destination | Clicks |
|------------|--------|
| Any entity in search results | 1 (click result) |
| Related entity from profile | 1-2 (click tab → click link) |
| Entity not in search results | N/A (must browse directory) |

### 9.3 Clicks Between Entities

| From → To | Clicks | Path |
|-----------|--------|------|
| Racer → Team | 1 | Click team name in sidebar |
| Racer → Event | 2 | Schedule tab → Click event |
| Racer → Series | 1 | Click series in sidebar |
| Racer → Track | 3+ | Schedule → Event → Venue |
| Team → Racer | 2 | Drivers tab → Click driver |
| Team → Event | 2 | Schedule tab → Click event |
| Series → Event | 2 | Schedule tab → Click event |
| Series → Track | 2 | Tracks tab → Click track |
| Event → Track | 1 | Venue tab or hero |
| Event → Series | 1 | Hero (series name) |
| Track → Event | 2 | Schedule tab → Click event |
| Track → Racer | 2 | Racers tab → Click racer |
| Vehicle → Racer | 2 | History tab → Click racer |
| Vehicle → Event | ❌ | No path |
| Sponsor → Racer | 2 | Entity grid → Click racer |

### 9.4 Maximum Navigation Depth

The deepest navigation path measured:
```
Home → INDEX46 → Series → Series Profile → Schedule Tab → Event → Event Profile → Entries Tab → Racer → Racer Profile → Career Tab → Team History → Team → Team Profile → Drivers Tab → Racer → ...
```
This is an **infinite-depth entity graph** — users can traverse racer → team → racer → team indefinitely. This is not a problem per se (it's how the web works), but without breadcrumbs, users can lose track of how they got there.

### 9.5 Maximum Tab Depth

| Entity | Max Tabs | Tabs Visible Without Scrolling |
|--------|---------|-------------------------------|
| Series | 15 | ~5-6 (horizontal scroll for rest) |
| Track | 12 | ~5-6 |
| Team | 9 | ~5-6 |
| Event | 9 | ~5-6 |
| Racer | 8 | ~5-6 |
| Vehicle | 8 | ~5-6 |

**All entity profiles use horizontal-scroll tab bars** which means most tabs are off-screen on mobile. Users must scroll horizontally to discover tabs. There's no visual indicator that more tabs exist beyond the visible area.

---

## 10. Top 50 Issues

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | Three disconnected shells (Public / RaceCore / Management) with no unified navigation | Hierarchy | Critical |
| 2 | RaceCore layout has no "back to public site" link except small sidebar logo | Navigation | Critical |
| 3 | "INDEX46" label is opaque — users don't know what it means | Hierarchy | Critical |
| 4 | "RaceCore" term is never explained — users don't know what it is | Hierarchy | Critical |
| 5 | "The Outlet" label is opaque — users don't know it means stories | Hierarchy | High |
| 6 | No explanation of how Hijinx / INDEX46 / RaceCore / Outlet relate | Hierarchy | Critical |
| 7 | Mobile users have no search access from header or bottom nav | Search | Critical |
| 8 | No Vehicles directory in the INDEX46 dropdown or Directory tabs | Discovery | High |
| 9 | No Sponsors directory in the INDEX46 dropdown or Directory tabs | Discovery | High |
| 10 | No Organizations (non-sponsor) directory or discovery path | Discovery | High |
| 11 | Vehicle profile has no links to events, series, or results | Cross-Link | High |
| 12 | Team profile has no Sponsors tab | Cross-Link | High |
| 13 | Event profile has no Sponsors tab | Cross-Link | High |
| 14 | Track profile has no Sponsors tab | Cross-Link | High |
| 15 | Track profile doesn't link to Series directly | Cross-Link | Medium |
| 16 | Media profile doesn't link to covered entities | Cross-Link | Medium |
| 17 | Sponsor profile doesn't link to results or standings | Cross-Link | Medium |
| 18 | /join page is not linked from header, footer, or dashboard | Navigation | Critical |
| 19 | Dashboard invite-code prompt doesn't link to claim flow | Navigation | Critical |
| 20 | Three different claim entry points (JoinSignUp, ClaimsCenter, ProfileClaimFooter) with no clear distinction | Duplicate | High |
| 21 | "Dashboard" means three different things (user dashboard, admin dashboard, RaceCore dashboard) | Terminology | High |
| 22 | "Garage" and "Dashboard" used interchangeably for user home | Terminology | Medium |
| 23 | RaceCore sidebar uses "Drivers" while public site uses "Racers" | Terminology | High |
| 24 | No breadcrumbs on any entity profile page | Navigation | High |
| 25 | Entity profile tabs use horizontal scroll with no overflow indicator | Navigation | Medium |
| 26 | Series profile has 15 tabs — too many for users to process | Information | Medium |
| 27 | Footer "Ventures" links may lead to placeholder pages | Navigation | Medium |
| 28 | "Creative Services" appears in both Platform and Ventures footer columns | Duplicate | Low |
| 29 | Mobile bottom nav "Directory" always defaults to Racers | Navigation | Medium |
| 30 | Mobile bottom nav "Dashboard" and "Profile" require auth with no explanation | Navigation | Medium |
| 31 | RaceCore has no header bar — only sidebar navigation | Navigation | Medium |
| 32 | Management shell is separate from RaceCore but links to it | Hierarchy | Medium |
| 33 | No visual indicator of which shell (Public / RaceCore / Management) the user is in | Hierarchy | High |
| 34 | Search results capped at 4 per category with no "view all" link | Search | Medium |
| 35 | Search has no relevance ranking — results sorted by created_date | Search | Medium |
| 36 | Search doesn't include Organizations, Media Outlets, or Media Profiles | Search | Medium |
| 37 | No cross-category search discovery (search "Bark River" → track only, not events at track) | Search | Medium |
| 38 | No search history or recent searches | Search | Low |
| 39 | Entity "back" links are inconsistent — some say "← Racers", some say "← Teams", some have MobileBackHeader | Navigation | Medium |
| 40 | No "up" navigation from entity profile to its directory | Navigation | High |
| 41 | Racer profile links to team via query param (?slug=) not canonical URL | Navigation | Low |
| 42 | Team profile links to events via ?id= not canonical slug URLs | Navigation | Low |
| 43 | RaceCore sidebar has 7 groups and 20+ items — high density | Information | Medium |
| 44 | No "overview" or "summary" page for the entire platform ecosystem | Information | Medium |
| 45 | No site map or directory of all pages | Information | Low |
| 46 | ProfileClaimFooter and ClaimProfileButton both exist — inconsistent claim CTAs | Duplicate | Medium |
| 47 | OrganizationPage doesn't have a "Claim" button for non-sponsor orgs | Navigation | High |
| 48 | No way to browse all sponsors or all organizations from public navigation | Discovery | High |
| 49 | RaceCore "Records" section doesn't include Vehicles or Organizations | Information | Medium |
| 50 | No visual hierarchy distinguishing primary nav (Home, Outlet, INDEX46) from secondary nav (Apparel, Marketplace) | Hierarchy | Low |

---

## 11. Quick Wins (< 30 minutes)

1. **Add a "Back to HIJINX" header bar** to the RaceCore layout with a visible link. (15 min)
2. **Add "/join" to the footer** under a new "Get Started" column. (5 min)
3. **Add a search icon to the mobile bottom nav** or mobile menu. (15 min)
4. **Add "Sponsors" to the INDEX46 dropdown** linking to a sponsor directory. (10 min)
5. **Add "Vehicles" to the INDEX46 dropdown** linking to a vehicle directory. (10 min)
6. **Rename "INDEX46" to "Motorsports"** in the header nav (or add a tooltip). (5 min)
7. **Rename "The Outlet" to "Stories"** in the header nav. (5 min)
8. **Remove duplicate "Creative Services"** from footer Ventures column. (2 min)
9. **Add a "← Back to Directory" link** on all entity profile pages. (15 min)
10. **Standardize entity back-link labels** — use "← Racers" / "← Teams" / "← Series" / "← Tracks" / "← Events" consistently. (10 min)

---

## 12. Medium Improvements

1. **Unify the three shells** with a consistent header that shows which shell the user is in (Public / RaceCore / Management) and provides a clear way to switch.
2. **Add breadcrumbs to all entity profile pages** showing: Home → Directory → Entity Type → Entity Name.
3. **Add a "Sponsors" tab** to Team, Event, Track, and Vehicle profiles.
4. **Add an "Events" tab** to Vehicle profiles (showing events the vehicle participated in).
5. **Add a "Series" tab** to Track and Vehicle profiles.
6. **Add a "Covered Entities" section** to Media profiles.
7. **Add a "Results" and "Standings" section** to Sponsor profiles (linking to sponsored racers' results).
8. **Create a unified claim flow** — consolidate JoinSignUp, ClaimsCenter, and ProfileClaimFooter into one coherent journey with clear distinction between "claim existing" and "create new."
9. **Add a "View all results" link** to global search (currently capped at 4 per category).
10. **Add search relevance ranking** — prioritize by popularity, trending score, or match quality.
11. **Add Organizations, Media Outlets, and Media Profiles to global search.**
12. **Add an overflow indicator** to horizontal-scroll tab bars (e.g., fade gradient on the right edge).
13. **Add a "back to public site" link** to the Management layout header.
14. **Add a visual shell indicator** — a subtle label or color change showing whether the user is in Public, RaceCore, or Management.
15. **Consolidate the Series profile tabs** — 15 tabs is too many. Group related tabs (e.g., "Records & Champions" as one tab, "History & Timeline" as one tab).

---

## 13. Long-term Improvements

1. **Unified platform shell.** Create a single layout that adapts to the user's context (anonymous fan, claimed entity owner, admin) with consistent navigation, breadcrumbs, and shell indicators. Eliminate the three separate shells.
2. **Entity relationship graph.** Add a visual "relationship explorer" to entity profiles showing how entities connect (e.g., a racer's network of teams, series, events, sponsors displayed as a graph or tree).
3. **Global information architecture.** Redesign the header nav to clearly communicate the platform structure: Hijinx (brand) → Browse (Directory, Stories, Media) → Participate (Join, Claim, Register) → Manage (RaceCore, Profile).
4. **Personalized navigation.** Show different navigation based on user type: fans see browse-first nav, entity owners see manage-first nav, admins see admin-first nav.
5. **Cross-entity search.** Allow search to return related entities (search "Bark River" → track + events at track + racers who raced there).
6. **Navigation history.** Add "recently viewed" or "breadcrumb trail" showing the user's path through the entity graph.
7. **Platform overview page.** Create a page that explains the Hijinx / INDEX46 / RaceCore / Outlet ecosystem and how they relate.
8. **Consistent URL scheme.** Standardize all entity URLs to use /entity-type/slug (currently mixed: /racers/:slug, /TeamProfile?slug=, /EventProfile?id=, /organization/:type/:id).

---

## 14. Launch Blockers

1. **RaceCore has no clear "back to public site" navigation.** Users who enter RaceCore from the dashboard "Race Core" button are in a different shell with no clear way back except the small sidebar logo. This is a navigation dead end for first-time entity owners. **Must fix before launch.**
2. **Mobile users have no search.** Search is the most powerful navigation tool but is desktop-only. **Must fix before launch.**
3. **No way to discover Sponsors or Organizations from public navigation.** Sponsors are a key entity type but have no directory entry point. **Must fix before launch.**
4. **/join is not navigable from any primary navigation.** The claim flow is a core user journey but is only accessible via direct URL. **Must fix before launch.**
5. **Platform hierarchy is unexplained.** Users don't know what INDEX46, RaceCore, or The Outlet are, or how they relate. **Must fix before launch.**

---

## 15. Overall Score

| Category | Score (0-10) |
|----------|-------------|
| Navigation | 5.0 |
| Information Architecture | 5.5 |
| Discoverability | 5.5 |
| Cross Linking | 6.5 |
| Hierarchy | 3.5 |
| Entity Relationships | 7.0 |
| Search Navigation | 5.5 |
| Mobile Navigation | 4.5 |
| Desktop Navigation | 6.0 |
| Dashboard Navigation | 6.0 |
| Overall IA | 5.0 |

**Weighted Overall Score: 54 / 100**

### Score Justification

**Navigation (5.0):** The public header nav works but uses opaque labels. Mobile nav lacks search. RaceCore is a separate shell with minimal back-linking. No breadcrumbs. Inconsistent back-link patterns across entity pages.

**Information Architecture (5.5):** The entity model is deep and well-connected, but the three-shell architecture (Public / RaceCore / Management) fragments the experience. Information is grouped logically within each shell but the shells don't connect coherently.

**Discoverability (5.5):** Most entities are discoverable via the Directory, but Vehicles, Sponsors, and Organizations have gaps. Search is powerful but desktop-only. The /join flow is not discoverable from primary navigation.

**Cross Linking (6.5):** Entity profiles cross-link well to most related entities (especially Series with 15 tabs). But Vehicle, Team, Track, and Event profiles are missing sponsor links. Vehicle has the weakest cross-linking.

**Hierarchy (3.5):** The platform's biggest IA weakness. Three names (Hijinx / INDEX46 / RaceCore) are never explained. Users don't know which shell they're in or how the parts relate. No overview or orientation page exists.

**Entity Relationships (7.0):** The strongest area. The entity model is comprehensive and well-connected. The backend experience functions provide rich relationship data. Cross-linking within profiles is generally good.

**Search Navigation (5.5):** Powerful when available (9 categories, grouped results) but desktop-only, no ranking, no "view all," and missing several entity types.

**Mobile Navigation (4.5):** Bottom nav has only 4 tabs, no search, and two tabs require auth with no explanation. Mobile menu duplicates desktop nav but doesn't add search.

**Desktop Navigation (6.0):** Header nav with hover dropdowns works well. Search is accessible. But opaque labels and missing entries (Sponsors, Vehicles, Join) limit effectiveness.

**Dashboard Navigation (6.0):** Dashboard is well-structured for returning users but doesn't guide new users to the claim flow. The "Race Core" and "Edit" buttons are unclear to first-time entity owners.

**Overall IA (5.0):** The platform has a strong foundation but fragmented navigation, unexplained hierarchy, and incomplete discoverability prevent it from being intuitive. The three-shell architecture is the core structural problem — users experience the platform as three separate products rather than one cohesive ecosystem.

---

*End of audit. This report is read-only. No code was modified, no files were created (other than this report), no data was written.*