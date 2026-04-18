# ShotCaller — App Design & Development Handoff

Disc golf tournament preparation app. Read this entire file before writing any code.

---

## 1. App Overview

**App name:** ShotCaller  
**Tagline:** You call the shots.  
**Platform:** iOS and Android (React Native + Expo)

ShotCaller helps disc golfers prepare for tournaments. Players build their disc collection, log practice rounds with detailed throw data, and automatically generate a hole-by-hole game plan before competition.

### Tech stack
- **React Native with Expo** — single codebase for iOS and Android
- **Expo SQLite** — on-device database, fully offline
- **TypeScript** — required throughout
- **Supabase** — backend/auth/cloud sync (future feature, not v1)

---

## 2. The Three Round Modes

The app has three distinct modes. They share the same throw-logging screen but behave differently.

| Mode | Purpose | Key difference |
|------|---------|----------------|
| Practice round | Log throws and build data | No recommendations shown. Pure data collection. |
| Game plan | Pre-round hole-by-hole planning | Review app recommendations, override if needed, lock in. |
| Tournament round | Execute the plan and track results | Read-only game plan at top. Disc and shot pre-selected from plan. |

---

## 3. Data Model

Use SQLite on-device via Expo SQLite. Scaffold all tables before building any screens.

### DISC
Stores the player's full disc collection (not just what's currently in the bag).

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | Auto-increment |
| manufacturer | string | e.g. "Innova", "Discraft" |
| model | string | e.g. "Destroyer", "Buzzz" |
| color | string | Hex color code from swatch picker |
| category | enum | DD \| FWD \| MID \| P&A |
| in_bag | boolean | Default false. True = currently in tournament bag |
| speed | float (nullable) | Optional flight number |
| glide | float (nullable) | Optional flight number |
| turn | float (nullable) | Optional flight number |
| fade | float (nullable) | Optional flight number |

### TAG
User-created labels to distinguish discs. Pre-seed with common tags on first launch: Flippy, Overstable, Understable, Stable, Beat-in, Gamer, New, Roller disc.

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| name | string | e.g. "Flippy", "Gamer", "Beat-in" |

### DISC_TAG
Join table linking discs to tags. One disc can have many tags.

| Column | Type | Notes |
|--------|------|-------|
| disc_id | integer FK | References DISC.id |
| tag_id | integer FK | References TAG.id |

### COURSE

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| name | string | e.g. "Hawk Run DGC" |
| location | string | City, State |

### LAYOUT
A course can have multiple layouts (e.g. Short, Long, Tournament). **Holes belong to a LAYOUT, not directly to a course.**

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| course_id | integer FK | References COURSE.id |
| name | string | e.g. "Tournament", "Short", "Long tees" |

### HOLE
Belongs to a LAYOUT, not directly to a COURSE.

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| layout_id | integer FK | References LAYOUT.id |
| hole_number | integer | 1–18 (or 1–9 for 9-hole layouts) |
| par | integer | 2, 3, 4, or 5 |
| distance_ft | integer | Tee to basket in feet |

### PRACTICE_SESSION

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| layout_id | integer FK | References LAYOUT.id |
| session_date | date | ISO date string |
| notes | string (nullable) | Optional session-level notes |

### THROW
The core data table. Every throw in every practice session is logged here.

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| session_id | integer FK | References PRACTICE_SESSION.id |
| hole_id | integer FK | References HOLE.id |
| disc_id | integer FK | References DISC.id |
| throw_type | enum | Backhand \| Forehand \| Overhand |
| shot_shape | enum | See enums section |
| result | enum | Basket \| C1 \| C2 \| Fairway \| Rough \| OB |
| distance_from_basket_ft | integer (nullable) | In feet. Null for OB or Basket |
| notes | string (nullable) | Optional free-text note per throw |

### GAME_PLAN_SHOT
Generated after practice sessions. One row per hole, representing the recommended or player-adjusted shot for the tournament.

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| session_id | integer FK | References PRACTICE_SESSION.id |
| hole_id | integer FK | References HOLE.id |
| disc_id | integer FK | References DISC.id |
| throw_type | enum | Backhand \| Forehand \| Overhand |
| shot_shape | enum | See enums section |
| notes | string (nullable) | Player notes surfaced in game plan review |
| is_manual_override | boolean | True if player overrode the app recommendation |

---

## 4. Enums

Use these fixed lists everywhere. Never allow free-text entry for these fields.

### throw_type
- `Backhand`
- `Forehand`
- `Overhand`

### shot_shape
- `Hyzer`
- `Flat`
- `Anhyzer`
- `Flex`
- `Turnover`
- `Roller`
- `Spike hyzer`
- `Thumber` — **auto-sets throw_type to Overhand**
- `Tomahawk` — **auto-sets throw_type to Overhand**

