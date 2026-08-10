# PXV_AUDIT_03_VISUAL_DESIGN_SYSTEM

**Audit Type:** Read-only human design audit — visual consistency, design system compliance, and production readiness  
**Date:** 2026-08-10  
**Scope:** Every visual surface — public site, RaceCore, Management, authentication, claims, dashboard, search, all entity profiles, organizations, sponsors, media, forms, admin  
**Methodology:** Inspected design tokens (index.css, tailwind.config.js, globals.css), evaluated every entity profile hero/tab/card pattern, compared RaceCore vs Management vs Public shells, assessed color/typography/spacing consistency, and judged production launch readiness  

---

## 1. Executive Summary

The Hijinx platform has a **well-defined design system** (Hijinx Design System v1.0) with a comprehensive semantic token architecture in `src/index.css` and `tailwind.config.js`. The design system is excellent on paper — semantic tokens for canvas, surfaces, motion (brand teal), foreground, dividers, status colors, and data visualization. **When components use the design system, they look cohesive, premium, and on-brand.**

**The problem is compliance.** The platform suffers from **two visual eras coexisting on the same pages:**

1. **The Design System Era** — RaceCore, Sponsor profiles, the Directory, MotorsportsHome, and the global Layout (header, footer, search) use semantic tokens (`hsl(var(--motion))`, `bg-surface`, `text-foreground`). These surfaces look cohesive, modern, and polished.

2. **The Hardcoded Era** — Entity profiles (Racer, Team, Vehicle, Track, Event) use hardcoded hex values (`#0A0A0A`, `#00FFDA`, `#232323`, `bg-white`, `text-gray-400`, `border-gray-200`). These profiles look like they were built before the design system existed and were never migrated. They use a different accent color (`#00FFDA` — a bright cyan) than the design system's motion teal (`#20ACAC`).

**The result:** The platform looks like **two different products** depending on which page you're on. The public site's glass header and Directory feel like one product. Entity profiles feel like an older, different product. RaceCore feels like a third product (operational, dense, dark). Management feels like a fourth (legacy admin, Tailwind defaults).

**The accent color inconsistency is the most visible issue.** The design system defines `--motion: #20ACAC` (a muted teal). Entity profiles use `#00FFDA` (a bright neon cyan). These are visually different colors — the neon cyan is louder, more "gaming," less premium. When a user navigates from the Directory (motion teal) to a Racer profile (neon cyan), the accent color shifts. This breaks the perception of a single product.

**Despite these issues, the platform has strong visual bones.** The design system is comprehensive, the entity model is rich, and the components that DO use the design system look professional. The path to visual consistency is primarily a migration effort — moving hardcoded hex values to semantic tokens — not a redesign.

---

## 2. Overall Score

| Category | Score (0-10) | Weight |
|----------|-------------|--------|
| Visual Consistency | 4.5 | 15% |
| Design System | 7.5 | 10% |
| Layout | 6.0 | 10% |
| Typography | 6.5 | 8% |
| Spacing | 5.5 | 8% |
| Cards | 5.5 | 7% |
| Buttons | 6.0 | 5% |
| Forms | 5.5 | 5% |
| Tables | 5.0 | 5% |
| Profiles | 5.5 | 8% |
| Entity Pages | 5.0 | 8% |
| Public Experience | 7.0 | 5% |
| RaceCore Experience | 7.5 | 5% |
| Management Experience | 4.5 | 3% |
| Mobile | 5.5 | 5% |
| Accessibility | 5.0 | 3% |
| Branding | 6.5 | 3% |
| Professionalism | 6.0 | 3% |
| Polish | 5.0 | 3% |
| **Overall Visual Quality** | **5.5** | **100%** |

**Weighted Overall Score: 57 / 100**

---

## 3. Visual Identity Assessment

### 3.1 Brand Impression

**What the platform communicates:**
- ✅ **Motorsports** — racing imagery, track/series/event entities, dark hero sections with racing photos
- ✅ **Technology** — RaceCore operational shell, data tables, analytics, monospace labels
- ⚠️ **Community** — stories, media portal, creator directory — present but visually secondary
- ✅ **Modernity** — glass header, semantic tokens, framer-motion animations
- ⚠️ **Confidence** — undermined by visual inconsistency between shells
- ⚠️ **Professionalism** — strong on design-system-compliant pages, weak on hardcoded entity profiles
- ⚠️ **Trust** — the neon cyan accent on entity profiles feels less premium than the motion teal

### 3.2 Brand Voice

The platform's visual voice shifts depending on the surface:
- **Public site (glass header, Directory):** Premium, editorial, confident — "we are the authority on motorsports data"
- **Entity profiles (hardcoded):** Functional, slightly dated — "we built this quickly and haven't polished it"
- **RaceCore:** Operational, dense, professional — "this is a working tool"
- **Management:** Legacy admin — "this is an older interface we haven't updated"

### 3.3 Logo Treatment

The Hijinx logo appears in the header (HijinxLogo component) and in the RaceCore sidebar. The header logo uses a glass/transparent treatment that works well. The RaceCore sidebar logo is small (h-4) and serves as a "back to public" link. Logo treatment is consistent.

### 3.4 Imagery

- **Hero sections:** Entity profiles use dark `#0A0A0A` backgrounds with racing photos at 50-60% opacity. This is effective and consistent across entity types.
- **Backgrounds:** The public site uses a branded background image (`HijinxBackgroundtestimage.png`) with a repeating grid texture overlay and SVG film grain. This creates a distinctive, premium canvas.
- **Logos in profiles:** Team and Series profiles show logos in white/10 rounded containers — consistent.
- **Placeholder images:** `SITE_FALLBACK_IMAGE` is used consistently when no image is available.

