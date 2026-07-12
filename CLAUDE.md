# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **This is ShotCaller V2.** V2 is a focused **game-planning** app with two modes,
> **Plan** and **Play**. It is a deliberate pivot away from V1 (which did practice
> logging, per-hole stats, a recommendation engine, and a third Tournament mode —
> all removed). If you find V1-era code (throw logging, stats, tournament), it is
> being torn out, not extended. See "What V1 left behind" below.

## Source of truth

`SHOTCALLER_HANDOFF.md` at the repo root is the authoritative product + engineering
document. `V2_DESIGN_HANDOFF.md` is the UI/design brief. Read both before writing
code. If a doc and this file disagree, the handoff wins — update CLAUDE.md to match.

## Design source of truth (UI)

**`design_handoff_shotcaller_v2/`** is the delivered, product-owner-approved UI. Its
`README.md` documents every screen, token, and copy decision; `screens/` has the 13
canonical PNGs; `ShotCaller V2.dc.html` is the pan/zoom design canvas (exact values).
Build the UI from this — recreate the designs with RN/Expo patterns, don't port the
HTML. When a screen is ambiguous in prose, the canvas/PNG wins.

Locked design decisions (these override anything vaguer elsewhere):
- **Mode colors:** PLAN indigo `#5B4FC7`, PLAY teal `#0E8C8C`. Applied to badges,
  selected chips/segments, primary buttons, Home mode tiles (gradients per README).
  Neutral surfaces (Bag, Add disc) use white/neutral selection — never a mode color.
- **Two themes:** dark shell everywhere (`bg #101216`, card `#171A20`) **except**
  Play reading surfaces, which use a sunlight-first light theme (`bg #F6F7F4`,
  ink `#101312`). Full token list in the design README.
- **Fonts:** Barlow Condensed (display: disc names, hole numerals, titles, labels)
  + Barlow (body/chips/notes). Add via `@expo-google-fonts/*` + `expo-font`.
- **Icons:** replace the design's placeholder glyphs with the codebase's icon set
  (v1 used Ionicons).
- **Display-name rule (single source of truth):** `displayName = nickname ?? model`;
  secondary line = `nickname ? "model · category" : "category"`. Never show the model
  twice.
- **Courses are NOT deletable** — only layouts and discs are. (Deleting a layout
  cascades its hole plans; the confirm button restates the cost.)
- **Discs shelve, not just delete:** `in_bag = false` = shelved (hidden from disc
  pickers). The delete-disc sheet offers "shelve instead" as the safe first option.
- **Plan B** (conditional alternative) is designed on the Play caddie card (collapsed
  strip → dark expanded card) but is a **fast-follow**; MVP may omit the strip.
  Build the caddie card so the strip can slot in later without relayout.

## Stack

- React Native + Expo SDK 54 (single codebase). **Native iOS/Android is the primary
  target**; the web build is a demo/preview channel only.
- TypeScript, `strict: true`
- Expo SQLite for on-device storage — **offline-first, no network dependency in MVP**
- Supabase is planned for future sync/auth; do **not** add it in MVP

## Commands

- `npm run ios` — launch in iOS simulator
- `npm run android` — launch on Android emulator/device
- `npm run web` — web build (quick smoke tests / demos)
- `npm start` — Expo dev server with a QR code for device
- `npx tsc --noEmit` — type-check the project
- `npx expo install <pkg>` — add a native module at the SDK-matched version; prefer
  this over `npm install` for anything native

No test runner or linter is wired up yet. Add one deliberately when first needed.

## Database

- Single on-device SQLite file, opened lazily via `getDb()` in `src/db/index.ts`.
  First call runs `SCHEMA_SQL` (idempotent `CREATE TABLE IF NOT EXISTS`) and seeds
  the default disc tags from `DEFAULT_TAGS`.
- Schema lives in `src/db/schema.ts`; SQL `CHECK` constraints enforce every enum.
  Enum values are defined once in `src/db/types.ts` and reused in both the DDL and
  the TypeScript types — **do not duplicate enum string literals elsewhere.**
- **V2 uses a fresh DB filename.** V2 was seeded from V1 code, so the practice/stats
  tables must not carry forward. Bump the DB filename and define a V2-only
  `SCHEMA_SQL`. There are no V1 users and no practice data worth migrating.
- `resetDb()` exists for dev use; it deletes the DB file and clears the cached
  handle. Don't ship a path that calls it from the UI.
