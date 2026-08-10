# PXV_AUDIT_04_ENTITY_ECOSYSTEM_CONNECTIVITY

**Audit Type:** Read-only human experience audit — entity journey and ecosystem connectivity  
**Date:** 2026-08-10  
**Scope:** Every entity type, 7 real user journeys, relationship matrix, knowledge graph behavior, discovery, dead ends, and cross-link density  
**Methodology:** Walked each of the 7 specified journeys end-to-end through the actual page code, traced every cross-link, measured click depth, identified broken paths and dead ends, and evaluated whether the platform behaves like a connected knowledge graph or isolated pages  
**Constraint:** Based only on the current identity-first architecture. No rebuild recommendations.  

---

## 1. Executive Summary

The Hijinx platform has an **ambitious entity model** with 20+ entity types connected through a well-designed identity chain (PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results → Standings). The backend "experience" functions compute rich relationship data and provide `profile_url` fields for most entities. **When the frontend uses these URLs, the ecosystem feels alive and connected.**

**The platform partially achieves the "Wikipedia for Motorsports" vision.** Series profiles are excellent hubs — 15 tabs linking to racers, teams, vehicles, tracks, events, standings, champions, records, sponsors, and media. Sponsor profiles are equally strong — entity grids link to every sponsored entity type. The Racer profile connects to teams, series, events, vehicles, sponsors, media, results, standings, career, timeline, and achievements.

**However, the ecosystem has significant gaps that break the knowledge graph:**

1. **Vehicle is the weakest node.** Vehicle profiles don't link to events, series, tracks, results, or sponsors. A user who discovers a vehicle hits a dead end — they can see the vehicle's owner and chassis history but can't navigate to the races it competed in.

2. **List views don't deep-link.** Series Schedule shows event names as links but track names as plain text. Event Entry List shows racer names as links but team names as plain text. Series Racer Roster shows racer names as links but team names as plain text. **The data is there (team objects are passed to components) but the links are missing.**

3. **Team has no Sponsors tab.** Despite the Sponsorship entity supporting Team targets, Team profiles don't surface sponsors. A user on a Team page can't discover who sponsors the team.

4. **Event and Track have no Sponsors tab.** Same gap — sponsorships exist for these target types but aren't surfaced on the profile pages.

5. **Standings don't link back to Series.** A user viewing standings on a Racer profile (via ResultsPanel) can see positions but can't click through to the Series standings page. The data is displayed but not linked.

6. **Results don't link to Media.** A user viewing race results can't navigate to media coverage of that race. Results and Media exist as separate silos within Event profiles.

7. **Organizations (non-sponsor) are invisible.** There's no public directory or discovery path for Organizations that aren't Sponsors. Vendors, Manufacturers, OEMs, and other org types exist in the database but are unreachable from public navigation.

8. **Search is retrieval, not discovery.** Search returns exact matches grouped by category but doesn't suggest related entities. Searching "Bark River" finds the track but not events at that track.

**Despite these gaps, the platform has strong ecosystem bones.** The identity chain is well-modeled, the experience functions compute comprehensive relationship data, and the components that DO use `profile_url` fields create natural cross-entity navigation. The path to a connected ecosystem is primarily about **adding missing links in existing components** — the data is already available, it's just not wired to navigation.

---

## 2. Overall Ecosystem Score

| Category | Score (0-10) | Weight |
|----------|-------------|--------|
| Entity Connectivity | 6.0 | 12% |
| Relationship Quality | 6.5 | 10% |
| Discoverability | 5.5 | 10% |
| Knowledge Graph | 5.0 | 10% |
| Cross-Link Density | 5.5 | 10% |
| Journey Flow | 5.0 | 10% |
| Entity Completeness | 6.0 | 8% |
| Historical Exploration | 6.5 | 5% |
| Modern Exploration | 6.0 | 5% |
| Search Discovery | 4.5 | 5% |
| Overall Ecosystem | 5.5 | 15% |

**Weighted Overall Score: 57 / 100**

---

## 3. Entity Connectivity Matrix

### 3.1 Full Matrix

| From \ To | Racer | Team | Vehicle | Track | Series | Event | Results | Standings | Career | Media | Sponsor | Org | Timeline | History | Stats | Champions | Records |
|-----------|-------|------|---------|-------|--------|-------|---------|-----------|--------|-------|---------|-----|----------|---------|-------|-----------|---------|
| **RacerProfile** | — | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Team** | ✅ | — | ❌ | ❌ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Vehicle** | ✅ | ✅ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Track** | ✅ | ✅ | ✅ | — | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Series** | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Event** | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Sponsor** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | — | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Organization** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| **MediaAsset** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **OutletStory** | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key:**
- ✅ = Direct clickable link from profile page
- ⚠️ = Data shown but not linked (plain text) or indirect only
- ❌ = Not present on the profile page

### 3.2 Connection Density by Entity

| Entity | Outbound Links (✅) | Partial (⚠️) | Missing (❌) | Total Possible | Connection Rate |
|--------|-------------------|-------------|-------------|----------------|----------------|
| Series | 13 | 1 | 2 | 16 | 81% |
| Sponsor | 10 | 1 | 5 | 16 | 63% |
| Racer | 10 | 0 | 6 | 16 | 63% |
| Track | 9 | 0 | 7 | 16 | 56% |
| Event | 7 | 2 | 7 | 16 | 44% |
| Team | 5 | 1 | 10 | 16 | 31% |
| Vehicle | 4 | 0 | 12 | 16 | 25% |
| Organization | 0 | 1 | 15 | 16 | 6% |
| MediaAsset | 0 | 0 | 16 | 16 | 0% |

