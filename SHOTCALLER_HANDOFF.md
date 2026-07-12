# ShotCaller V2 — App Design & Development Handoff

Disc golf **game-planning** app. Read this entire file before writing any code.
This document supersedes the V1 handoff. Where an older file disagrees with this
one, **this file wins.**

> Companion doc: **`V2_DESIGN_HANDOFF.md`** is the UI/design brief (for Claude
> Design). This file is the product + engineering source of truth.

---

## 1. App Overview

**App name:** ShotCaller
**Tagline:** You call the shots.
**Platform:** iOS and Android via React Native + Expo (native is the primary
target). A web build exists as a **demo/preview channel** only.

ShotCaller V2 helps disc golfers **write and read a hole-by-hole game plan.** You
author a plan at home (calm, deliberate); you read it on the course, glanceably,
one hand, in sunlight, while walking.

**What ShotCaller is NOT:**
- **Not a scorekeeping app.** Players keep score in **UDisc** or the **PDGA** app.
  ShotCaller runs *alongside* those as a **second screen**. It never tracks score,
  strokes, or round results.
- **Not a stats/analytics app.** No throw logging, no per-hole statistics, no
  "best disc" recommendation engine. (V1 had all of this. It's cut — see §7.)

**The bar to clear:** the real competition is the **Notes app** and a **spreadsheet**.
Serious players already type plans into Apple Notes or a Google Sheet. ShotCaller
only earns its place by being **more disc-golf-native and easier** than that. Every
feature is measured against: *"Is this actually better than a note?"*

### Tech stack
- **React Native + Expo (SDK 54)** — single codebase, iOS + Android + web.
- **Expo SQLite** — on-device, fully offline. No account, no network in MVP.
- **TypeScript**, `strict: true`.
- **Supabase** — future sync/auth only. **Do not add it in MVP.**

---

## 2. The Two Modes

V2 has exactly two modes (V1 had three). Each has a signature **color that is
identity, not decoration** — it appears on badges, selected controls, and primary
actions so the player always knows which mode they're in. The two colors are
**finalized by design** (see `V2_DESIGN_HANDOFF.md`); the V1 three-color palette is
retired.

| Mode | Purpose | Where used |
|------|---------|-----------|
| **Plan** | Author the plan for each Course → Layout → Hole. Calm, deliberate, thumb-friendly. | At home / off the course. |
| **Play** | Read the plan on the tee: one hole per screen, glanceable in under 2 seconds. A **caddie card**, not a form. | On the course, one-handed, in sun. |

Unlike V1, these are **not one shared screen** — Plan (authoring) and Play
(reading) are designed for two very different moments and should not share density
or interaction patterns.

---

## 3. Data Model

Single on-device SQLite DB via Expo SQLite (`getDb()` in `src/db/index.ts`).
Enum string literals are defined once in `src/db/types.ts` and reused in both the
schema `CHECK` constraints and TypeScript types — **never duplicate enum literals.**

### Kept from V1 (unchanged foundation)

**DISC** — the player's full collection.

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| manufacturer | string | e.g. "Innova" |
| model | string | e.g. "Destroyer" |
| nickname | string (nullable) | When set, used as the disc's **primary display name** everywhere |
| color | string | Hex from swatch picker |
| category | enum | `DD` \| `FWD` \| `MID` \| `P&A` |
| in_bag | boolean | Default false. True = currently in the bag |
| speed / glide / turn / fade | float (nullable) | Optional flight numbers |
| plastic | string (nullable) | Optional |

**TAG / DISC_TAG** — disc characterization labels (Flippy, Overstable, Gamer, …),
seeded on first launch. Many-to-many via `disc_tag`. *(These describe discs, not
shots — kept.)*

**COURSE** — `id`, `name`, `location`.

**LAYOUT** — `id`, `course_id` FK, `name` (e.g. "Short", "Long", "Tournament").
**Holes belong to a layout, not directly to a course.**

**HOLE** — `id`, `layout_id` FK, `hole_number`, `par` (2–5), `distance_ft`.
`UNIQUE(layout_id, hole_number)`.

### New / reworked for V2

**HOLE_PLAN** — the heart of V2. One plan per hole. Replaces V1's
`game_plan_shot` (and drops its recommendation-era `is_manual_override`).

| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| layout_id | integer FK | References LAYOUT.id (denormalized for easy querying) |
| hole_id | integer FK | References HOLE.id. `UNIQUE(hole_id)` — one plan per hole |
| disc_id | integer FK **(nullable)** | The disc to throw. Nullable to allow progressive authoring |
| throw_type | enum **(nullable)** | `Backhand` \| `Forehand` \| `Overhand` |
| shot_shape | enum **(nullable)** | See §4. Thumber/Tomahawk coupling applies |
| aim_note | text (nullable) | **Free text** — where to aim / what the disc should do. The heart of the plan in MVP |
| updated_at | text | ISO timestamp; drives "most recent" ordering and resume |

**Progressive authoring is intentional.** All plan fields are nullable so a player
can jot what they know ("aim right of the tall oak") before committing a disc —
this is what makes it feel like a *better note*, not a rigid form. A hole counts as
"planned" if it has **any** content.

**APP_SETTINGS** (single row, `id = 1`) — carries `disc_sort` (from V1) plus V2
Play-mode resume state: **`last_play_layout_id`** and **`last_play_hole_number`**,
so Play mode reopens exactly where the player left off after they bounce back from
UDisc.

### Reserved for later (do NOT build in MVP; do not paint the schema into a corner)
- **Tee-pad photo + aim-line annotation** (post-MVP hero feature): will add a
  nullable `tee_photo_uri` (and later annotation data) to `HOLE_PLAN`. Leave room.
- **Plan B / conditional alternative** (fast-follow): will add a `condition` text
  column and relax `UNIQUE(hole_id)` to allow a second (secondary) plan per hole.
  Keep MVP strictly one plan per hole, but don't assume it forever.

---

## 4. Enums

Fixed lists. **Never** allow free-text for these fields. Defined in `src/db/types.ts`.

### throw_type
`Backhand` · `Forehand` · `Overhand`

### shot_shape
`Hyzer` · `Flat` · `Anhyzer` · `Flex` · `Turnover` · `Roller` · `Spike hyzer` ·
`Thumber` · `Tomahawk`

> **Thumber/Tomahawk coupling:** selecting `Thumber` or `Tomahawk` auto-sets
> `throw_type = Overhand` and disables the throw_type selector. Switching to any
> other shape re-enables it. Enforce this in the **form layer**, not just visually.

### disc category
`DD` (Distance Driver) · `FWD` (Fairway Driver) · `MID` (Midrange) ·
`P&A` (Putt & Approach)

> **Removed:** the V1 `result` enum (Basket/C1/C2/Fairway/Rough/OB) and
> `session mode` — both belonged to throw logging, which V2 does not do.

---

## 5. Screen Inventory

Freedom in structure (see design brief), but MVP needs at least these surfaces:

| Screen | Purpose |
|--------|---------|
| **Home** | Fast entry to Plan / Play; resume the last thing worked on / played. |
| **Courses** | Courses list; each has one or more **Layouts**. Create/edit courses & layouts. Sort active/recent first. |
| **Layout → Holes** | Holes under a layout, showing at a glance which holes are planned vs. blank. |
| **Plan a Hole** (Plan mode) | Author the hole plan: disc (tap-pick), throw type, shot shape (chips), aim note (the one free-text field), par/distance editable. |
| **Play a Layout** (Play mode) | The **caddie card**: one hole per screen, disc name in the largest type, `throw + shape` as one compact phrase, aim note below; swipe/large tap to advance; sunlight-first light theme; resumes on last hole. |
| **My Bag / Discs** | The disc collection; source list when picking a disc in a plan. Sort in-bag/recent first. |
| **About** | Short "how it works" explainer. |

There is **no** Stats tab in V2.

---

## 6. Key UX Rules

- **Mode color is identity.** Two modes, two signature colors (from design), on
  badges / selected pills / primary buttons. Never reuse them for unrelated UI.
- **Play mode = caddie card.** One hole per screen; disc name is the biggest thing
  on screen; advance by swipe or a giant tap target (never a dropdown/scroll);
  high-contrast light theme by default for sunlight; **reopen on the last hole
  played.** Bar: glanceable in under 2 seconds, one-handed. If it takes two taps to
  answer "what am I throwing and where," a laminated index card beats us.
- **Thumber/Tomahawk → Overhand** coupling (see §4), enforced in the form layer.
- **Sort "active" items first.** In-bag discs and the current/most-recent layout go
  to the top of their lists.
- **Confirm destructive actions.** Deleting a course, layout, plan, or disc gets a
  confirmation step.
- **Progressive authoring.** Partial plans are valid and expected — don't force all
  fields before a hole can be saved.
- **Offline-first.** Fully functional with no connection. No UI implies login/sync.

---

## 7. What changed from V1 (migration notes)

The V2 repo was seeded from V1's final code, so a lot of V1 exists and must be
**removed**, not extended.

**Kept:** `disc`, `tag`, `disc_tag`, `course`, `layout`, `hole`, `app_settings`
(the `disc_sort` preference), the Add Disc / bag / My Discs flows, Courses &
Layouts management, the fixed throw/shape enums with Thumber coupling, and the
mode-color-as-identity principle.

**Removed entirely** (tables, screens, and DB helpers):
- **Practice logging:** `practice_session`, `throw`, `throw_tag`, `shot_tag`,
  `game_plan_shot_tag`, and the Practice throw screens/flows.
- **Stats + recommendation engine:** `src/db/stats.ts`, the combo breakdown, the
  confidence tiers, the "best disc" logic, the Stats screen.
- **Tournament mode:** the third mode and its throw screen.
- **`game_plan_shot`** is replaced by **`hole_plan`** (see §3).

**DB migration approach:** V2 has no shipped users, so **bump the DB filename** and
define a fresh V2 `SCHEMA_SQL` containing only the kept + reworked tables. Do not
try to migrate V1 practice data forward — there's nothing to preserve. (No
migration framework exists; if the schema changes again before ship, bump the
filename or add a migration step — don't silently mutate an existing DB.)

---

## 8. Suggested Build Order

1. **Strip V1.** Delete practice/throw/stats/tournament tables, screens, and db
   helpers. Get the app compiling with only Home, Courses, Layouts, My Bag.
2. **Schema V2.** New DB filename; `hole_plan` table; `app_settings` resume fields.
3. **Plan a Hole** — the authoring card (disc pick, throw/shape chips, aim note,
   par/distance). Progressive save.
4. **Layout → Holes** — planned-vs-blank overview.
5. **Play a Layout** — the caddie card + swipe navigation + resume. Spend the most
   care here; it's make-or-break.
6. **Home** — wire Plan/Play entry + resume last.
7. **Polish** — empty states, sunlight legibility pass, confirm-destructive, offline
   edge cases.

Don't skip ahead — Play is meaningless until Plan authoring writes real `hole_plan`
rows.

---

## 9. Out of scope for MVP
- Tee-pad **photo + aim-line annotation** — post-MVP **hero** feature. Design
  reserves a slot; schema leaves room (§3). Don't build the drawing canvas yet.
- Per-hole **Plan B** (conditional alternative, e.g. "if headwind, forehand
  roller") — **fast-follow** right after MVP. One plan per hole for now.
- **Scorekeeping, stats, practice logging, recommendations** — cut from V2 for
  good. UDisc/PDGA keep score; ShotCaller never does.
- **Supabase / accounts / cloud sync** — future, not MVP.