- No migration framework yet. If the schema changes again before ship, bump the
  filename or add a migration step — don't silently mutate an existing DB.

## Architecture notes worth knowing before editing

**Two modes, two different screens.** Plan (authoring) and Play (reading) are NOT
one shared screen — that was V1. Plan is calm, thumb-friendly, dense-is-ok. Play is
a glanceable caddie card. Don't let Play inherit Plan's density or interaction
patterns.

**Play mode is a caddie card, not a form.** One hole per screen; the disc name is
the largest thing on screen; throw type + shot shape render as one compact phrase
(e.g. "FH Flex"); the aim note sits below. Advance holes by swipe or a giant tap
target — never a dropdown or scroll-to-find. High-contrast **light** theme by
default (sunlight is the enemy), even if the rest of the app is darker. Play must
**reopen on the last hole played** (`app_settings.last_play_layout_id` /
`last_play_hole_number`) because players constantly background the app for UDisc.
The bar: answer "what am I throwing and where?" in under 2 seconds, one-handed.

**Mode color is identity, not decoration.** PLAN indigo `#5B4FC7`, PLAY teal
`#0E8C8C`, on badges, selected pills, and primary buttons. The V1 three-color palette
(Blue/Green/Pink) is retired. Don't reuse mode colors for unrelated UI.

**HOLE belongs to LAYOUT, not COURSE.** A course has many layouts (Short / Long /
Tournament); holes live under a layout. Plans reference `layout_id` / `hole_id`,
never `course_id` directly. Easy to get wrong in joins.

**Plans attach to LAYOUTS/holes.** `hole_plan` is one row per hole
(`UNIQUE(hole_id)`), carrying the disc, throw type, shot shape, and a free-text
`aim_note`. It replaces V1's `game_plan_shot` and drops the recommendation-era
`is_manual_override`.

**Progressive authoring is intentional.** Every `hole_plan` field is nullable. A
player can jot an aim note before committing a disc; a hole is "planned" if it has
any content. This is what makes it feel like a better *note*, not a rigid form.
Don't add NOT NULL guards that force a full plan before saving.

**No scorekeeping, no stats, no recommendation engine.** V2 sits alongside
UDisc/PDGA and never tracks score, strokes, results, or throw-by-throw data. There
is no "best disc" suggestion and no stats screen. If a request smells like ranking
or analytics, check it against the handoff before building.

**Enums are fixed lists.** `throw_type`, `shot_shape`, and disc `category` never
accept free text. The **only** free-text field in a plan is `aim_note`. (The V1
`result` and `session mode` enums are gone — they belonged to throw logging.)

**Thumber/Tomahawk coupling.** Selecting `Thumber` or `Tomahawk` as `shot_shape`
must auto-set `throw_type = Overhand` and disable the throw_type selector.
Switching away re-enables it. Enforce in the **form layer**, not just visually.

**Keep destructive actions confirmed; sort active items first.** Deleting a layout,
plan, or disc gets a confirmation whose button restates the cost; **courses are not
deletable**. In-bag discs and the current/most-recent layout sort to the top of
their lists.

## What V1 left behind (remove, don't extend)

The repo was copied from V1's final state. These are being **deleted**: the
`practice_session`, `throw`, `throw_tag`, `shot_tag`, `game_plan_shot_tag` tables;
`src/db/stats.ts` and the combo breakdown / confidence tiers; the Practice and
Tournament throw screens and their start screens; the Stats screen and tab. If you
touch a file that imports these, you're probably in code that should be removed —
confirm against §7 of the handoff before adding to it.

## Reserved extension points (design around, don't build in MVP)

- **Tee-pad photo + aim-line annotation** — the post-MVP hero feature. Will add a
  nullable `tee_photo_uri` (then annotation data) to `hole_plan`. Leave room in the
  Plan card layout and the schema; don't build the drawing canvas yet.
- **Plan B (conditional alternative)** — fast-follow. Will add a `condition` column
  and relax `UNIQUE(hole_id)` to allow a secondary plan per hole. One plan per hole
  for MVP, but don't assume it's forever.

## Build order

Follow the handoff's §8: strip V1 → V2 schema → Plan a Hole → Layout→Holes overview
→ Play (caddie card) → Home → polish. Each step assumes the previous. Play is
meaningless until Plan authoring writes real `hole_plan` rows.