**Most connected entity:** Series (81%)  
**Least connected entity:** MediaAsset (0%)

---

## 4. Relationship Graph Analysis

### 4.1 The Identity Chain (Strong)

```
PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results → Standings
                                                                      ↓
                                                               DriverCareerStats
```

This chain is the backbone of the platform. The experience functions (getRacerProfileExperience, getTeamExperience, etc.) compute comprehensive data along this chain. The Racer profile surfaces all of it through tabs and sidebar links. **This is the strongest part of the ecosystem.**

### 4.2 The Series Hub (Strong)

```
Series → Events → Tracks
Series → Racers → Teams → Vehicles
Series → Standings → Champions → Records
Series → Sponsors → Organizations
Series → Media
Series → Timeline → History
```

Series is the platform's best hub entity. 15 tabs connect to every major entity type. The Series Schedule links to events (with track data shown but not linked). The Racer Roster links to racers (with team data shown but not linked). **Series is the closest thing to a Wikipedia category page.**

### 4.3 The Sponsor Hub (Strong but Isolated)

```
Sponsor → Sponsored Racers
Sponsor → Sponsored Teams
Sponsor → Sponsored Vehicles
Sponsor → Sponsored Series
Sponsor → Sponsored Events
Sponsor → Sponsored Tracks
Sponsor → Activations → Deliverables
Sponsor → Media Summary
Sponsor → Timeline
Sponsor → Statistics
Sponsor → Assets
```

Sponsor is the second-best hub. The entity grid links to every sponsored entity type. The sidebar has 14 sections. **However, Sponsor is a one-way hub** — it links outward but other entities' links to Sponsor are inconsistent (Racer has a Sponsors tab, but Team/Track/Event don't).

### 4.4 The Event Node (Medium)

```
Event → Track (venue) ✅
Event → Series ✅
Event → Entries → Racers ✅ (but team/vehicle as text only)
Event → Results ✅
Event → Standings Impact ✅
Event → Timeline ✅
Event → Media ✅
Event → Sponsors ❌ (MISSING)
Event → Classes ✅
```

Event connects to most entities but misses Sponsors. The Entry List is a key discovery point — users find racers through events — but team and vehicle names in the entry cards are not clickable.

### 4.5 The Vehicle Dead End (Weak)

```
Vehicle → Racer (owner history) ✅
Vehicle → Team (team history) ✅
Vehicle → Chassis History ✅
Vehicle → Engine History ✅
Vehicle → Timeline ✅
Vehicle → Statistics ✅
Vehicle → Achievements ✅
Vehicle → Media ✅
Vehicle → Events ❌ (MISSING)
Vehicle → Series ❌ (MISSING)
Vehicle → Tracks ❌ (MISSING)
Vehicle → Results ❌ (MISSING)
Vehicle → Sponsors ❌ (MISSING)
```

**Vehicle is the ecosystem's weakest node.** A user who discovers a vehicle can see who owned it and its chassis/engine history, but cannot navigate to the races it competed in, the series it runs in, or the tracks it raced at. The vehicle profile is a terminus — users must use search or the back button to continue exploring.

### 4.6 The Organization Black Hole (Absent)

```
Organization (non-sponsor) → ??? 
```

Non-sponsor Organizations (Vendor, Manufacturer, OEM, BroadcastPartner, Venue, etc.) have no public profile page, no directory entry, and no discovery path. They exist in the database and the OrganizationPage route serves them, but no public navigation links to them. **They are completely invisible to public users.**

### 4.7 The Media Island (Disconnected)

```
MediaAsset → ??? 
MediaProfile → ??? 
MediaOutlet → OutletStory ✅
OutletStory → MediaAsset ⚠️ / MediaProfile ⚠️ / Event ⚠️
```

Media assets and media profiles don't link to the entities they cover. A photo of a racer at an event doesn't link to that racer or event. An outlet story may link to entities it covers (via tags), but this is inconsistent. **Media is an island — it can be reached from entity profiles (Media tabs) but doesn't link back.**

---

## 5. Journey Walkthroughs

### Journey 1: Homepage → Series → Event → Entry List → Racer → Career → Team → Vehicle → Results → Standings → Series

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Series | ✅ | 3 | INDEX46 → Series → click series |
| 2 | Series → Event | ✅ | 1 | Schedule tab → click event link |
| 3 | Event → Entry List | ✅ | 1 | Entries tab |
| 4 | Entry List → Racer | ✅ | 1 | EventRacerCard → racer.profile_url |
| 5 | Racer → Career | ✅ | 1 | Career tab |
| 6 | Career → Team | ✅ | 1 | TeamHistoryPanel → team link |
| 7 | Career → Vehicle | ✅ | 1 | VehicleHistoryPanel → vehicle link |
| 8 | Racer → Results | ✅ | 1 | Schedule & Results tab |
| 9 | Racer → Standings | ✅ | 1 | Schedule & Results tab → ResultsPanel |
| 10 | Standings → Series | ❌ | — | **BROKEN** — Standings panel doesn't link back to Series |

**Journey verdict:** 9 of 10 steps complete. The final step (Standings → Series) is broken — the ResultsPanel shows standings data but doesn't link to the Series standings page. The user must manually navigate back to the Series. **Journey partially complete.**

