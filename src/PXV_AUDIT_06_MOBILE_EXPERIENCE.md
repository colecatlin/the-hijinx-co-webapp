# PXV_AUDIT_06_MOBILE_EXPERIENCE

**Audit Type:** Read-only human experience audit — mobile experience & race weekend usability  
**Date:** 2026-08-11  
**Scope:** Complete race weekend (Friday–Sunday) on a smartphone-only basis, across 10 personas, covering every mobile surface, navigation pattern, touch interaction, form, entity profile, RaceCore, and operational workflow  
**Methodology:** Walked every persona through a full race weekend on a hypothetical phone, reading mobile-specific components (MobileBottomNav, MobileBackHeader, PullToRefresh, useAndroidBackButton), evaluating touch targets, safe areas, sticky controls, tab scrolling, form usability, RaceCore mobile drawer, and offline resilience  
**Constraint:** Judge the platform as if it must support an entire race weekend from a phone. No desktop. No tablet.  

---

## 1. Executive Summary

The Hijinx platform has **deliberate mobile engineering** — safe-area insets, 44px touch target enforcement, pull-to-refresh, Android back-button handling, table-to-card conversion, and a native-style tab keep-alive system. These are not accidental; they show that mobile was a conscious design consideration. The bottom navigation, mobile back headers, and hamburger drawer are well-built.

**However, the platform is not truly usable for a full race weekend on a phone.** The gap between "mobile-friendly" and "mobile-first race weekend tool" is significant:

1. **Search is invisible on mobile.** The search icon is `hidden lg:flex` — it only appears on desktop. On mobile, the most powerful discovery tool is completely inaccessible. A fan at a track who wants to find a racer's profile has no way to search.

2. **RaceCore is desktop-first.** The mobile drawer works, but the operational panels (Entries, Results, Standings, Grid, Race Control) are dense table-based interfaces designed for wide screens. A series official trying to manage entries or post results on a phone will struggle with horizontal scrolling, tiny touch targets, and information overload.

3. **Entity profiles have too many tabs for mobile.** Series has 15 tabs, Track has 12, Event has 9, Team has 9. On mobile, these become horizontal-scroll strips with no overflow indicator. Users can't see all tabs at once and must scroll to discover what's available. The active tab is easy to lose when scrolling.

4. **No sticky tab bars on entity profiles.** When a user scrolls down a long racer profile, the tab bar scrolls away. To switch tabs, they must scroll all the way back up. SeriesNavigation is sticky (`sticky top-16`) but most entity profile tab bars are not.

5. **Forms are not mobile-optimized.** The claim forms, profile editing, and onboarding wizard use standard inputs that work on mobile but don't optimize for the small screen. No input type hints (tel, url), no keyboard hints, no field grouping for mobile.

6. **No offline resilience.** Race tracks have notoriously bad Wi-Fi. The platform makes no visible effort to cache data, queue uploads, or degrade gracefully on poor connections. Every page transition requires a fresh API call.

7. **No race weekend mode.** There's no "I'm at this event" mode that pins the current event, shows the schedule, and provides quick access to entries, results, and media. Users must navigate manually through multiple pages.

8. **Tables are problematic on mobile.** While globals.css converts tables to stacked cards on `max-width: 640px`, this conversion is generic — it doesn't use entity-specific labels, and RaceCore tables (entries, results, standings) may not convert well because they're built with custom components, not standard `<table>` elements.

**Despite these issues, the mobile foundation is solid.** The bottom nav, back headers, pull-to-refresh, safe areas, and touch target enforcement are excellent. The platform is mobile-friendly — it renders and functions on a phone. But it's not mobile-first for race weekend operations. A fan can browse profiles; a series official cannot manage an event.

---

## 2. Overall Mobile Score

| Category | Score (0-10) | Weight |
|----------|-------------|--------|
| Mobile Navigation | 6.0 | 10% |
| Touch Experience | 6.5 | 10% |
| Search | 2.0 | 8% |
| Forms | 5.5 | 8% |
| Profiles | 6.0 | 10% |
| RaceCore | 4.0 | 10% |
| Management | 3.5 | 5% |
| Performance Perception | 6.0 | 8% |
| Uploads | 5.0 | 5% |
| Accessibility | 6.5 | 5% |
| Race Weekend Usability | 4.5 | 11% |
| Overall Mobile Experience | 5.0 | 10% |

**Weighted Overall Score: 53 / 100**

---

## 3. Race Weekend Walkthroughs

### 3.1 Friday — Arrival

