# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **ShotCaller** is a focused disc golf **game-planning** app with two modes, **Plan**
> and **Play**. It began as a practice-logging/stats prototype (git tag `v1-final`);
> that was cut, and there is now one app and one codebase. Don't reintroduce
> throw logging, stats, recommendations or a Tournament mode — see the handoff's §7.

## Source of truth

`SHOTCALLER_HANDOFF.md` at the repo root is the authoritative product + engineering
document. `design/BRIEF.md` is the original UI/design brief. Read both before writing
code. If a doc and this file disagree, the handoff wins — update CLAUDE.md to match.

## Design source of truth (UI)

**`design/`** is the delivered, product-owner-approved UI. Its
`README.md` documents every screen, token, and copy decision; `screens/` has the 13
canonical PNGs; `ShotCaller.dc.html` is the pan/zoom design canvas (exact values).
Build the UI from this — recreate the designs with RN/Expo patterns, don't port the
HTML. When a screen is ambiguous in prose, the canvas/PNG wins.

**Approved deviations from the delivered design (product-owner overrides).** The
design bundle omitted three things the prototype had and the owner wants kept (1–3), and the
owner has since overridden two Home-screen decisions (4–5), the teal (6) and the resume card (7) — implement these instead
of the bare design where they conflict:
1. **Add-Disc keeps the disc-catalog autocomplete** (`searchCatalog` over the
   ~1,200-disc JSON) plus **Manufacturer** and **Plastic** fields. The design's 7a
   manual form is the visual style, not a spec to strip features down to.
2. **Plastic type is shown** on disc-picker rows (5a) and the **caddie card** subline
   (9b) per the disc display rule below — the design's "Firebird · FWD" becomes
   "Star Firebird · FWD" / "Star · FWD".
3. **Manufacturer stays in the schema** (catalog search); just never rendered.
4. **No all-caps display type anywhere — sentence case app-wide.** This retires the
   design README's letter-spaced uppercase *section-label* pattern (`700 12px,
   letter-spacing .16em`) completely. Wordmark is "ShotCaller"; mode tiles and badges
   read "Plan" / "Play"; section labels, screen titles, button labels and card labels
   are sentence case ("Pick a layout", "All layouts — most planned first", "To revise",
   "New shape", "Bag color"). The tracking that went with the caps is gone too — it
   existed to open up uppercase and reads loose on mixed case. Use `FONT.bc700` +
   muted color (no tracking, no `textTransform`) for a section label.
   **Caps that are DATA stay caps**, and must not be "fixed": disc category codes
   (`DD`, `FWD`, `MID`, `P&A`), throw-type abbreviations (`BH`, `FH`), and anything a
   user typed. Course, layout, and disc names render exactly as entered — never
   `.toUpperCase()`. The Play caddie card's throw+shape phrase is "FH Flex", not
   "FH FLEX" (matches the phrasing documented under Architecture notes).
5. **My Bag is a header pill on Home, not a bottom tile.** The design's bottom
   "My Bag · {n} discs" card is gone; the bag lives top-right as a neutral pill
   (active bag's color dot + its name + disc count). The two mode tiles take the reclaimed
   height. "About ShotCaller" stays the small centered link at the bottom (the
   design put About top-right; the bag took that slot).
6. **Play teal is `#0C8080`, not the design's `#0E8C8C`.** Darkened slightly so
   small white text on teal buttons meets WCAG AA (4.8:1; the original was 4.1:1).
   Mode is never signalled by color alone — every mode color sits next to a
   "Plan"/"Play" word — because indigo and teal are close in lightness (they blur
   together in grayscale, in sun glare, and for blue-yellow color blindness).
7. **Home's "Resume round" card uses Play's light theme**, not a solid teal fill.
   Teal resume card + indigo Plan tile + teal Play tile read as stripes; the light
   card is a preview of the caddie card and is the one thing that stands out while
   a round is in progress. The whole card is the tap target; a teal chevron keeps
   the Play cue (no separate "Play" button).

Locked design decisions (these override anything vaguer elsewhere):
- **Mode colors:** PLAN indigo `#5B4FC7`, PLAY teal `#0C8080`. Applied to badges,
  selected chips/segments, primary buttons, Home mode tiles (gradients per README).
  Neutral surfaces (Bag, Add disc) use white/neutral selection — never a mode color.
- **Two themes:** dark shell everywhere (`bg #101216`, card `#171A20`) **except**
  Play reading surfaces, which use a sunlight-first light theme (`bg #F6F7F4`,
  ink `#101312`). Full token list in the design README.
- **Fonts:** Barlow Condensed (display: disc names, hole numerals, titles, labels)
  + Barlow (body/chips/notes). Add via `@expo-google-fonts/*` + `expo-font`.
- **Icons:** replace the design's placeholder glyphs with the codebase's icon set
  (Ionicons).
- **Disc display rule (single source of truth):** primary (big) name =
  `nickname ?? model`; secondary line = nickname set → `"{plastic} {model} · {category}"`,
  else → `plastic ? "{plastic} · {category}" : "{category}"`. **Manufacturer is never
  displayed** (it only powers catalog search); **plastic type is always shown when
  set** — the same mold is bagged in different plastics. Never show the model twice.
- **Courses are NOT deletable** — only layouts and discs are. (Deleting a layout
  cascades its hole plans; the confirm button restates the cost.)