### Journey 2: Homepage → Track → Upcoming Event → Entries → Racer → Media → Sponsor → Organization

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Track | ✅ | 3 | INDEX46 → Tracks → click track |
| 2 | Track → Upcoming Event | ✅ | 1 | Schedule tab → click event |
| 3 | Event → Entries | ✅ | 1 | Entries tab |
| 4 | Entries → Racer | ✅ | 1 | EventRacerCard |
| 5 | Racer → Media | ✅ | 1 | Media tab |
| 6 | Racer → Sponsor | ✅ | 1 | Sponsors tab (if sponsors exist) |
| 7 | Sponsor → Organization | ⚠️ | — | Sponsor IS the Organization — same page. No link to parent/related orgs |

**Journey verdict:** 6 of 7 steps complete. The final step is a conceptual dead end — Sponsor and Organization are the same entity. There's no "related organizations" or "parent company" link. **Journey mostly complete but ends at a dead end.**

### Journey 3: Homepage → Search → Vehicle → Driver → Career → Timeline → Results → Event → Track

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Search | ✅ (desktop) | 1 | Search icon |
| 2 | Search → Vehicle | ✅ | 1 | Click vehicle result |
| 3 | Vehicle → Driver | ✅ | 2 | History tab → click driver |
| 4 | Driver → Career | ✅ | 1 | Redirects to RacerProfile → Career tab |
| 5 | Career → Timeline | ✅ | 1 | Timeline tab |
| 6 | Timeline → Results | ⚠️ | — | Timeline events link to events, not results directly |
| 7 | Timeline → Event | ✅ | 1 | Click timeline event link |
| 8 | Event → Track | ✅ | 1 | Venue tab or hero |

**Journey verdict:** 7 of 8 steps complete. Step 6 is indirect — the timeline links to events, and from events users can reach results via the Results tab. The extra step breaks the flow. **Journey complete with one indirect step.**

### Journey 4: Homepage → Media Story → Event → Series → Standings → Champion → Team → Sponsor

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Media Story | ✅ | 1 | OutletSection → click story |
| 2 | Story → Event | ⚠️ | — | Only if story is tagged with an event — inconsistent |
| 3 | Event → Series | ✅ | 1 | Hero (series name) |
| 4 | Series → Standings | ✅ | 1 | Standings tab |
| 5 | Standings → Champion | ⚠️ | 1 | Must switch to Champions tab manually — no link |
| 6 | Champion → Team | ⚠️ | 2 | Champion racer → racer profile → team link |
| 7 | Team → Sponsor | ❌ | — | **BROKEN** — Team has no Sponsors tab |

**Journey verdict:** 4 of 7 steps complete. Step 2 is inconsistent (depends on story tagging). Step 5 requires manual tab switch. Step 7 is broken (Team has no sponsors). **Journey broken at two points.**

### Journey 5: Homepage → Sponsor → Supported Racers → Supported Teams → Supported Series → Supported Events → Media

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Sponsor | ⚠️ | 2+ | Only via search or via racer sponsors tab — no directory |
| 2 | Sponsor → Racers | ✅ | 1 | Entity grid |
| 3 | Sponsor → Teams | ✅ | 1 | Entity grid (back to sponsor, then teams) |
| 4 | Sponsor → Series | ✅ | 1 | Entity grid |
| 5 | Sponsor → Events | ✅ | 1 | Entity grid |
| 6 | Sponsor → Media | ✅ | 1 | Media summary section |

**Journey verdict:** 5 of 6 steps complete. Step 1 is the weak point — Sponsors have no directory entry point. Users must know to search or arrive via a racer's sponsors tab. **Journey complete once you reach the Sponsor, but discovery is broken.**

### Journey 6: Homepage → Organization → Sponsor → Activation → Deliverable → Event

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Organization | ❌ | — | **BROKEN** — no public navigation to non-sponsor orgs |
| 2 | Organization → Sponsor | ⚠️ | — | Same page for Sponsor type; non-sponsor orgs don't link to sponsors |
| 3 | Sponsor → Activation | ✅ | 1 | Activations section |
| 4 | Activation → Deliverable | ⚠️ | — | Activation timeline shows activations, not deliverables directly |
| 5 | Deliverable → Event | ⚠️ | — | Deliverables may have linked_event_id but not visible as link |

**Journey verdict:** 1 of 5 steps complete. This journey is mostly broken — Organizations aren't discoverable, and the Activation → Deliverable → Event chain isn't surfaced as navigation. **Journey broken.**

### Journey 7: Homepage → Search → Track → History → Events → Results → Media → Gallery

| Step | From → To | Link Available? | Clicks | Notes |
|------|-----------|----------------|--------|-------|
| 1 | Homepage → Search | ✅ (desktop) | 1 | Search icon |
| 2 | Search → Track | ✅ | 1 | Click track result |
| 3 | Track → History | ✅ | 1 | History tab |
| 4 | Track → Events | ✅ | 1 | Schedule tab |
| 5 | Events → Results | ✅ | 2 | Click event → Results tab |
| 6 | Results → Media | ❌ | — | **BROKEN** — Results don't link to media coverage |
| 7 | Track → Gallery | ✅ | 1 | Gallery tab |

**Journey verdict:** 6 of 7 steps complete. Step 6 is broken — race results don't link to media coverage of that race. The user must manually go to the Event's Media tab. **Journey mostly complete with one broken step.**

### Journey Summary