| Task | Mobile Experience | Score |
|------|------------------|-------|
| Search event | ❌ Search not available on mobile — must browse Directory or use bottom nav | 1/10 |
| Check schedule | ⚠️ Event profile has a Schedule tab but no "today" filter or "my event" pin | 4/10 |
| Find track | ⚠️ Can navigate to Track profile via Event, but no map integration on mobile | 5/10 |
| Find racers | ⚠️ Can browse Entry List on Event profile, but cards are small | 5/10 |
| Check entries | ⚠️ Event Entries tab works, but no class filter persistence on mobile | 5/10 |
| Claim profile | ⚠️ ClaimProfileButton works on mobile, but dialog is desktop-sized | 4/10 |
| Upload media | ❌ No mobile upload path visible — Media Portal is desktop-first | 2/10 |
| Register | ❌ Registration/RaceCore is desktop-first — mobile drawer is hard to use | 3/10 |
| View notifications | ❌ No notification system visible on mobile | 1/10 |

**Friday verdict: 3.3/10** — A fan can find basic information, but operational tasks (registration, uploads, notifications) are nearly impossible on mobile.

### 3.2 Saturday — Qualifying

| Task | Mobile Experience | Score |
|------|------------------|-------|
| Browse results | ⚠️ Results tab on Event profile works, but tables are hard to read on mobile | 4/10 |
| Search racers | ❌ No search on mobile | 1/10 |
| Read media | ⚠️ Media tab works, Outlet stories are readable on mobile | 6/10 |
| View standings | ⚠️ Standings tab works, but tables are dense on mobile | 4/10 |
| Check schedule | ⚠️ Same as Friday — no "today" filter | 4/10 |
| Upload photos | ❌ No mobile upload path | 2/10 |
| Share links | ✅ SocialShareButtons work on mobile | 7/10 |

**Saturday verdict: 4.0/10** — Browsing is possible, but active participation (uploading, searching) is blocked.

### 3.3 Sunday — Race Day

| Task | Mobile Experience | Score |
|------|------------------|-------|
| Results | ⚠️ Results appear on Event profile but are slow to load and hard to read | 4/10 |
| Podiums | ❌ No podium view on mobile | 2/10 |
| Standings | ⚠️ Standings tables are dense and require horizontal scrolling | 4/10 |
| Media | ⚠️ Media gallery works but images may be large on slow connections | 5/10 |
| Statistics | ⚠️ Statistics tabs work but charts are not mobile-optimized | 4/10 |
| Leave event | ✅ Can navigate away using bottom nav or back button | 7/10 |
| Continue exploring | ⚠️ Can browse but search is unavailable | 3/10 |

**Sunday verdict: 4.1/10** — Post-race browsing works, but the core race-day experience (live results, podiums, standings) is not mobile-optimized.

### 3.4 Race Weekend Overall: 3.8/10

The platform is **not ready for a full race weekend on mobile.** A fan can passively browse, but active participation (search, upload, register, manage) is severely limited.

---

## 4. Persona Analysis

### 4.1 Fan

**Can they use the platform on mobile?** Partially. Can browse profiles, read stories, view media. Cannot search (no search on mobile), cannot upload, cannot register for events.

**Race weekend usability:** 4/10 — passive browsing only

### 4.2 Racer

**Can they use the platform on mobile?** Partially. Can view their profile, check schedule, see results. Cannot claim profile easily (dialog is desktop-sized), cannot upload media, cannot manage their profile.

**Race weekend usability:** 3/10 — mostly passive, management tasks blocked

### 4.3 Crew Chief

**Can they use the platform on mobile?** No. RaceCore is desktop-first. Entries, results, and grid management require wide tables and precise interactions. The mobile drawer provides navigation but the panels themselves are not mobile-optimized.

**Race weekend usability:** 2/10 — RaceCore is nearly unusable on mobile

### 4.4 Team Owner

**Can they use the platform on mobile?** Partially. Can view team profile, check schedule, see roster. Cannot manage team (RaceCore desktop-first), cannot add sponsors (no sponsors tab), cannot manage roster on mobile.

**Race weekend usability:** 3/10 — viewing works, management doesn't

### 4.5 Series Official

**Can they use the platform on mobile?** No. RaceCore operations (entries, results, standings, race control, compliance) are all desktop-first table interfaces. The mobile drawer provides access but the panels are not usable on a phone.

**Race weekend usability:** 1/10 — RaceCore is not mobile-operational

### 4.6 Track Staff

**Can they use the platform on mobile?** Partially. Can view track profile, check schedule. Cannot manage events, cannot post results, cannot manage media on mobile.

**Race weekend usability:** 3/10 — viewing works, operations don't

### 4.7 Photographer