- **Multiple bags; discs shelve, not just delete.** Bags are `bag` + `bag_disc`
  (many-to-many — a disc can be in several bags). The **active bag**
  (`app_settings.active_bag_id`) is what Plan's disc pickers offer and what My Bag
  shows. A disc in no bag is **shelved**. In TS, `Disc.in_bag` means "in the active
  bag" (computed) and `bag_ids` lists every bag; the `disc.in_bag` *column* is legacy —
  don't read or write it. Deleting a bag never deletes discs; at least one bag always
  exists. The delete-disc sheet offers "shelve instead" (out of every bag) first.
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

- `npm test` — Jest SQL smoke tests against an in-memory better-sqlite3 shim
  (`test/mocks/expo-sqlite.ts`). The GitHub Pages deploy runs these first.

No linter is wired up yet. Add one deliberately when first needed.

## Database

- Single on-device SQLite file, opened lazily via `getDb()` in `src/db/index.ts`.
  First call runs `SCHEMA_SQL` (idempotent `CREATE TABLE IF NOT EXISTS`) and seeds
  the default disc tags from `DEFAULT_TAGS`.
- Schema lives in `src/db/schema.ts`; SQL `CHECK` constraints enforce every enum.
  Enum values are defined once in `src/db/types.ts` and reused in both the DDL and
  the TypeScript types — **do not duplicate enum string literals elsewhere.**
- **DB filename is `shotcaller-v2b.db` — never rename it.** The "v2b" is
  historical; renaming would silently start every existing player on an empty DB.
- `resetDb()` exists for dev use; it deletes the DB file and clears the cached
  handle. Don't ship a path that calls it from the UI.
- Schema changes go through `migrate()` in `src/db/index.ts`: additive,
  idempotent steps (guarded `ALTER TABLE … ADD COLUMN`) that run before
  `SCHEMA_SQL`. Don't drop or rewrite existing tables.

## Architecture notes worth knowing before editing

**Two modes, two different screens.** Plan (authoring) and Play (reading) are NOT
one shared screen. Plan is calm, thumb-friendly, dense-is-ok. Play is
a glanceable caddie card. Don't let Play inherit Plan's density or interaction
patterns.

**Play mode is a caddie card, not a form.** One hole per screen; the disc name is
the largest thing on screen; throw type + shot shape render as one compact phrase
(e.g. "FH Flex"); the aim note sits below. Advance holes by swipe or a giant tap
target — never a dropdown or scroll-to-find. High-contrast **light** theme by
default (sunlight is the enemy), even if the rest of the app is darker. Play must
**reopen on the last hole played** (`play_state`, one row per layout) because players constantly background the app for UDisc.
The bar: answer "what am I throwing and where?" in under 2 seconds, one-handed.

**Mode color is identity, not decoration.** PLAN indigo `#5B4FC7`, PLAY teal
`#0C8080`, on badges, selected pills, and primary buttons. Don't reuse mode colors for unrelated UI.

**HOLE belongs to LAYOUT, not COURSE.** A course has many layouts (Short / Long /
Tournament); holes live under a layout. Plans reference `layout_id` / `hole_id`,
never `course_id` directly. Easy to get wrong in joins.

**Plans attach to LAYOUTS/holes.** `hole_plan` is one row per hole
(`UNIQUE(hole_id)`), carrying the disc, throw type, shot shape, and a free-text
`aim_note`.

**Progressive authoring is intentional.** Every `hole_plan` field is nullable. A
player can jot an aim note before committing a disc; a hole is "planned" if it has
any content. This is what makes it feel like a better *note*, not a rigid form.
Don't add NOT NULL guards that force a full plan before saving.

**No scorekeeping, no stats, no recommendation engine.** ShotCaller sits alongside
UDisc/PDGA and never tracks score, strokes, results, or throw-by-throw data. There
is no "best disc" suggestion and no stats screen. If a request smells like ranking
or analytics, check it against the handoff before building.

**Enums: `throw_type` and disc `category` are fixed lists** — never free text.
**`shot_shape` is user-extensible** (changed at the owner's request): the `shape`
table seeds the 9 built-ins and users add/delete their own, so `hole_plan.shot_shape`
is free TEXT (no CHECK), and its display type is `string`, not a union. The
Thumber/Tomahawk→Overhand lock is driven by `shape.is_overhand`; built-ins are
protected from deletion by `shape.is_builtin`. `aim_note` is free text.

**Thumber/Tomahawk coupling.** Selecting `Thumber` or `Tomahawk` as `shot_shape`
must auto-set `throw_type = Overhand` and disable the throw_type selector.
Switching away re-enables it. Enforce in the **form layer**, not just visually.

**Keep destructive actions confirmed; sort active items first.** Deleting a layout,
plan, or disc gets a confirmation whose button restates the cost; **courses are not
deletable**. In-bag discs and the current/most-recent layout sort to the top of
their lists.

## Reserved extension points (design around, don't build in MVP)

- **Tee-pad photo + aim-line annotation** — the post-MVP hero feature. Will add a
  nullable `tee_photo_uri` (then annotation data) to `hole_plan`. Leave room in the
  Plan card layout and the schema; don't build the drawing canvas yet.
- **Plan B (conditional alternative)** — fast-follow. Will add a `condition` column
  and relax `UNIQUE(hole_id)` to allow a secondary plan per hole. One plan per hole
  for MVP, but don't assume it's forever.