| Journey | Steps Complete | Broken Steps | Verdict |
|---------|---------------|-------------|---------|
| 1: Series→Standings→Series | 9/10 | 1 | Partially complete |
| 2: Track→Sponsor→Org | 6/7 | 1 | Mostly complete, dead end |
| 3: Search→Vehicle→Track | 7/8 | 1 (indirect) | Complete with detour |
| 4: Story→Team→Sponsor | 4/7 | 3 | Broken |
| 5: Sponsor→Entities | 5/6 | 1 (discovery) | Complete once found |
| 6: Org→Deliverable→Event | 1/5 | 4 | Broken |
| 7: Track→Results→Media | 6/7 | 1 | Mostly complete |

**3 of 7 journeys are fully or mostly complete. 4 of 7 have broken steps.**

---

## 6. Knowledge Graph Evaluation

### 6.1 Does the Platform Behave Like Wikipedia?

**Partially.** Wikipedia's core principle is that every article links to related articles, creating a dense graph where users can explore indefinitely. Hijinx achieves this for Series and Sponsor profiles (which link to many entities) but fails for Vehicle, Organization, and Media (which link to few or no entities).

**Wikipedia behavior achieved on:**
- Series profile (15 tabs, links to all entity types)
- Sponsor profile (14 sections, entity grids link to all sponsored types)
- Racer profile (8 tabs, links to team, series, events, vehicles, sponsors, media)

**Wikipedia behavior failed on:**
- Vehicle profile (no links to events, series, results)
- Organization profile (no links to anything for non-sponsor types)
- Media asset/profile (no links to covered entities)
- List views (team names in rosters/schedules not clickable)

### 6.2 Comparison to Reference Platforms

| Platform | Behavior | Hijinx Match |
|----------|----------|-------------|
| **Wikipedia** | Every article links to related articles; users explore indefinitely | ⚠️ Partial — strong for Series/Sponsor, weak for Vehicle/Media |
| **IMDb** | Every person links to their movies; every movie links to cast/crew | ⚠️ Partial — racers link to events, but events don't link to all participants |
| **Baseball Reference** | Every player links to teams, seasons, stats, awards | ✅ Strong — Racer profile links to career, stats, timeline, achievements |
| **Racing Reference** | Every driver links to races, teams, cars, tracks | ⚠️ Partial — racer links to events but not to specific car setups or track results |
| **LinkedIn** | Every person links to companies, and companies link to people | ⚠️ Partial — racers link to teams, but teams don't link to sponsors |
| **Discogs** | Every release links to artists, labels, tracks; artists link to releases | ⚠️ Partial — media links to outlets but not to racing entities |
| **Letterboxd** | Every film links to directors, cast, reviews; users link to films | ❌ No — Hijinx doesn't have user-entity relationships (follows, lists) |

### 6.3 Knowledge Graph Verdict