**Can they use the platform on mobile?** Poorly. Can view media gallery, but cannot upload photos (Media Portal is desktop-first), cannot tag entities, cannot submit assets for review. The most critical task — uploading photos from the track — is not mobile-optimized.

**Race weekend usability:** 2/10 — upload is the core task and it's blocked

### 4.8 Media Reporter

**Can they use the platform on mobile?** Partially. Can read stories, view media. Cannot submit stories (Writer Workspace is desktop-first), cannot manage assignments, cannot file from the track.

**Race weekend usability:** 3/10 — reading works, writing doesn't

### 4.9 Sponsor Representative

**Can they use the platform on mobile?** Partially. Can view sponsor profile, see entity grids. Cannot view analytics (ManageSponsorAnalytics is desktop-first), cannot manage activations, cannot view deliverables on mobile.

**Race weekend usability:** 4/10 — viewing works, management doesn't

### 4.10 First-Time Visitor

**Can they use the platform on mobile?** Yes, for browsing. The homepage, entity profiles, and stories are readable on mobile. But they can't search (no search on mobile), and the Join page works but the onboarding wizard is not mobile-optimized.

**Race weekend usability:** 5/10 — best served by mobile, but search gap hurts

---

## 5. Navigation Audit

### 5.1 Bottom Navigation

**Strengths:**
- ✅ 4 tabs (Home, Directory, Dashboard, Profile) — appropriate count
- ✅ Safe-area-inset-bottom padding — clears iOS home indicator
- ✅ Double-tap to reset to root — native mobile gesture
- ✅ Active state with motion teal + glow — clear visual feedback
- ✅ Tab keep-alive preserves scroll position across tab switches
- ✅ `lg:hidden` — only shows on mobile

**Weaknesses:**
- ❌ **No Search tab** — the most critical mobile tool is missing
- ❌ **No RaceCore access** — operational users have no quick path to RaceCore
- ❌ **No Notifications** — no bell icon, no notification badge
- ⚠️ Directory tab links to `/DriverDirectory` (racers only) — not the full Directory

### 5.2 Header

**Strengths:**
- ✅ Glass effect with blur — premium mobile feel
- ✅ Safe-area-inset-top padding — clears iOS notch
- ✅ Hamburger menu for mobile nav
- ✅ Cart icon accessible
- ✅ Theme toggle accessible

**Weaknesses:**
- ❌ **Search icon is `hidden lg:flex`** — invisible on mobile
- ❌ **Admin Tools link is `hidden lg:block`** — admins can't access Management from mobile header
- ❌ **Login button is `hidden lg:block`** — login is only in hamburger menu on mobile
- ⚠️ Dropdown menus (INDEX46 sub-nav) are hover-based (`onMouseEnter`) — doesn't work on touch devices

### 5.3 Hamburger Menu

**Strengths:**
- ✅ Slide-in animation from right
- ✅ Full nav items with sub-menus
- ✅ Dashboard, Profile, Sign Out links for authenticated users
- ✅ Management link for admins

**Weaknesses:**
- ⚠️ Sub-menus are expanded by default — long list to scroll
- ⚠️ No search in hamburger menu
- ⚠️ No quick actions (claim, upload, etc.)

### 5.4 Back Behavior

**Strengths:**
- ✅ MobileBackHeader on entity profiles — left-aligned back arrow, centered title
- ✅ History-aware navigation (`navigate(-1)` if history exists)
- ✅ Non-sticky to avoid collision with global header
- ✅ `lg:hidden` — only shows on mobile
- ✅ Android back-button handling with sentinel history entry