> When user selects Thumber or Tomahawk, automatically set throw_type = Overhand and disable the throw_type selector. Re-enable if they switch to a different shot shape.

### result
- `Basket`
- `C1` — within ~10m of basket
- `C2` — within ~20m of basket
- `Fairway`
- `Rough` — off fairway, inbounds
- `OB` — out of bounds

### disc category
- `DD` — Distance Driver
- `FWD` — Fairway Driver
- `MID` — Midrange
- `P&A` — Putt & Approach

---

## 5. Screen Inventory

Build in this order — each screen depends on the previous.

| # | Screen | Nav location | Key notes |
|---|--------|-------------|-----------|
| 1 | Home | Bottom nav — Home | Entry point. Routes to 3 modes. Shows last practice session stats. |
| 2 | My Discs | Bottom nav — My discs | Full collection + in-bag toggle. Swipe left to delete. Add via bottom sheet. |
| 3 | Courses | Bottom nav — Courses | Search + manual add. Tap course to expand layouts. Select layout to start. |
| 4 | Practice round — Throw screen | Via Home → Practice round | No recommendations. Pure logging. Notes field per throw. |
| 5 | Game plan review | Via Home → Game plan | Hole-by-hole. Shows recommendation, stats, notes. Override controls. Lock in button. |
| 6 | Tournament round — Throw screen | Via Home → Tournament round | Game plan card (read-only) + practice notes at top. Pre-selects planned disc/shot. |

### Bottom navigation tabs
- Home
- My discs
- Courses
- Stats (future screen — include tab now, build later)

---

## 6. Key UX Rules

### Color language
Use these colors consistently across all three modes. Players must always know which mode they are in.

| Mode | Color | Used on |
|------|-------|---------|
| Practice | Blue `#5b8af5` | Mode badge, selected pills, Log button |
| Game plan | Green `#4a9e5c` | Mode badge, confirm buttons |
| Tournament | Pink `#e8809a` | Mode badge, selected pills, Log button |

### Throw type auto-set
When user selects Thumber or Tomahawk as shot shape, automatically set `throw_type = Overhand` and disable (grey out) the throw type selector. Re-enable if they switch to a different shot shape.

### Disc selector pre-selection (Tournament round)
Pre-select the disc and shot shape from the game plan. Player only needs to tap Log throw if they execute as planned. Changing disc or shot shape is allowed but requires a deliberate tap.

### In-bag button
The bag button on disc cards uses solid green (`#3a9e5c`, white text) when the disc is in the bag. Gray background when not in the bag. No other indicator needed — the button color is sufficient.

### Swipe to delete
Disc cards support swipe-left to reveal a red Delete button, consistent with iOS Mail behavior. Swiping a new card automatically closes any previously open card.

### No data warning
When generating a game plan recommendation for a hole with zero practice throws, show an amber warning banner:  
> "No practice data for this hole. Recommendation is a best guess based on hole distance and par."

### Offline first
All data is stored locally in SQLite. The app must be fully functional with no internet connection. Cloud sync is a future feature.

---

## 7. Recommendation Logic

The game plan recommendation algorithm looks at all throws on a given hole across all practice sessions and finds the disc + throw_type + shot_shape combination with the best outcomes.

### "Best" is defined as:
1. Most throws resulting in Fairway, C2, C1, or Basket (in that priority order)
2. Fewest OB results
3. If tied, prefer the combination with more total throws (more data = more confidence)

### Confidence display
Show confidence level based on throw count on that hole:
- **4+ throws** — high confidence (●●●●, green `#4a9e5c`)
- **2–3 throws** — low confidence (●●○○, amber `#c4a84a`)
- **0–1 throws** — no data (○○○○, gray `#555870`) — show warning banner

### Stats shown in game plan review
For each hole, show these stats from practice data:
- **Throws** — total practice throws logged
- **Fairway %** — percentage of throws landing Fairway, C2, C1, or Basket
- **Best** — best single result achieved (Basket > C1 > C2 > Fairway > Rough > OB)
- **Notes** — all notes from practice throws on that hole, shown as a list

---

## 8. Suggested Build Order

1. Project setup — Expo + SQLite + TypeScript, scaffold all tables
2. My Discs screen — add, tag, bag toggle, swipe delete
3. Courses screen — manual add, layout creation
4. Practice round throw screen — the core logging flow
5. Game plan review screen — recommendation engine + override
6. Tournament round throw screen — read-only plan + logging
7. Home screen — wire all three modes together
8. Polish — offline handling, edge cases, empty states

---

## 9. First Prompt for Claude Code

Use this to start your first session:

```
Please read SHOTCALLER_HANDOFF.md before we start. Then set up a new React Native Expo project with Expo SQLite and scaffold all the database tables exactly as defined in the data model section. Use TypeScript. Name the project "shotcaller". Once the project is created and the tables are scaffolded, confirm the setup is working by showing me the database initialization code.
```