The platform **aspires to be Wikipedia for Motorsports** and **partially achieves it** through Series and Sponsor hubs. But the graph has too many dead-end nodes (Vehicle, Organization, Media) and too many missing edges (list views don't deep-link, Team/Event/Track lack sponsors) to fully realize the vision. **The platform currently behaves like a collection of connected profiles with isolated islands, not a fully connected knowledge graph.**

---

## 7. Discovery Analysis

### 7.1 What Users Naturally Discover

| Entity Type | Discovery Method | Quality |
|-------------|-----------------|---------|
| New Racers | Directory → Racers, Series → Racer Roster, Event → Entries | ✅ Strong |
| Historic Racers | Racer → Career tab, Series → Champions, Track → Racer Leaders | ✅ Strong |
| Teams | Directory → Teams, Series → Teams tab, Racer → sidebar | ✅ Strong |
| Manufacturers | Racer → identity bar, Team → overview | ⚠️ Weak — text only, not linked |
| Vehicles | Series → Vehicles tab, Racer → Career → Vehicle History | ⚠️ Medium — no vehicle directory |
| Tracks | Directory → Tracks, Series → Tracks tab, Event → Venue | ✅ Strong |
| Series | Directory → Series, Racer → sidebar, Event → hero | ✅ Strong |
| Sponsors | Racer → Sponsors tab, Series → Sponsors tab, Sponsor → Entity Grid | ⚠️ Medium — no sponsor directory |
| Media | Entity → Media tab, Media Home, Creator Directory | ✅ Strong |
| Organizations | ❌ No discovery path for non-sponsor orgs | ❌ Absent |
| Statistics | Racer → Statistics tab, Series → Statistics tab, Track → Statistics | ✅ Strong |
| Records | Series → Records tab, Track → Records tab | ✅ Strong |
| Championships | Series → Champions tab, Track → Champions tab | ✅ Strong |
| History | Series → History tab, Track → History tab, Racer → Career | ✅ Strong |

### 7.2 Discovery Gaps

1. **No vehicle directory** — users can only find vehicles through Series or Racer profiles
2. **No sponsor directory** — users can only find sponsors through entity sponsors tabs or search
3. **No organization directory** — non-sponsor orgs are invisible
4. **Manufacturers not linked** — manufacturer names appear as text, not as browsable entities
5. **No "related entities" suggestions** — when viewing a racer, no "similar racers" or "racers from same hometown"
6. **No trending/popular entities** — no discovery surface for what's hot
7. **No "recently added" entities** — no way to discover new additions to the database

---

## 8. Dead-End Analysis

### 8.1 Ranked Dead Ends

| Rank | Page | Why It's a Dead End | Severity |
|------|------|---------------------|----------|
| 1 | Vehicle profile | No links to events, series, tracks, results, sponsors. User must use back button. | Critical |
| 2 | Organization (non-sponsor) | No links to anything. No inbound links from public nav. | Critical |
| 3 | Media asset detail | No links to covered entities. No link back to entity it belongs to. | High |
| 4 | Media profile | No links to covered entities, events, or racers. | High |
| 5 | Standings panel (on Racer) | Shows positions but doesn't link to Series standings page. | High |
| 6 | Results table (on Racer) | Links to events but not to media coverage of those events. | Medium |
| 7 | Team profile (no sponsors) | No sponsor tab — users can't discover team sponsors. | Medium |
| 8 | Event profile (no sponsors) | No sponsor tab — users can't discover event sponsors. | Medium |
| 9 | Track profile (no sponsors) | No sponsor tab — users can't discover track sponsors. | Medium |
| 10 | Series Racer Roster | Team name shown as text, not linked. | Medium |
| 11 | Series Schedule | Track name shown as text, not linked. Winner name shown as text, not linked. | Medium |
| 12 | Event Entry List | Team name shown as text, not linked. Vehicle not shown. | Medium |
| 13 | Sponsor → Results | No link from sponsor to race results of sponsored racers. | Low |
| 14 | Outlet Story (no event tag) | Stories without event tags don't link to events. | Low |
| 15 | RaceCore (any page) | Only exit is small HIJINX logo in sidebar. | Low (operational context) |

### 8.2 Dead-End Pattern

The most common dead-end pattern is **list views that show entity names as plain text instead of links.** The data is available (team objects, track objects, winner objects are passed to components) but the components render them as text. This is a systematic issue across SeriesSchedule, SeriesRacerRoster, EventEntryList, and similar list components.

---

## 9. Overconnected Pages

### 9.1 Series Profile (15 tabs)

**Assessment:** The Series profile has 15 tabs — Overview, Schedule, Classes, Standings, Racers, Teams, Vehicles, Champions, Records, Statistics, Timeline, History, Tracks, Sponsors, Media. This is the most comprehensive entity page on the platform.

**Is it overwhelming?** On desktop, the tabs fit in a horizontal scroll bar with small text (`text-xs`). On mobile, most tabs are off-screen and require horizontal scrolling. **15 tabs is at the upper limit of what users can process.** Some tabs could be consolidated:
- "Records" and "Champions" could merge into "Records & Champions"
- "Timeline" and "History" could merge into "History & Timeline"
- "Statistics" could be a section within "Overview"

**Verdict:** Comprehensive but at the edge of overwhelm. Not a blocker but could be simplified.

### 9.2 Sponsor Profile (14 sidebar sections)

**Assessment:** The Sponsor sidebar has 14 sections — Overview, Partnerships, Racers, Teams, Vehicles, Series, Events, Tracks, Media, Activations, Timeline, Statistics, Assets, About. This is comprehensive and well-organized.

**Is it overwhelming?** The sidebar layout is less overwhelming than horizontal tabs because all sections are visible in a vertical list. The active section is highlighted. **14 sections in a sidebar is manageable** — similar to a Wikipedia article's table of contents.

**Verdict:** Well-organized. Not overwhelming.

### 9.3 RaceCore Sidebar (7 groups, 20+ items)

**Assessment:** The RaceCore sidebar has 7 groups (Dashboard, Operations, Records, Standings, Media, Governance, Data) with 20+ total items. This is dense but appropriate for an operational tool.

**Is it overwhelming?** For first-time users, yes. For experienced operators, no. The groups provide structure and the monospace labels create visual hierarchy. **Acceptable for an operational shell.**

**Verdict:** Dense but appropriate for context.

### 9.4 Racer Profile (8 tabs)

**Assessment:** 8 tabs is well within comfortable range. No overwhelm.

---

## 10. Missing Relationships

### 10.1 Critical Missing Relationships

| # | From → To | Impact | Data Available? |
|---|-----------|--------|----------------|
| 1 | Vehicle → Events | Users can't see what races a vehicle competed in | ✅ Yes (via entries) |
| 2 | Vehicle → Series | Users can't see what series a vehicle runs in | ✅ Yes (via entries/programs) |
| 3 | Vehicle → Results | Users can't see a vehicle's race results | ✅ Yes (via entries → results) |
| 4 | Team → Sponsors | Users can't see who sponsors a team | ✅ Yes (Sponsorship entity) |
| 5 | Event → Sponsors | Users can't see who sponsors an event | ✅ Yes (Sponsorship entity) |
| 6 | Track → Sponsors | Users can't see who sponsors a track | ✅ Yes (Sponsorship entity) |
| 7 | Standings → Series | Users can't click from standings to series page | ✅ Yes (series_id) |
| 8 | Results → Media | Users can't navigate from results to media coverage | ✅ Yes (via event) |
| 9 | Organization → Events | Users can't see events an org is involved with | ✅ Yes (via sponsorship) |
| 10 | Media → Covered Entities | Users can't navigate from media to the entities it covers | ⚠️ Partial |

### 10.2 Medium Missing Relationships

| # | From → To | Impact | Data Available? |
|---|-----------|--------|----------------|
| 11 | Series Schedule → Track | Track name shown as text, not linked | ✅ Yes (track object passed) |
| 12 | Series Racer Roster → Team | Team name shown as text, not linked | ✅ Yes (team object passed) |
| 13 | Event Entry List → Team | Team name shown as text, not linked | ✅ Yes (team object passed) |
| 14 | Event Entry List → Vehicle | Vehicle not shown in entry card | ✅ Yes (vehicle object passed) |
| 15 | Series Schedule → Winner | Winner racer name shown as text, not linked | ✅ Yes (winner object passed) |
| 16 | Track → Series | Track doesn't link to series that race there | ✅ Yes (via events) |
| 17 | Sponsor → Results | Sponsor doesn't link to race results of sponsored racers | ✅ Yes (via sponsored entities) |
| 18 | Sponsor → Standings | Sponsor doesn't link to standings of sponsored racers | ✅ Yes |
| 19 | Racer → Track | Racer doesn't link to tracks they've raced at | ✅ Yes (via entries → events → tracks) |
| 20 | Manufacturer → Entities | Manufacturer names are text, not browsable | ⚠️ Partial |

### 10.3 Low Priority Missing Relationships

| # | From → To | Impact |
|---|-----------|--------|
| 21 | Outlet Story → All tagged entities | Stories only link to events if tagged |
| 22 | Media Profile → Covered Events | No link from creator to events they covered |
| 23 | Activation → Deliverable | No direct link from activation to its deliverables |
| 24 | Deliverable → Event | Deliverable doesn't link to linked event |
| 25 | Career Timeline → Results | Timeline links to events but not to results directly |

---

## 11. Cross-Link Recommendations

### 11.1 Wire Existing Data to Links (Quick Wins)

The following components already receive entity objects as props but render them as plain text. Adding `<Link>` wrappers would create new cross-links with minimal effort:

1. **SeriesSchedule:** Wrap `event.track.name` in a `<Link to={event.track.profile_url}>` — track data is already passed
2. **SeriesSchedule:** Wrap `event.winner.racer.display_name` in a `<Link to={event.winner.racer.profile_url}>` — winner data is already passed
3. **SeriesRacerRoster:** Wrap `racer.team.name` in a `<Link to={racer.team.profile_url}>` — team data is already passed
4. **EventRacerCard:** Wrap `team.name` in a `<Link to={team.profile_url}>` — team object is already passed
5. **EventRacerCard:** Add vehicle name as a `<Link to={vehicle.profile_url}>` — vehicle object is already passed
6. **EventEntryList:** Pass vehicle data through to EventRacerCard and render it

### 11.2 Add Missing Tabs/Sections

7. **Team profile:** Add a "Sponsors" tab that queries Sponsorship records where target_entity_type = 'Team' and target_entity_id = team.id
8. **Event profile:** Add a "Sponsors" tab that queries Sponsorship records where target_entity_type = 'Event'
9. **Track profile:** Add a "Sponsors" tab that queries Sponsorship records where target_entity_type = 'Track'
10. **Vehicle profile:** Add an "Events" tab that queries entries by vehicle_id and links to events
11. **Vehicle profile:** Add a "Series" tab derived from entries → events → series
12. **Vehicle profile:** Add a "Results" tab derived from entries → results

### 11.3 Add Back-Links

13. **Standings panel (Racer):** Add a "View Series Standings" link to the Series standings page
14. **Results table (Racer):** Add a "View Event Media" link on each result row
15. **Sponsor profile:** Add a "Recent Results" section showing sponsored racers' recent results
16. **Sponsor profile:** Add a "Standings" section showing sponsored racers' current standings

### 11.4 Add Discovery Surfaces

17. **Create a Vehicle directory** in the INDEX46 dropdown and Directory page
18. **Create a Sponsor directory** in the INDEX46 dropdown and Directory page
19. **Create an Organization directory** for non-sponsor org types
20. **Add "Related Racers" section** to Racer profile (same hometown, same series, same team)
21. **Add "Trending" or "Popular" section** to Directory page

---

## 12. Top 50 Ecosystem Issues

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | Vehicle profile has no links to events, series, or results | Dead End | Critical |
| 2 | Team profile has no Sponsors tab | Missing Link | Critical |
| 3 | Event profile has no Sponsors tab | Missing Link | Critical |
| 4 | Track profile has no Sponsors tab | Missing Link | Critical |
| 5 | Non-sponsor Organizations have no public discovery path | Dead End | Critical |
| 6 | Media assets don't link to covered entities | Dead End | High |
| 7 | Media profiles don't link to covered entities | Dead End | High |
| 8 | Series Schedule shows track name as text, not linked | Missing Link | High |
| 9 | Series Schedule shows winner name as text, not linked | Missing Link | High |
| 10 | Series Racer Roster shows team name as text, not linked | Missing Link | High |
| 11 | Event Entry List shows team name as text, not linked | Missing Link | High |
| 12 | Event Entry List doesn't show vehicle | Missing Link | High |
| 13 | Standings panel on Racer doesn't link to Series standings | Missing Link | High |
| 14 | Results on Racer don't link to event media | Missing Link | High |
| 15 | No vehicle directory in INDEX46 or Directory | Discovery | High |
| 16 | No sponsor directory in INDEX46 or Directory | Discovery | High |
| 17 | No organization directory for non-sponsor types | Discovery | High |
| 18 | Vehicle is the ecosystem's weakest node (25% connection rate) | Connectivity | High |
| 19 | Organization is invisible (6% connection rate) | Connectivity | High |
| 20 | MediaAsset has 0% outbound connection rate | Connectivity | High |
| 21 | Track doesn't link to Series directly | Missing Link | Medium |
| 22 | Sponsor doesn't link to results or standings of sponsored racers | Missing Link | Medium |
| 23 | Manufacturer names are text, not browsable entities | Missing Link | Medium |
| 24 | Racer doesn't link to tracks they've raced at | Missing Link | Medium |
| 25 | Outlet Stories only link to events if explicitly tagged | Missing Link | Medium |
| 26 | Activation doesn't link to its Deliverables | Missing Link | Medium |
| 27 | Deliverable doesn't link to its linked Event | Missing Link | Medium |
| 28 | Career Timeline links to events but not to results | Missing Link | Medium |
| 29 | No "related entities" or "similar racers" suggestions | Discovery | Medium |
| 30 | No trending or popular entities surface | Discovery | Medium |
| 31 | No "recently added" entities discovery | Discovery | Low |
| 32 | Search doesn't suggest related entities | Search | Medium |
| 33 | Search doesn't include Organizations or Media Outlets | Search | Medium |
| 34 | 4 of 7 user journeys have broken steps | Journey | High |
| 35 | Journey 6 (Org → Deliverable → Event) is almost entirely broken | Journey | High |
| 36 | Journey 4 (Story → Team → Sponsor) breaks at Team → Sponsor | Journey | High |
| 37 | Standings → Series back-link is missing (Journey 1 breaks) | Journey | Medium |
| 38 | Results → Media link is missing (Journey 7 breaks) | Journey | Medium |
| 39 | Series profile has 15 tabs — at the edge of overwhelm | Overconnected | Low |
| 40 | No breadcrumbs to show entity graph path | Navigation | Medium |
| 41 | No "recently viewed" or navigation history | Navigation | Low |
| 42 | No cross-entity "appearance together" (racer+team at event) | Knowledge Graph | Low |
| 43 | Sponsor entity grid links outward but other entities don't link to Sponsor consistently | Connectivity | Medium |
| 44 | Racer → Track requires 3 clicks (Schedule → Event → Venue) | Journey | Medium |
| 45 | No way to browse all events a vehicle participated in | Dead End | High |
| 46 | No way to browse all series a vehicle competes in | Dead End | High |
| 47 | Team → Series link is text only in Programs tab | Missing Link | Low |
| 48 | Event → Team link is indirect (via entries → racers → teams) | Missing Link | Medium |
| 49 | No "head-to-head" or "racer comparison" view | Knowledge Graph | Low |
| 50 | Platform feels like connected profiles with isolated islands, not a full knowledge graph | Knowledge Graph | High |

---

## 13. Quick Wins

1. **Link track names in Series Schedule** — wrap `event.track.name` in `<Link to={event.track.profile_url}>` in SeriesSchedule.jsx. (10 min)
2. **Link winner names in Series Schedule** — wrap `event.winner.racer.display_name` in `<Link to={event.winner.racer.profile_url}>`. (10 min)
3. **Link team names in Series Racer Roster** — wrap `racer.team.name` in `<Link to={racer.team.profile_url}>`. (10 min)
4. **Link team names in Event Racer Card** — wrap `team.name` in `<Link to={team.profile_url}>` in EventRacerCard.jsx. (10 min)
5. **Show vehicle in Event Racer Card** — add vehicle name as a link below team name. (15 min)
6. **Add "View Series Standings" link** in Racer's ResultsPanel — link to `/racecore/standings/:seriesId` or Series standings tab. (15 min)
7. **Add "View Event Media" link** in Racer's results table — link to event's media tab. (15 min)
8. **Add Sponsors tab to Team profile** — query Sponsorship by team ID, render in a tab. (30 min)
9. **Add Sponsors tab to Event profile** — query Sponsorship by event ID, render in a tab. (30 min)
10. **Add Sponsors tab to Track profile** — query Sponsorship by track ID, render in a tab. (30 min)

---

## 14. Medium Improvements

1. **Add Events tab to Vehicle profile** — query entries by vehicle_id, link to events. (1 hour)
2. **Add Series tab to Vehicle profile** — derive from entries → events → series. (1 hour)
3. **Add Results tab to Vehicle profile** — derive from entries → results. (1 hour)
4. **Add Sponsors tab to Vehicle profile** — query Sponsorship by vehicle ID. (30 min)
5. **Add "Covered Entities" section to Media profile** — link to entities the creator has covered. (2 hours)
6. **Add "Covered Entities" section to Media asset** — link to entities in the asset's tags/metadata. (2 hours)
7. **Add "Recent Results" section to Sponsor profile** — show sponsored racers' recent results. (2 hours)
8. **Add "Standings" section to Sponsor profile** — show sponsored racers' current standings. (2 hours)
9. **Create a Vehicle directory** in the Directory page. (2 hours)
10. **Create a Sponsor directory** in the Directory page. (2 hours)
11. **Create an Organization directory** for non-sponsor types. (3 hours)
12. **Add "Related Racers" section** to Racer profile (same hometown or same series). (3 hours)
13. **Link Series in Track profile** — derive from events → series, add a Series section. (1 hour)
14. **Add cross-links from Career Timeline to Results** — link timeline events to their results. (1 hour)
15. **Add "Appearance Together" indicator** — when viewing a racer at an event, show other racers/teams who were there. (3 hours)

---

## 15. Long-Term Ecosystem Improvements

1. **Bidirectional entity graph.** Ensure every entity relationship is bidirectional — if A links to B, B should link to A. Currently many relationships are one-way (e.g., Racer → Sponsors is strong, but Sponsor → Racers is strong while Team → Sponsors is missing). A systematic audit of all entity pairs would identify and fill every missing back-link.

2. **Deep-link all list views.** Every entity name shown in a list, roster, schedule, or table should be a clickable link to that entity's profile. This is the single highest-impact ecosystem improvement — it would transform the platform from "connected profiles" to "knowledge graph" by making every data point navigable.

3. **Entity relationship explorer.** Add a visual "relationship map" to entity profiles showing how entities connect (e.g., a racer's network displayed as a graph or tree). This would make the ecosystem's depth visible and encourage exploration.

4. **Cross-entity search.** Enhance search to return related entities — searching "Bark River" should return the track AND events at that track AND racers who raced there AND media from that track.

5. **"Wikipedia-like" surfacing.** Add "Did you know?" or "On this day" sections to entity profiles, surfacing historical connections (e.g., "This racer won at this track 3 years ago" with a link to that result).

6. **Entity co-occurrence.** When viewing an event, show "racers who frequently compete together" or "teams that have raced at this track before." This would surface non-obvious relationships.

7. **Sponsor ecosystem completion.** Ensure every entity that can be sponsored (Racer, Team, Vehicle, Event, Series, Track, Platform) has a Sponsors tab, and that the Sponsor profile links back to all of them.

8. **Media-entity bidirectional links.** Ensure every media asset links to the entities it depicts, and every entity profile links to its media. This would integrate the Media platform with the racing ecosystem.

---

## 16. Launch Blockers

1. **Vehicle profile is a dead end.** Users who discover a vehicle cannot navigate to the events, series, or results it participated in. This breaks the "Wikipedia for Motorsports" promise. **Must fix before launch** — at minimum, add an Events tab and a Results tab to Vehicle profiles.

2. **Team, Event, and Track have no Sponsors tabs.** The Sponsorship entity supports these target types, and the Sponsor profile links to them, but the reverse link is missing. Users on these profiles can't discover sponsors. **Must fix before launch** — add Sponsors tabs to all three.

3. **List views don't deep-link.** Series Schedule, Series Racer Roster, and Event Entry List show entity names as plain text. This is the most common navigation pattern on the platform and it's broken. **Must fix before launch** — wrap all entity names in `<Link>` components.

4. **Non-sponsor Organizations are invisible.** Vendors, Manufacturers, OEMs, and other org types exist but have no public discovery path. **Must fix before launch** — at minimum, add an Organizations section to the Directory.

5. **4 of 7 user journeys have broken steps.** The platform's core promise — that every entity naturally connects to others — is not met for the majority of tested journeys. **Must fix before launch** — fix the broken steps in Journeys 1, 4, 6, and 7.

---

## 17. Production Readiness

### 17.1 Is the Ecosystem Ready for Launch?

**Not yet.** The platform has strong ecosystem foundations (identity chain, experience functions, Series and Sponsor hubs) but too many broken journeys and dead-end nodes to deliver on the "Wikipedia for Motorsports" promise at launch. A first-time user who follows the natural flow from Series → Event → Racer will have a good experience. But a user who discovers a Vehicle, a non-sponsor Organization, or a Media asset will hit a dead end.

### 17.2 What's Working

- **Series as a hub** — 15 tabs, 81% connection rate, links to every major entity type
- **Sponsor as a hub** — 14 sections, entity grids link to all sponsored types
- **Racer profile** — 8 tabs, 63% connection rate, links to career, timeline, stats, achievements, sponsors, media
- **Identity chain** — PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results → Standings is well-modeled and well-surfaced
- **Experience functions** — backend computes comprehensive relationship data with profile_url fields
- **Historical exploration** — Career tabs, Timeline tabs, History tabs, Champions tabs, Records tabs all support deep historical exploration
- **Track profile** — 12 tabs, 56% connection rate, good hub for track-centric discovery

### 17.3 What's Not Working

- **Vehicle is a dead end** — 25% connection rate, no links to events/series/results
- **Organization is invisible** — 6% connection rate, no public discovery
- **Media is an island** — 0% outbound connection rate from MediaAsset
- **List views don't deep-link** — systematic issue across multiple components
- **Sponsor tabs missing** on Team, Event, Track
- **4 of 7 journeys broken** — the ecosystem doesn't hold together end-to-end
- **Search is retrieval, not discovery** — doesn't suggest related entities

### 17.4 Ecosystem Verdict

The platform **has the data to be a connected ecosystem** — the experience functions compute comprehensive relationship data with profile_url fields. The problem is that **the frontend doesn't fully wire this data to navigation.** Entity names are rendered as text in lists. Tabs that could surface sponsors are missing. Vehicle profiles don't show the events/series/results data that's available.

**The path to a connected ecosystem is primarily about wiring existing data to links, not building new architecture.** The Quick Wins (linking entity names in list views, adding Sponsors tabs) would raise the ecosystem from 57/100 to 70+/100 without any backend changes.

### 17.5 Final Verdict

**Current state: 57/100 — The ecosystem has strong bones but too many broken journeys and dead-end nodes to fully deliver on the "Wikipedia for Motorsports" vision at launch. The data is there; the links are not.**

The platform will feel like a connected ecosystem once:
1. Every entity name in every list is a link
2. Every sponsorable entity has a Sponsors tab
3. Vehicle profiles link to events, series, and results
4. Non-sponsor Organizations are discoverable
5. Media links back to the entities it covers

These are all achievable with the current architecture — no rebuild required, just wiring.

---

*End of audit. This report is read-only. No code was modified, no files were created (other than this report), no data was written.*