**Weaknesses:**
- ⚠️ Not all entity profiles have MobileBackHeader (Team, Vehicle, Sponsor don't)
- ⚠️ No breadcrumb trail on mobile — users can lose context in deep navigation
- ⚠️ Back from RaceCore goes to public site — no "back to RaceCore" when navigating to an entity from RaceCore

### 5.5 Deep Linking

**Strengths:**
- ✅ Slug-based URLs for all entity types (`/racers/:slug`, `/series/:slug`, etc.)
- ✅ Shareable links
- ✅ SocialShareButtons work on mobile

**Weaknesses:**
- ⚠️ No "back to where I was" preservation when deep-linking from search or notifications
- ⚠️ RaceCore deep links require auth — no graceful mobile redirect

### 5.6 Scrolling & Sticky Controls

**Strengths:**
- ✅ Overscroll-behavior-y: none — prevents rubber-banding
- ✅ SeriesNavigation is sticky (`sticky top-16`)
- ✅ Bottom nav is fixed (always visible)

**Weaknesses:**
- ❌ **Most entity profile tab bars are NOT sticky** — they scroll away
- ❌ **No "back to top" button** on long pages
- ❌ **No sticky action bar** on entity profiles (claim, share, edit)
- ⚠️ Long pages (Series with 15 tabs, Track with 12) require excessive scrolling

### 5.7 Landscape Behavior

- ❌ No landscape-specific handling
- ⚠️ RaceCore tables might benefit from landscape but no orientation guidance
- ⚠️ No "rotate for better experience" prompt on RaceCore

### 5.8 Navigation Score: 6.0/10

Navigation is **well-engineered at the chrome level** (bottom nav, back header, safe areas) but **broken at the discovery level** (no search on mobile).

---

## 6. Touch Audit

### 6.1 Touch Targets

**Strengths:**
- ✅ `globals.css` enforces 44px min touch targets on `pointer: coarse` devices
- ✅ Bottom nav tabs are full-width with `py-2.5` — comfortable tap zone
- ✅ MobileBackHeader back button is `w-10 h-10` (40px) — close to 44px
- ✅ Hamburger menu items have `py-3` — comfortable

**Weaknesses:**
- ⚠️ Entity profile tabs are `py-3` with `text-sm` — border is thin, tap zone is narrow
- ⚠️ Series Racer Roster cards have small links — could be larger
- ⚠️ EventRacerCard is `p-3` — compact but tappable
- ⚠️ Some inline links in body text are small and close together

### 6.2 Button Spacing

- ✅ Bottom nav tabs are evenly spaced with `flex-1`
- ⚠️ Header actions (theme toggle, search, login, cart) are `gap-2` — close together but acceptable
- ⚠️ Entity profile action buttons (claim, share, edit) are small and close

### 6.3 Accidental Taps

- ⚠️ Hamburger menu sub-items are close together — could cause accidental taps
- ⚠️ Tab bar tabs are close together — could hit wrong tab
- ⚠️ No swipe-to-go-back gesture (unlike native iOS apps)

### 6.4 Swipe Behavior

- ✅ PullToRefresh works — resistance-based pull, non-blocking
- ⚠️ No swipe-between-tabs gesture
- ⚠️ No swipe-to-dismiss on cards or modals
- ⚠️ No swipe-to-delete on list items

### 6.5 Tables on Mobile

- ✅ `globals.css` converts `<table>` to stacked cards on `max-width: 640px`
- ⚠️ Conversion uses `data-label` attributes — not all tables include them
- ❌ RaceCore tables use custom components, not `<table>` — may not convert
- ❌ Standings tables are dense — conversion may not be readable

### 6.6 Charts on Mobile

- ⚠️ Recharts charts are responsive but may be too small on mobile
- ⚠️ No chart-specific mobile treatment (simplified views, key statistics)
- ⚠️ Trend charts in Sponsor Analytics may not be readable on mobile

### 6.7 Image Galleries

- ⚠️ PublicMediaGallery works on mobile but no swipe gesture
- ⚠️ No lightbox/fullscreen view on mobile
- ⚠️ Images may be large on slow connections

### 6.8 Touch Score: 6.5/10

Touch targets are **adequate thanks to the 44px enforcement**, but gestures, spacing, and table conversion need work.

---

## 7. Forms Audit

### 7.1 Registration (JoinSignUp)

**Mobile-friendly aspects:**
- ✅ Full-width inputs
- ✅ Clear labels with mono tracking
- ✅ Enter key submits on info fields
- ✅ Progressive disclosure (entity → info → check → results)

**Mobile-unfriendly aspects:**
- ⚠️ No input type hints (tel, url, email)
- ⚠️ No autocomplete attributes
- ⚠️ Keyboard may cover the submit button
- ⚠️ No field grouping for mobile

### 7.2 Claims (ClaimsCenter)

**Mobile-friendly aspects:**
- ✅ Entity type buttons are tappable
- ✅ Search input is full-width
- ✅ Results list is tappable
- ✅ Dispute reason buttons are full-width

**Mobile-unfriendly aspects:**
- ⚠️ Textarea for justification is small (4 rows) — hard to type on mobile
- ⚠️ No evidence upload from mobile (no file picker)
- ⚠️ Dialog may not be mobile-optimized

### 7.3 Profile Editing

**Mobile-friendly aspects:**
- ✅ Standard inputs work
- ✅ shadcn/ui components are responsive

**Mobile-unfriendly aspects:**
- ⚠️ RacerProfileOwnerEditor may be complex on mobile
- ⚠️ No save/cancel sticky bar
- ⚠️ No autosave indicator

### 7.4 Media Upload

- ❌ No mobile-optimized upload path visible
- ❌ Media Portal is desktop-first
- ❌ No camera integration
- ❌ No batch upload from mobile

### 7.5 Search

- ❌ Not available on mobile (hidden on `lg:flex`)
- ❌ When available (desktop), results are in a dropdown — not mobile-friendly

### 7.6 Login

- ✅ Platform-managed login is mobile-responsive
- ⚠️ Redirect flow may lose context on mobile

### 7.7 Forms Score: 5.5/10

Forms are **functional but not mobile-optimized.** The biggest gap is media upload — no path exists for mobile users to upload photos.

---

## 8. Profile Audit

### 8.1 Racer Profile on Mobile

- ✅ Hero is readable (380px height, photo + name)
- ✅ Tabs work (horizontal scroll)
- ✅ Overview, Career, Timeline, Stats, Achievements, Schedule, Media, Sponsors
- ⚠️ 8 tabs require horizontal scrolling on mobile — no overflow indicator
- ❌ Tab bar not sticky — scrolls away
- ⚠️ Statistics charts may be small
- ⚠️ Career timeline is long — no jump-to-year
- ⚠️ Media gallery has no swipe

### 8.2 Team Profile on Mobile

- ✅ Hero readable
- ⚠️ 9 tabs — even more scrolling
- ❌ No MobileBackHeader
- ❌ No sponsors tab
- ⚠️ Roster cards are small

### 8.3 Vehicle Profile on Mobile

- ⚠️ 8 tabs
- ❌ No MobileBackHeader
- ❌ Dead end — no links to events/series/results

### 8.4 Track Profile on Mobile

- ✅ MobileBackHeader present
- ⚠️ 12 tabs — excessive on mobile
- ✅ Map tab works (react-leaflet is mobile-responsive)
- ⚠️ Gallery has no swipe

### 8.5 Series Profile on Mobile

- ✅ MobileBackHeader present
- ❌ 15 tabs — far too many for mobile
- ⚠️ SeriesNavigation is sticky (good) but `px-6` may be too wide for mobile
- ⚠️ Standings tables are dense

### 8.6 Event Profile on Mobile

- ✅ MobileBackHeader present
- ⚠️ 9 tabs
- ⚠️ Entry list cards are small
- ⚠️ Results tables are dense
- ❌ No "today's schedule" mobile view

### 8.7 Sponsor Profile on Mobile

- ✅ Sidebar layout may adapt to top tabs on mobile
- ⚠️ 14 sections — long scroll on mobile
- ⚠️ Entity grid cards are small

### 8.8 Organization Profile on Mobile

- ⚠️ Same as Sponsor for sponsor-type orgs
- ❌ Non-sponsor orgs are invisible

### 8.9 Profile Score: 6.0/10

Profiles are **readable on mobile** but suffer from too many tabs, non-sticky tab bars, and dense content that requires excessive scrolling.

---

## 9. RaceCore Audit

### 9.1 Mobile Access

- ✅ Mobile hamburger header strip (h-11) with "RACECORE" label
- ✅ Drawer slides in from left (224px wide)
- ✅ Backdrop overlay to close
- ✅ Drawer closes on route change

### 9.2 Operational Panels on Mobile

| Panel | Mobile Usability | Score |
|-------|------------------|-------|
| Dashboard | ⚠️ Cards may be too small | 4/10 |
| Entries | ❌ Table-based, horizontal scroll | 2/10 |
| Results | ❌ Table-based, dense | 2/10 |
| Standings | ❌ Table-based, dense | 2/10 |
| Schedule | ⚠️ List view, acceptable | 5/10 |
| Race Control | ❌ Dense, multi-column | 1/10 |
| Compliance | ⚠️ List-based, acceptable | 4/10 |
| Check-in | ⚠️ Search + list, acceptable | 5/10 |
| Media | ❌ Desktop-first management | 2/10 |
| Settings | ⚠️ Form-based, acceptable | 4/10 |
| Grid | ❌ Visual lineup, needs width | 2/10 |
| Closeout | ⚠️ Checklist, acceptable | 4/10 |

### 9.3 RaceCore Mobile Verdict

**RaceCore is not usable on mobile for operational tasks.** The mobile drawer provides navigation, but the panels themselves are desktop-first. A series official or crew chief cannot manage entries, post results, or control race operations from a phone. The tables require horizontal scrolling, the touch targets are too small, and the information density is overwhelming on a small screen.

### 9.4 RaceCore Score: 4.0/10

---

## 10. Performance Perception

### 10.1 Loading States

- ✅ Skeleton loaders on entity profiles (Racer, Team, Series, Track, Event, Vehicle)
- ✅ BurnoutSpinner on RaceCore
- ✅ Loader2 spinners on forms and buttons
- ✅ Page transition animations (framer-motion AnimatePresence)

### 10.2 Image Loading

- ⚠️ No lazy loading visible in code
- ⚠️ No progressive image loading
- ⚠️ No image size optimization for mobile
- ⚠️ Large hero images may be slow on track Wi-Fi

### 10.3 Transitions

- ✅ Page transitions are smooth (opacity + y)
- ✅ Tab transitions on MotorsportsHome
- ✅ Drawer animations on RaceCore and hamburger menu
- ⚠️ No skeleton-to-content transition (content pops in)

### 10.4 Scrolling

- ✅ Overscroll-behavior-y: none — no bounce
- ✅ Scrollbar-hide utility for tab bars
- ⚠️ No virtual scrolling for long lists (entries, results)
- ⚠️ Long pages (Series 15 tabs) may cause scroll fatigue

### 10.5 Refresh

- ✅ PullToRefresh on MyDashboard
- ⚠️ Not on entity profiles or RaceCore
- ⚠️ No auto-refresh on race day

### 10.6 Performance Score: 6.0/10

Loading states are **good** but image optimization and refresh patterns need work.

---

## 11. Accessibility

### 11.1 Contrast

- ✅ Dark theme: excellent contrast (F5F5F5 on 050B0B ≈ 18:1)
- ✅ Light theme: excellent contrast (131314 on F7F5F2 ≈ 16:1)
- ⚠️ Foreground-quiet on canvas (8C8C8C on 050B0B ≈ 5.5:1) — borderline for small text
- ⚠ Entity profiles use hardcoded gray-400 on gray-50 — may not meet WCAG AA

### 11.2 Touch Targets

- ✅ 44px enforcement on `pointer: coarse` devices
- ✅ Bottom nav tabs are large enough
- ⚠️ Some inline links and small buttons may be below 44px

### 11.3 Zoom

- ✅ No zoom-blocking viewport meta tag visible
- ⚠️ Text at 9-10px (mono labels) may be unreadable when zoomed

### 11.4 Keyboard

- ⚠️ No visible focus indicators on custom buttons
- ⚠️ Tab order may not be logical on complex pages
- ⚠️ No skip-to-content link

### 11.5 Screen Reader

- ⚠️ Bottom nav has `aria-label="Mobile bottom navigation"`
- ⚠️ Back button has `aria-label="Go back"`
- ❌ No ARIA labels on tab bars
- ❌ No ARIA labels on form inputs (uses `<Label>` but not `htmlFor`)
- ❌ No live regions for dynamic content updates

### 11.6 Orientation

- ✅ No orientation lock
- ⚠️ No landscape-specific layouts

### 11.7 Accessibility Score: 6.5/10

Accessibility is **adequate for basic navigation** but lacking for complex interactions and screen reader support.

---

## 12. Top 50 Mobile Issues

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | Search is invisible on mobile (`hidden lg:flex`) | Navigation | Critical |
| 2 | RaceCore panels are desktop-first tables | RaceCore | Critical |
| 3 | No mobile media upload path | Uploads | Critical |
| 4 | No notifications on mobile | Navigation | Critical |
| 5 | Series has 15 tabs — too many for mobile | Profiles | High |
| 6 | Entity profile tab bars are not sticky | Navigation | High |
| 7 | No "race weekend mode" or "my event" pin | Race Weekend | High |
| 8 | No offline resilience for poor track Wi-Fi | Performance | High |
| 9 | No search tab in bottom nav | Navigation | High |
| 10 | No RaceCore access from bottom nav | Navigation | High |
| 11 | Dropdown menus are hover-based (don't work on touch) | Navigation | High |
| 12 | Admin Tools link hidden on mobile | Navigation | High |
| 13 | Login button hidden in header on mobile | Navigation | Medium |
| 14 | No "today" filter on event schedule | Race Weekend | High |
| 15 | No podium view on mobile | Race Weekend | Medium |
| 16 | No live results view on mobile | Race Weekend | High |
| 17 | Tables don't convert well (custom components, not `<table>`) | Touch | High |
| 18 | No swipe gestures for galleries | Touch | Medium |
| 19 | No swipe-between-tabs gesture | Touch | Low |
| 20 | No "back to top" button on long pages | Navigation | Medium |
| 21 | No sticky action bar on entity profiles | Navigation | Medium |
| 22 | Team profile has no MobileBackHeader | Navigation | Medium |
| 23 | Vehicle profile has no MobileBackHeader | Navigation | Medium |
| 24 | Sponsor profile has no MobileBackHeader | Navigation | Medium |
| 25 | No landscape guidance for RaceCore | Navigation | Low |
| 26 | No chart-specific mobile treatment | Touch | Medium |
| 27 | No image lazy loading | Performance | Medium |
| 28 | No progressive image loading | Performance | Medium |
| 29 | No auto-refresh on race day | Performance | Medium |
| 30 | PullToRefresh only on MyDashboard | Performance | Medium |
| 31 | No virtual scrolling for long lists | Performance | Medium |
| 32 | No camera integration for uploads | Uploads | High |
| 33 | No batch upload from mobile | Uploads | High |
| 34 | Claim dialog is desktop-sized | Forms | Medium |
| 35 | No input type hints on forms | Forms | Low |
| 36 | No autocomplete attributes on forms | Forms | Low |
| 37 | Keyboard may cover submit buttons | Forms | Medium |
| 38 | No ARIA labels on tab bars | Accessibility | Medium |
| 39 | No ARIA labels on form inputs | Accessibility | Medium |
| 40 | No live regions for dynamic updates | Accessibility | Medium |
| 41 | No skip-to-content link | Accessibility | Low |
| 42 | No visible focus indicators on custom buttons | Accessibility | Medium |
| 43 | 9-10px mono labels may be unreadable when zoomed | Accessibility | Low |
| 44 | Directory tab links to racers only, not full Directory | Navigation | Medium |
| 45 | No "recently viewed" on mobile | Navigation | Low |
| 46 | No mobile-optimized podium or results view | Race Weekend | High |
| 47 | RaceCore drawer is 224px — may be narrow for some content | RaceCore | Low |
| 48 | No "rotate for better experience" prompt on RaceCore | Navigation | Low |
| 49 | No mobile-specific onboarding tour | Onboarding | Medium |
| 50 | No haptic feedback on key actions | Touch | Low |

---

## 13. Quick Wins

1. **Add Search to mobile header and bottom nav** — make the search icon visible on mobile (`flex lg:hidden` or always visible) and add a Search tab to the bottom nav. (30 min)
2. **Make entity profile tab bars sticky** — add `sticky top-16 z-30` to tab bar containers on Racer, Team, Vehicle, Event profiles. (30 min)
3. **Add "back to top" button on long pages** — a floating button that appears after scrolling. (20 min)
4. **Add MobileBackHeader to Team, Vehicle, Sponsor profiles** — consistent back navigation. (30 min)
5. **Add PullToRefresh to entity profiles** — not just MyDashboard. (30 min)
6. **Add `htmlFor` attributes to form labels** — improve screen reader support. (20 min)
7. **Add `aria-label` to tab bars** — improve screen reader navigation. (20 min)
8. **Make dropdown menus tap-friendly** — replace hover-based dropdowns with tap-based on mobile. (1 hour)
9. **Add input type hints** — `type="tel"`, `type="url"`, `type="email"` on appropriate fields. (20 min)
10. **Add "today" filter on event schedule** — highlight today's sessions on mobile. (30 min)

---

## 14. Medium Improvements

1. **Create a mobile-optimized RaceCore view** — simplified panels with key actions only (add entry, post result, view standings). Not the full desktop interface. (1 week)
2. **Add mobile media upload** — camera integration, batch upload, progress indicators, offline queue. (3-4 days)
3. **Create a "Race Weekend Mode"** — pin the current event, show today's schedule, quick access to entries/results/media. (3-4 days)
4. **Add notifications** — bell icon in header, notification panel, push for claim status changes and race results. (3-4 days)
5. **Consolidate entity profile tabs** — merge similar tabs (Records+Champions, Timeline+History) to reduce tab count. (2-3 days)
6. **Add swipe gestures** — swipe between tabs, swipe to dismiss modals, swipe galleries. (2-3 days)
7. **Add image lazy loading and progressive loading** — reduce data usage on mobile. (1 day)
8. **Add offline resilience** — cache entity data, queue uploads, show cached data when offline. (1 week)
9. **Create mobile-optimized table component** — replace custom table components with a mobile-aware table that converts to cards properly. (3-4 days)
10. **Add auto-refresh on race day** — poll for new results every 30 seconds on event pages. (1 day)
11. **Add mobile podium view** — visual podium with photos and positions. (1 day)
12. **Add mobile live results view** — simplified, scrolling, auto-updating results. (1 day)

---

## 15. Major Improvements

1. **Mobile-first RaceCore redesign.** The current RaceCore is desktop-first. A mobile-first version would have simplified panels, large touch targets, voice input for results, and offline-first architecture. This is the single biggest mobile improvement needed. (2-3 weeks)

2. **Progressive Web App (PWA) with offline support.** Service worker caching, offline data storage, background sync for uploads, and push notifications. This would make the platform usable at tracks with no Wi-Fi. (2-3 weeks)

3. **Native mobile app (iOS/Android).** The platform already has Android back-button handling and WebView compatibility code. A native wrapper with camera integration, push notifications, and offline storage would transform the race weekend experience. (3-4 weeks)

4. **Mobile-optimized media pipeline.** Camera integration, batch upload, auto-tagging with event/racer detection, offline queue, and progressive upload. This would make the photographer persona viable on mobile. (2-3 weeks)

5. **Race weekend companion mode.** A special mobile mode activated during race weekends that pins the event, shows a daily schedule, provides quick access to entries/results/media, and sends push notifications for key moments (qualifying results, race start, podium). (2-3 weeks)

---

## 16. Launch Blockers

1. **Search is invisible on mobile.** The most critical discovery tool is completely inaccessible on phones. A fan at a track cannot search for a racer. **Must fix before launch** — make search visible on mobile.

2. **No mobile media upload.** Photographers cannot upload photos from the track — the core use case for a motorsports media platform. **Must fix before launch** — at minimum, a basic mobile upload path.

3. **RaceCore is not mobile-usable.** Series officials, crew chiefs, and track staff cannot manage events from a phone. **Should fix before launch** — at minimum, a simplified mobile RaceCore for key actions (add entry, post result).

4. **No notifications on mobile.** Users have no way to know when claims are approved, results are posted, or media is tagged. **Must fix before launch** — at minimum, a notification panel.

5. **Entity profile tab bars are not sticky.** Users lose navigation context when scrolling long profiles. **Must fix before launch** — make tab bars sticky.

6. **Too many tabs on mobile.** Series (15), Track (12), Event (9) tabs are excessive for horizontal mobile scrolling. **Should fix before launch** — consolidate or group tabs.

7. **No offline resilience.** Track Wi-Fi is notoriously bad. The platform will fail silently on poor connections with no caching or retry. **Should fix before launch** — at minimum, cache the last viewed entity data.

---

## 17. Production Readiness

### 17.1 Is the Platform Ready for a Mobile Race Weekend?

**No.** The platform has excellent mobile engineering foundations (safe areas, touch targets, pull-to-refresh, back button) but is not usable for a full race weekend on a phone. A fan can browse passively, but active participation (search, upload, manage, operate) is severely limited or impossible.

### 17.2 What's Working on Mobile

- **Bottom navigation** — 4 tabs, safe areas, double-tap reset, tab keep-alive
- **Mobile back headers** — on most entity profiles, history-aware
- **PullToRefresh** — on MyDashboard
- **Safe area handling** — top and bottom insets
- **Touch target enforcement** — 44px on coarse pointers
- **Table-to-card conversion** — for standard `<table>` elements
- **Android back button** — sentinel history entry, graceful exit
- **Tab keep-alive** — scroll position preserved across tab switches
- **Page transitions** — smooth framer-motion animations
- **Skeleton loaders** — on entity profiles

### 17.3 What's Not Working on Mobile

- **Search** — invisible on mobile
- **RaceCore** — desktop-first, not mobile-operational
- **Media upload** — no mobile path
- **Notifications** — no system at all
- **Entity profile tabs** — too many, not sticky
- **Offline** — no resilience
- **Forms** — not mobile-optimized
- **Tables** — custom components don't convert
- **Images** — no lazy loading or optimization
- **Race weekend mode** — doesn't exist

### 17.4 Mobile vs Desktop Gap

The platform was clearly built desktop-first. The mobile experience is an adaptation — the bottom nav, back headers, and safe areas are added on top of a desktop layout. RaceCore and Management are desktop-only in practice. The entity profiles are readable but not optimized for mobile consumption.

### 17.5 Race Weekend Verdict

A fan can **survive** a race weekend on mobile — they can browse profiles, read stories, and view media. But they cannot **participate** — they can't search, upload, register, or manage. A series official or crew chief **cannot do their job** on mobile — RaceCore is not mobile-usable. A photographer **cannot upload** from the track.

### 17.6 Final Verdict

**Current state: 53/100 — The platform has excellent mobile engineering foundations but is not usable for a full race weekend on a phone. The gap between "mobile-friendly" and "mobile-first race weekend tool" is the biggest launch risk.**

The platform will be mobile-ready for a race weekend once:
1. Search is visible on mobile
2. A mobile media upload path exists
3. RaceCore has a simplified mobile view for key actions
4. Notifications are available on mobile
5. Entity profile tab bars are sticky and consolidated
6. Offline resilience is added for poor track Wi-Fi

These require moderate to significant effort but are achievable with the current architecture. The mobile foundation is solid; the mobile experience layer is missing.

---

*End of audit. This report is read-only. No code was modified, no files were created (other than this report), no data was written.*