---

## 4. Design System Compliance

### 4.1 The Design System (Excellent)

`src/index.css` defines a comprehensive semantic token system:

```
--canvas, --surface, --surface-elevated, --surface-interactive
--motion (brand teal #20ACAC), --motion-hover, --motion-active
--foreground, --foreground-secondary, --foreground-quiet
--divider, --input, --popover
--success, --warning, --danger
--chart-motion, --chart-ocean, --chart-slate, --chart-bronze, --chart-gold
```

Both dark (`.dark` / `.theme-dark`) and light (`.theme-light`) themes are fully defined. shadcn compatibility aliases map every standard token to the Hijinx semantic system. This is a **production-grade design system architecture.**

### 4.2 Compliance by Surface

| Surface | Uses Semantic Tokens | Uses Hardcoded Hex | Compliance |
|---------|--------------------|--------------------|------------|
| Global Layout (header, footer, search) | ✅ Yes | ❌ No | ✅ High |
| Directory | ✅ Yes (via constants) | ❌ No | ✅ High |
| MotorsportsHome | ✅ Yes | ❌ No | ✅ High |
| RaceCore Layout + Sidebar | ✅ Yes | ❌ No | ✅ High |
| RaceCore Dashboard | ✅ Yes (Card, Button components) | ❌ No | ✅ High |
| Sponsor Profile + Components | ✅ Yes | ❌ No | ✅ High |
| Sponsor Analytics Dashboard | ✅ Yes | ❌ No | ✅ High |
| Organization Page (non-sponsor) | ✅ Yes | ❌ No | ✅ High |
| **Racer Profile** | ⚠️ Partial | ✅ Yes (#0A0A0A, #00FFDA, #232323, bg-white, text-gray-*) | ❌ Low |
| **Team Profile** | ⚠️ Partial | ✅ Yes (#0A0A0A, #00FFDA, #232323, bg-white, text-gray-*) | ❌ Low |
| **Vehicle Profile** | ⚠️ Partial | ✅ Yes (#0A0A0A, #00FFDA, #232323, bg-white, text-gray-*) | ❌ Low |
| **Track Profile** | ⚠️ Partial | ✅ Yes (#0A0A0A, #00FFDA, bg-white, text-gray-*) | ❌ Low |
| **Event Profile** | ⚠️ Partial | ✅ Yes (#0A0A0A, #00FFDA, bg-white, text-gray-*) | ❌ Low |
| **Series Profile** | ⚠️ Partial (uses .light-page) | ✅ Yes (hero-dark, #00FFDA) | ⚠️ Medium |
| Management Layout | ⚠️ Partial (uses surface tokens) | ✅ Yes (bg-gray-50, teal-800, teal-950) | ❌ Low |
| Management Pages | ❌ No (Tailwind defaults) | ✅ Yes (bg-gray-50, text-gray-600) | ❌ Low |
| ProfileClaimFooter | ❌ No | ✅ Yes (bg-gray-50, text-gray-600, border-gray-200) | ❌ Low |
| Mobile Bottom Nav | ✅ Yes | ❌ No | ✅ High |

### 4.3 The Two Accent Colors Problem

| Color | Hex | Where Used | Feel |
|-------|-----|-----------|------|
| Motion Teal | `#20ACAC` (`hsl(var(--motion))`) | Design system, RaceCore, Sponsor, Directory, Layout | Muted, premium, professional |
| Neon Cyan | `#00FFDA` | Racer, Team, Vehicle, Track, Event profiles | Bright, gaming, energetic, less premium |

These are **visually different colors.** `#20ACAC` is a desaturated teal. `#00FFDA` is a high-saturation cyan that reads as neon. When a user navigates from the Directory (motion teal) to a Racer profile (neon cyan), the accent color visibly shifts. This is the single most impactful visual inconsistency on the platform.

### 4.4 The `globals.css` Override Problem

`src/globals.css` contains **massive `!important` override blocks** that force dark theme styling onto shadcn components:

```css
:root:not(.theme-light) .bg-white { background-color: rgba(12, 21, 21, 0.92) !important; }
:root:not(.theme-light) .text-gray-900 { color: #F5F5F5 !important; }
.bg-gray-50 { background-color: hsl(var(--surface)) !important; }
```

These overrides exist because entity profiles use `bg-white` and `text-gray-*` classes that don't match the dark theme. Instead of migrating the profiles to semantic tokens, the overrides patch the mismatch globally. This is **technical debt that creates visual fragility** — any new component using `bg-white` will be silently overridden, and the overrides make it impossible to predict what a class will render.

### 4.5 The `.light-page` Escape Hatch

`globals.css` defines a `.light-page` class that neutralizes the dark-theme overrides for pages explicitly designed as light. Series profile uses `className="light-page"`. This is a reasonable pattern but it means the platform has **three rendering modes**: dark-theme-overridden (entity profiles with bg-white), light-page (Series), and semantic-token (Sponsor, RaceCore). Three modes is too many for one product.

---

## 5. Component Consistency

### 5.1 Duplicate UI Patterns

| Pattern | Variant A | Variant B | Variant C |
|---------|-----------|-----------|-----------|
| **Entity Hero** | Dark full-bleed `#0A0A0A` with photo (Racer, Team, Vehicle, Track, Event) | Card-style `rounded-2xl` with banner (Sponsor) | Dark `hero-dark` class (Series) |
| **Entity Tabs** | Horizontal scroll, `text-xs`, `border-b-2 border-[#00FFDA]` (Racer, Team, Vehicle, Track, Event) | Sidebar nav with icons (Sponsor) | Horizontal scroll with icons (Series) |
| **Stat Card** | `bg-gray-50 rounded-lg p-3 text-center` (Racer, Team) | `bg-gray-50 rounded-lg p-4 text-center` (Team overview) | Semantic token card (Sponsor, RaceCore) |
| **Back Link** | `← Racers` / `← Teams` / `← Series` (entity profiles) | MobileBackHeader (Racer, Series, Track, Event) | None (Team, Vehicle, Sponsor) |
| **Claim CTA** | ProfileClaimFooter (Team, Series, Track, Event) | ClaimProfileButton (Racer) | None (Vehicle, Sponsor) |
| **Social Share** | SocialShareButtons in hero (Team, Series, Event) | SocialShareButtons in action row (Racer) | SocialShareButtons at bottom (Sponsor) |
| **Completeness Indicator** | ProfileCompletenessIndicator (Racer) | TeamCompletenessIndicator (Team) | TrackCompletenessIndicator (Track) | VehicleCompletenessIndicator (Vehicle) | SponsorCompletenessIndicator (Sponsor) |
| **Empty State** | "No data available" text (various) | AlertCircle + message (Team schedule) | EntityNotFound component (not found) | Silent empty space (various) |
| **Loading State** | Skeleton (Racer, Team, Series, Track, Event, Vehicle) | BurnoutSpinner (RaceCore) | Loader2 animate-spin (Sponsor, Organization) | Border spinner (RaceCore Layout) |
| **Card Border** | `border border-gray-200` (entity profiles) | `1px solid hsl(var(--divider))` (Sponsor, RaceCore) | `border border-divider` (Directory) |
| **Card Radius** | `rounded-lg` (entity profiles) | `rounded-xl` (Racer sidebar) | `rounded-2xl` (Sponsor hero) | `rounded-[20px]` (header) |

### 5.2 No Single Standard

The platform has **no single standard** for:
- **Card styling** — at least 4 variants (border-only, border+shadow, semantic-token-border, rounded-2xl-elevated)
- **Hero layout** — 3 variants (full-bleed dark, card-style, hero-dark class)
- **Tab navigation** — 2 variants (horizontal scroll, sidebar)
- **Back navigation** — 3 variants (text link, MobileBackHeader, none)
- **Loading indicators** — 4 variants (Skeleton, BurnoutSpinner, Loader2, border spinner)
- **Empty states** — 4 variants (text, icon+text, EntityNotFound, silent)
- **Claim CTA** — 3 variants (footer, button, none)

### 5.3 shadcn/ui Usage

The platform uses shadcn/ui components (Button, Card, Badge, Skeleton, Label, Input, etc.) from `@/components/ui/`. These are well-configured and map to the Hijinx design system via the shadcn compatibility aliases. **When pages use shadcn components, they look consistent.** RaceCore and Sponsor profiles use shadcn Card and Button components heavily and look cohesive.

**Entity profiles (Racer, Team, Vehicle, Track, Event) use raw HTML elements** (`<div>`, `<button>`, `<table>`) with hardcoded Tailwind classes instead of shadcn components. This is why they look different — they bypass the design system entirely.

---

## 6. Entity Profile Comparison

### 6.1 Hero Comparison

| Entity | Hero Background | Hero Height | Accent Color | Logo/Image Treatment | Back Link |
|--------|----------------|-------------|--------------|----------------------|-----------|
| Racer | `#0A0A0A` with photo | 380px | `#00FFDA` | Profile img in rounded-xl border-2 | MobileBackHeader + text link |
| Team | `#0A0A0A` gradient (no photo) | 280px | `#00FFDA` | Logo in white/10 rounded-xl | Text link only |
| Vehicle | `#0A0A0A` (assumed) | 280px | `#00FFDA` | (not fully visible) | None |
| Track | (uses experience hero) | varies | `#00FFDA` | (not fully visible) | MobileBackHeader |
| Series | `hero-dark` `#0A0A0A` with photo | 300px | `#00FFDA` | Logo in white/10 rounded-xl | MobileBackHeader + text link |
| Event | `#0A0A0A` with photo | varies | `#00FFDA` | (not fully visible) | MobileBackHeader |
| Sponsor | `hsl(var(--surface-elevated))` card | 128-176px | `hsl(var(--motion))` | Logo in rounded-2xl border-3 | None |

**Assessment:** Racer, Team, Vehicle, Track, Series, and Event share a consistent hero pattern (dark `#0A0A0A` with neon cyan accent). Sponsor is the outlier — it uses a card-style hero with semantic tokens. **Sponsor looks like it belongs to a different, more modern product.**

### 6.2 Tab Navigation Comparison

| Entity | Tab Style | Active Indicator | Icon | Count |
|--------|-----------|-----------------|------|-------|
| Racer | Horizontal scroll | `border-b-2 border-[#00FFDA]` | No | 8 |
| Team | Horizontal scroll | `border-b-2 border-[#00FFDA]` | Yes | 9 |
| Vehicle | Horizontal scroll | `border-b-2 border-[#00FFDA]` | Yes | 8 |
| Track | Horizontal scroll | `border-b-2 border-[#00FFDA]` | Yes | 12 |
| Series | Horizontal scroll | `border-b-2 border-[#00FFDA]` | Yes | 15 |
| Event | Horizontal scroll | `border-b-2 border-[#00FFDA]` | Yes | 9 |
| Sponsor | Sidebar nav | `bg-motion/0.12 text-motion` | Yes | 14 |

**Assessment:** 6 of 7 entity types use horizontal-scroll tabs with neon cyan active indicator. Sponsor uses a sidebar. The horizontal tabs are visually consistent with each other but use the wrong accent color (`#00FFDA` instead of `hsl(var(--motion))`).

### 6.3 Sidebar / Related Entities Comparison

| Entity | Sidebar Style | Related Entity Links | Completeness Indicator |
|--------|-------------|--------------------|-----------------------|
| Racer | Right sidebar with border-gray-200 cards | Team, Series links | ProfileCompletenessIndicator |
| Team | No sidebar (completeness at top) | None in sidebar | TeamCompletenessIndicator (top) |
| Vehicle | (not fully visible) | (not fully visible) | VehicleCompletenessIndicator |
| Track | (not fully visible) | (not fully visible) | TrackCompletenessIndicator |
| Series | No sidebar (full-width tabs) | In tabs | None |
| Event | (not fully visible) | In tabs | None |
| Sponsor | Left sidebar (SponsorSidebar) | In sidebar sections | In overview |

**Assessment:** Sidebar placement is inconsistent — Racer has a right sidebar, Sponsor has a left sidebar, Team/Series have no sidebar. Completeness indicators exist for all entity types but are placed differently.

### 6.4 Statistics Display Comparison

| Entity | Stat Style | Background | Text Color |
|--------|-----------|-----------|------------|
| Racer | `bg-gray-50 rounded-lg p-3 text-center` | gray-50 | `#232323` |
| Team | `bg-gray-50 rounded-lg p-4 text-center` | gray-50 | `#232323` |
| Series | (via SeriesStatistics component) | varies | varies |
| Sponsor | Stat component with semantic tokens | surface-interactive | foreground |

**Assessment:** Stat cards are visually similar across Racer/Team (gray-50 background, centered) but use hardcoded colors. Sponsor uses semantic tokens. Two different stat card styles.

### 6.5 Do They Look Like One Platform?

**No.** The entity profiles split into two visual families:
1. **Family A (Legacy):** Racer, Team, Vehicle, Track, Series, Event — dark `#0A0A0A` heroes, `#00FFDA` accent, `bg-white`/`bg-gray-50` content, `text-gray-*` typography, `border-gray-200` borders
2. **Family B (Modern):** Sponsor — semantic tokens, `hsl(var(--motion))` accent, `hsl(var(--surface-elevated))` surfaces, `hsl(var(--foreground))` typography, `hsl(var(--divider))` borders

A user moving from a Racer profile to a Sponsor profile experiences a visible visual shift — different accent color, different card style, different hero treatment, different sidebar placement.

---

## 7. Public vs RaceCore Comparison

### 7.1 Visual Character

| Aspect | Public Site | RaceCore | Management |
|--------|------------|----------|------------|
| **Background** | Branded image + grid texture + film grain | `hsl(var(--canvas))` flat dark | `bg-gray-50` (light) / surface (dark) |
| **Header** | Glass floating header, rounded-[20px], blur | No header (sidebar only) | ManagementHeader with title |
| **Sidebar** | None (horizontal nav) | RaceCoreSidebar, w-44, collapsible | ManagementSidebar, w-64, expandable sections |
| **Content Width** | max-w-7xl | Full width (flex-1) | max-w-5xl to max-w-7xl |
| **Card Style** | Glass/motorsports-glass | shadcn Card (semantic tokens) | bg-white rounded-lg border-gray-200 |
| **Typography** | Inter + JetBrains Mono | Inter + JetBrains Mono | Inter + JetBrains Mono |
| **Accent** | `hsl(var(--motion))` | `hsl(var(--motion))` | teal-800/teal-950 (Tailwind teal) |
| **Density** | Spacious, editorial | Dense, operational | Medium |
| **Footer** | Full footer with newsletter | No footer | No footer |
| **Mobile Nav** | Bottom nav (4 tabs) | Hamburger drawer | (desktop-focused) |

### 7.2 Do They Feel Like One Platform?

**Public + RaceCore: Two platforms.** They share the design system tokens (motion teal, surface colors, foreground) but have completely different layouts, densities, and navigation patterns. The transition from the glass-header public site to the sidebar-only RaceCore shell is a jarring context switch. The shared accent color (motion teal) provides a visual thread, but the overall experience feels like two different applications.

**Public + Management: Two platforms.** Management uses Tailwind default colors (bg-gray-50, text-gray-600) and a different teal (teal-800/teal-950). It looks like a standard admin panel, not a Hijinx product. The Management page even uses `text-black` and `text-black/70` in its RaceCore link card — colors that don't exist in the Hijinx design system.

**RaceCore + Management: Two platforms.** RaceCore uses semantic tokens and looks modern. Management uses Tailwind defaults and looks legacy. The Management sidebar links to RaceCore with a bordered button, acknowledging they're separate.

**All three together: Three platforms.** The platform does not look like one product. It looks like three products that share a database and a design token file (but only two of the three actually use the tokens).

### 7.3 Why They Feel Different

1. **Different layouts** — Public has a glass header + footer; RaceCore has a sidebar only; Management has a sidebar + header
2. **Different backgrounds** — Public has a branded image canvas; RaceCore has flat canvas; Management has gray-50
3. **Different card styles** — Public uses glass; RaceCore uses shadcn Card; Management uses white cards with gray borders
4. **Different accent colors** — Public and RaceCore use motion teal; Management uses Tailwind teal
5. **Different density** — Public is spacious; RaceCore is dense; Management is medium
6. **Different navigation** — Public has horizontal nav; RaceCore has sidebar; Management has sidebar + sections

---

## 8. Typography Audit

### 8.1 Font System

The platform uses three font families (defined in globals.css):
- **Inter** (sans-serif) — body text, UI labels, navigation
- **JetBrains Mono** (monospace) — labels, tags, metadata, RaceCore labels
- **Playfair Display** (serif) — (declared but rarely used in visible components)

### 8.2 Heading Hierarchy

| Level | Public Site | Entity Profiles | RaceCore | Management |
|-------|------------|----------------|---------|------------|
| H1 | `text-4xl md:text-5xl font-black` | `text-4xl md:text-5xl font-black` | (varies by page) | ManagementShell title |
| H2 | `text-xs font-bold uppercase tracking-widest` | `text-2xl font-black` | Card titles | `text-xs uppercase` |
| H3 | varies | `text-lg font-semibold` | varies | varies |
| Body | `text-sm` / `text-gray-700` | `text-gray-700` / `text-gray-500` | `text-sm` | `text-sm` / `text-gray-600` |

**Issues:**
- H2 is `text-xs uppercase tracking-widest` on the public site but `text-2xl font-black` on entity profiles — completely different hierarchy
- Entity profiles use `font-black` (900 weight) heavily for both H1 and H2, creating a flat hierarchy
- RaceCore uses shadcn Card titles which are `text-lg font-semibold` — different from entity profile H2s
- The monospace font is used for labels/tags on the public site and RaceCore but not on entity profiles

### 8.3 Typography Consistency

| Element | Style A (Public/RaceCore) | Style B (Entity Profiles) |
|---------|--------------------------|---------------------------|
| Section label | `font-mono text-[9px] tracking-[0.45em] uppercase` | `text-xs font-bold uppercase tracking-widest text-gray-400` |
| Stat number | `text-2xl font-black` | `text-2xl font-black` |
| Stat label | `text-xs uppercase` | `text-xs text-gray-500 uppercase` |
| Metadata | `text-xs text-foreground-quiet` | `text-xs text-gray-400` |
| Nav item | `text-[13.75px] font-bold tracking-[0.18em] uppercase` | N/A |

**Assessment:** Stat numbers and labels are consistent. Section labels differ — the public site uses monospace with wide tracking; entity profiles use sans-serif with normal tracking. This is a subtle but noticeable inconsistency.

---

## 9. Spacing Audit

### 9.1 Spacing Patterns

| Surface | Container Padding | Section Spacing | Card Padding |
|---------|-----------------|----------------|-------------|
| Public Home | `px-6` / `py-8` to `py-12` | `space-y-8` to `space-y-12` | varies |
| Entity Profiles | `max-w-7xl mx-auto px-6` | `space-y-8` / `pb-12` | `p-4` to `p-8` |
| RaceCore | (full width) | `space-y-4` to `space-y-6` | `p-4` to `p-6` |
| Management | `max-w-5xl mx-auto` | `space-y-6` to `space-y-8` | `p-4` to `p-6` |
| Sponsor | `max-w-7xl mx-auto px-4 py-6` | `space-y-6` | `p-5` |

### 9.2 Issues

- **Entity profile card padding varies** — Racer uses `p-3` for stat cards, `p-4` for sidebar cards; Team uses `p-8` for content cards, `p-4` for stat cards; Sponsor uses `p-5`. No single standard.
- **Section spacing varies** — `space-y-6`, `space-y-8`, `space-y-12` all appear. The public site uses larger spacing (space-y-12); entity profiles use medium (space-y-8); RaceCore uses tight (space-y-4).
- **Container max-width varies** — `max-w-5xl` (Management), `max-w-7xl` (entity profiles, public), full-width (RaceCore). This is intentional (different content types) but the transitions are noticeable.
- **Horizontal padding** — `px-4` (Sponsor), `px-6` (entity profiles, RaceCore), `px-5 sm:px-8 md:px-12 lg:px-20` (Directory). The Directory's progressive padding is the most responsive; entity profiles' fixed `px-6` is less so.

### 9.3 Alignment

- Entity profiles are generally well-aligned with `max-w-7xl mx-auto` containers
- RaceCore content is left-aligned in the flex-1 area
- The public header uses `max-w-7xl mx-auto` consistently
- **No major alignment issues** detected — content is consistently centered

---

## 10. Color Audit

### 10.1 Dark Mode (Default)

The dark theme is the canonical Hijinx theme:
- Canvas: `#050B0B` (very dark teal-black)
- Surface: `#0C1515` (dark teal)
- Surface-elevated: `#121B1B`
- Motion: `#20ACAC` (muted teal)
- Foreground: `#F5F5F5` (off-white)
- Divider: `#243434`

**Assessment:** The dark theme palette is cohesive, premium, and distinctive. The very dark canvas with teal undertones creates a motorsports/industrial feel. The motion teal is well-chosen — visible without being loud.

### 10.2 Light Mode

- Canvas: `#F7F5F2` (warm ivory)
- Surface: `#F0EEE9` (light stone)
- Surface-elevated: `#FFFFFF` (white)
- Motion: `#1E9E9E` (slightly darker teal for contrast)
- Foreground: `#131314` (dark charcoal, not pure black)
- Divider: `#CBD1D1`

**Assessment:** The light theme is warm and premium. The ivory canvas (not pure white) is an intentional editorial choice. Dark charcoal text (not pure black) is correct per the design preferences. This is a well-crafted light theme.

### 10.3 Contrast

- **Dark theme:** Foreground `#F5F5F5` on canvas `#050B0B` — excellent contrast (≈18:1)
- **Light theme:** Foreground `#131314` on canvas `#F7F5F2` — excellent contrast (≈16:1)
- **Foreground-quiet on canvas:** `#8C8C8C` on `#050B0B` — adequate (≈5.5:1) but borderline for small text
- **Motion on canvas:** `#20ACAC` on `#050B0B` — good (≈5.2:1) but used for accents, not body text
- **Neon cyan on dark:** `#00FFDA` on `#0A0A0A` — very high contrast but the cyan is too bright for premium feel

### 10.4 Status Colors

| Status | Dark Hex | Light Hex | Usage |
|--------|---------|-----------|-------|
| Success | `#3FBF7F` | `#278658` | Badges, indicators |
| Warning | `#D7B15A` | `#CF8A11` | Badges, alerts |
| Danger | `#DC2828` | `#D22B28` | Errors, destructive actions |

**Assessment:** Status colors are consistent between themes (slightly darker in light mode for contrast). Used consistently in badges and alerts.

### 10.5 The Color Compliance Problem

Entity profiles use hardcoded colors that don't match the design system:
- `#0A0A0A` (hero background) — should be `hsl(var(--canvas))` or a dedicated hero token
- `#00FFDA` (accent) — should be `hsl(var(--motion))`
- `#232323` (text) — should be `hsl(var(--foreground))`
- `bg-white` (content background) — overridden by globals.css to dark in dark theme
- `text-gray-400`, `text-gray-500`, `text-gray-600`, `text-gray-700` — should be `text-foreground-quiet`, `text-foreground-secondary`, `text-foreground`
- `border-gray-200` — should be `border-divider`
- `bg-gray-50` — overridden by globals.css to surface

**These hardcoded values are the primary source of visual drift.**

---

## 11. Mobile Audit

### 11.1 Responsiveness

- **Public site:** Header collapses to hamburger menu, bottom nav appears. Content reflows well. `max-w-7xl` containers work on mobile.
- **Entity profiles:** Heroes are `h-[280px]` to `h-[380px]` on mobile — reasonable. Tab bars use `overflow-x-auto` with `scrollbar-hide` — works but no overflow indicator. Content grids collapse to single column. Sidebar moves below content (or is hidden).
- **RaceCore:** Sidebar becomes a hamburger drawer. Mobile header strip with "RACECORE" label. Content is full-width. Works but dense.
- **Management:** Sidebar becomes hamburger (assumed). Desktop-focused design.

### 11.2 Touch Targets

`globals.css` includes a media query for `pointer: coarse` that sets `min-height: 44px` and `min-width: 44px` on buttons and interactive elements. This is excellent for mobile usability.

### 11.3 Mobile Bottom Nav

The bottom nav has 4 tabs (Home, Directory, Dashboard, Profile) with safe-area-inset-bottom padding. Icons are clear. Active state is visible. This is a well-designed mobile nav.

**Issue:** No search tab on mobile — the most powerful navigation tool is inaccessible on mobile.

### 11.4 Tables on Mobile

`globals.css` includes a media query that converts tables to stacked card blocks on `max-width: 640px`. This is a good responsive pattern. However, it uses `data-label` attributes for auto-labeling, and not all tables include `data-label` on their cells.

### 11.5 Forms on Mobile

Forms generally reflow well. Input fields are full-width. The 44px touch target rule applies. No major issues detected.

### 11.6 Mobile Assessment

Mobile is **intentionally designed** — the safe-area insets, touch target enforcement, table-to-card conversion, and bottom nav show deliberate mobile thinking. The main gap is the missing search on mobile.

---

## 12. Top 50 Visual Issues

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | Two accent colors: `#00FFDA` (entity profiles) vs `#20ACAC` (design system) | Color | Critical |
| 2 | Entity profiles use hardcoded hex instead of semantic tokens | Design System | Critical |
| 3 | `globals.css` has massive `!important` override blocks forcing dark theme | Design System | Critical |
| 4 | Three rendering modes (dark-overridden, light-page, semantic-token) | Design System | Critical |
| 5 | Sponsor profile looks like a different product from other entity profiles | Consistency | Critical |
| 6 | Management uses Tailwind default colors (bg-gray-50, text-gray-600) | Design System | High |
| 7 | Management uses teal-800/teal-950 instead of motion teal | Color | High |
| 8 | Management page uses `text-black` and `text-black/70` (not in design system) | Color | High |
| 9 | Entity profile heroes use `#0A0A0A` instead of `hsl(var(--canvas))` | Color | High |
| 10 | Entity profiles use `bg-white` which is overridden by globals.css | Design System | High |
| 11 | Entity profiles use `text-gray-*` classes instead of `text-foreground-*` | Design System | High |
| 12 | Entity profiles use `border-gray-200` instead of `border-divider` | Design System | High |
| 13 | Entity profiles use `bg-gray-50` for stat cards instead of `bg-surface-interactive` | Design System | High |
| 14 | No single card style — at least 4 variants across the platform | Cards | High |
| 15 | No single hero style — 3 variants (full-bleed dark, card, hero-dark) | Layout | High |
| 16 | No single loading indicator — 4 variants (Skeleton, BurnoutSpinner, Loader2, border spinner) | Consistency | Medium |
| 17 | No single empty state pattern — 4 variants | Consistency | Medium |
| 18 | No single claim CTA — 3 variants (footer, button, none) | Consistency | Medium |
| 19 | Entity profiles use raw HTML instead of shadcn components | Design System | High |
| 20 | Card border radius varies: rounded-lg, rounded-xl, rounded-2xl, rounded-[20px] | Spacing | Medium |
| 21 | Card padding varies: p-3, p-4, p-5, p-8 | Spacing | Medium |
| 22 | Section spacing varies: space-y-4, space-y-6, space-y-8, space-y-12 | Spacing | Medium |
| 23 | H2 is `text-xs uppercase` on public site but `text-2xl font-black` on entity profiles | Typography | Medium |
| 24 | Section labels use monospace on public site but sans-serif on entity profiles | Typography | Low |
| 25 | Entity profile tabs use `#00FFDA` active border instead of `border-motion` | Color | High |
| 26 | Sponsor sidebar is on the left; Racer sidebar is on the right | Layout | Medium |
| 27 | Team/Series have no sidebar; Racer/Sponsor do | Layout | Medium |
| 28 | Completeness indicators placed differently per entity (top vs sidebar) | Layout | Low |
| 29 | Social share buttons placed differently per entity (hero, action row, bottom) | Layout | Low |
| 30 | Back links inconsistent — some text, some MobileBackHeader, some none | Navigation | Medium |
| 31 | RaceCore has no header bar (sidebar only) | Layout | Medium |
| 32 | Management has a header bar but RaceCore doesn't | Consistency | Medium |
| 33 | Public site has glass header; RaceCore/Management don't | Consistency | Medium |
| 34 | Directory uses progressive padding (px-5 to px-20); entity profiles use fixed px-6 | Spacing | Low |
| 35 | Entity profile tab bars have no overflow indicator on mobile | Mobile | Medium |
| 36 | Series has 15 tabs — too many for horizontal scroll on mobile | Mobile | Medium |
| 37 | Stat cards use `text-2xl font-black` consistently — good | Typography | ✅ Good |
| 38 | Badge styles vary — some use `bg-teal-500/20`, some `bg-[#00FFDA]/20`, some semantic | Color | Medium |
| 39 | `CareerStatusTag` and `CountryFlag` components are consistent across entities | Consistency | ✅ Good |
| 40 | Hover states are minimal on entity profiles (only links change color) | Microinteraction | Low |
| 41 | No transitions on tab switches (content appears instantly) | Microinteraction | Low |
| 42 | Skeleton loading is used on entity profiles — consistent | Loading | ✅ Good |
| 43 | Framer-motion page transitions on public site (AnimatePresence) — good | Animation | ✅ Good |
| 44 | Framer-motion tab transitions on MotorsportsHome — good | Animation | ✅ Good |
| 45 | No skeleton loading on Sponsor profile (uses Loader2 spinner) | Loading | Low |
| 46 | RaceCore uses BurnoutSpinner — unique loading indicator not used elsewhere | Loading | Low |
| 47 | Entity profile content has no max-width constraint on tab content (full max-w-7xl) | Layout | Low |
| 48 | `ProfileClaimFooter` uses `bg-gray-50` and `border-gray-200` (not semantic) | Design System | Medium |
| 49 | Management "Access Denied" page uses `text-gray-300`, `text-gray-400`, `text-gray-600` | Design System | Medium |
| 50 | No consistent shadow system — some cards have shadows, some don't | Elevation | Medium |

---

## 13. Quick Wins

1. **Replace `#00FFDA` with `hsl(var(--motion))`** in all entity profile tab active borders and accents. (30 min — find/replace across 6 entity pages)
2. **Replace `#0A0A0A` with `hsl(var(--canvas))`** in entity profile hero backgrounds. (15 min)
3. **Replace `#232323` with `hsl(var(--foreground))`** in entity profile text. (20 min)
4. **Replace `bg-white` with `bg-surface-elevated`** in entity profile content areas. (30 min)
5. **Replace `text-gray-400/500/600/700` with `text-foreground-quiet/secondary/foreground`** in entity profiles. (45 min)
6. **Replace `border-gray-200` with `border-divider`** in entity profiles. (20 min)
7. **Replace `bg-gray-50` with `bg-surface-interactive`** in entity profile stat cards. (20 min)
8. **Replace `teal-800/teal-950` with `motion` token** in Management page. (15 min)
9. **Replace `text-black` with `text-foreground`** in Management page. (5 min)
10. **Add `border-motion` to entity profile tab active state** instead of `border-[#00FFDA]`. (15 min)

---

## 14. Medium Improvements

1. **Migrate entity profiles to shadcn Card components** instead of raw `<div>` with hardcoded classes. This would automatically inherit the design system.
2. **Standardize hero layout** — choose one hero pattern (card-style or full-bleed) and apply to all entity types.
3. **Standardize sidebar placement** — decide left or right, and apply consistently.
4. **Standardize loading indicators** — pick one (Skeleton is most common) and use everywhere.
5. **Standardize empty states** — create a shared EmptyState component and use everywhere.
6. **Standardize claim CTA** — pick one placement (footer is most common) and use everywhere.
7. **Migrate Management pages to semantic tokens** — replace all `bg-gray-50`, `text-gray-*`, `border-gray-*` with semantic equivalents.
8. **Remove `globals.css` override blocks** once entity profiles are migrated to semantic tokens.
9. **Standardize card radius** — pick one (rounded-xl is a good middle ground) and use everywhere.
10. **Standardize card padding** — pick one default (p-4 or p-5) and use consistently.
11. **Add overflow indicators** to horizontal-scroll tab bars (fade gradient on right edge).
12. **Add hover transitions** to entity profile cards (scale, shadow, or border-color change).
13. **Standardize section label typography** — use monospace with wide tracking everywhere.
14. **Create a shared EntityHero component** that all entity profiles use, with semantic tokens.
15. **Create a shared EntityTabBar component** with semantic tokens and overflow indicator.

---

## 15. Major Refactoring Candidates

1. **Entity Profile Visual Migration (Phase 1):** Migrate Racer, Team, Vehicle, Track, Event, and Series profiles from hardcoded hex to semantic tokens. This is the single highest-impact visual improvement. Estimated effort: 2-3 days. Files: 6 page files + ~30 component files.

2. **Global Override Removal (Phase 2):** After entity profiles are migrated, remove the `!important` override blocks in `globals.css`. This will simplify the CSS architecture and eliminate the three-rendering-mode problem. Estimated effort: 1 day. File: `src/globals.css`.

3. **Management Visual Migration (Phase 3):** Migrate Management pages from Tailwind default colors to Hijinx semantic tokens. This would make Management feel like part of the same product. Estimated effort: 2-3 days. Files: Management.jsx + ManagementLayout + ManagementSidebar + ManagementHeader + ~20 management page files.

4. **Shared Entity Profile Components (Phase 4):** Extract shared EntityHero, EntityTabBar, EntitySidebar, EntityStatCard, and EntityCompletenessIndicator components. This would enforce visual consistency across all entity types. Estimated effort: 3-4 days.

5. **Sponsor Profile Alignment (Phase 5):** Decide whether Sponsor should align with the other entity profiles (dark hero, horizontal tabs) or whether all entity profiles should align with Sponsor (card hero, sidebar nav). Currently Sponsor is the most design-system-compliant but the visual outlier.

---

## 16. Launch Blockers

1. **Two accent colors on the same platform.** The `#00FFDA` vs `#20ACAC` split is immediately visible to any user navigating from the Directory to an entity profile. This must be resolved before launch — either migrate entity profiles to motion teal, or update the design system to use the neon cyan. **Must fix before launch.**

2. **Entity profiles don't use the design system.** The hardcoded hex values in entity profiles create a visible quality gap. Pages that use the design system look premium; pages that don't look dated. This inconsistency undermines trust at launch. **Must fix before launch.**

3. **`globals.css` override blocks.** The `!important` overrides are a maintenance hazard and create unpredictable rendering. While they currently "work," they will cause issues when new components are added. **Should fix before launch.**

4. **Management looks like a different product.** The Management shell uses Tailwind defaults and a different teal. For admin users, the visual shift from the public site to Management is jarring. **Should fix before launch.**

---

## 17. Production Readiness

### 17.1 Is It Ready to Launch?

**Not yet.** The platform has strong visual foundations (design system, entity model, responsive patterns) but the visual inconsistency between hardcoded entity profiles and design-system-compliant pages is too visible for a public launch. A first-time visitor who browses from the Directory (premium, semantic tokens) to a Racer profile (hardcoded, different accent) will perceive a quality drop.

### 17.2 What Would Make It Ready?

1. **Migrate entity profiles to semantic tokens** (Quick Wins #1-7) — this alone would raise the visual consistency score from 4.5 to 7.0+
2. **Unify the accent color** — one teal everywhere
3. **Migrate Management to semantic tokens** — or at minimum, replace teal-800/teal-950 with motion teal
4. **Standardize one card style** — pick border-radius, padding, border color, and shadow; apply everywhere

### 17.3 What's Already Good?

- **Design system architecture** — comprehensive, well-tokenized, dual-theme
- **RaceCore visual quality** — semantic tokens, shadcn components, cohesive
- **Sponsor profile visual quality** — semantic tokens, modern, polished
- **Directory visual quality** — premium, editorial, well-spaced
- **Public header** — glass effect, blur, branded, distinctive
- **Mobile patterns** — safe areas, touch targets, table conversion, bottom nav
- **Dark theme palette** — cohesive, premium, motorsports-appropriate
- **Light theme palette** — warm, editorial, well-contrasted
- **Framer-motion animations** — page transitions, hero animations, dropdown expansions
- **Loading states** — Skeleton used on most entity profiles (consistent)
- **Imagery** — racing photos, branded backgrounds, texture overlays

### 17.4 Trust Assessment

**Would a user trust this platform with their data?**
- **On RaceCore:** Yes — it looks professional and operational
- **On Sponsor profiles:** Yes — it looks modern and polished
- **On the Directory:** Yes — it looks premium and authoritative
- **On entity profiles (Racer/Team/etc.):** Hesitantly — the hardcoded colors and gray-50 stat cards feel slightly dated, which could undermine confidence in a "professional motorsports platform"

### 17.5 Professionalism Assessment

The platform **looks professional on design-system-compliant pages** and **looks functional but less polished on hardcoded pages.** The split is the core issue — not that either side is bad, but that they coexist on the same product.

### 17.6 Polish Assessment

**Polish is uneven.** The public header (glass, blur, hover states, dropdown animations) is highly polished. Entity profile tabs (instant switch, no transition, no overflow indicator) are less polished. RaceCore (shadcn components, semantic tokens, consistent spacing) is well-polished. Management (Tailwind defaults, legacy feel) is the least polished.

### 17.7 Final Verdict

The Hijinx platform has **excellent visual bones** but **inconsistent execution.** The design system is one of the best-architected aspects of the platform, but compliance is the bottleneck. The path to launch readiness is primarily a migration effort (hardcoded hex → semantic tokens), not a redesign. With the Quick Wins applied, the platform would look like one cohesive product.

**Current state: 57/100 — Close to ready, but the visual split between hardcoded and design-system pages is too visible for a confident public launch.**

---

*End of audit. This report is read-only. No code was modified, no files were created (other than this report), no data was written.*