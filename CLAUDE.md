# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

`SHOTCALLER_HANDOFF.md` at the repo root is the authoritative design document. Read it before writing code. If this file and the handoff disagree, the handoff wins — update CLAUDE.md to match.

## Stack

- React Native + Expo SDK 54 (single codebase, iOS + Android)
- TypeScript, `strict: true`
- Expo SQLite for on-device storage — **offline-first, no network dependency in v1**
- Supabase is planned for future sync/auth; do **not** add it in v1

## Commands

- `npm run ios` — launch in iOS simulator
- `npm run android` — launch on Android emulator/device
- `npm run web` — launch the web build (useful for quick smoke tests)
- `npm start` — Expo dev server with a QR code for device
- `npx tsc --noEmit` — type-check the project
- `npx expo install <pkg>` — add a native module (picks the version matching the current Expo SDK); prefer this over `npm install` for anything native

No test runner or linter is wired up yet. Add one deliberately when first needed rather than pre-emptively.

## Database

- Single on-device SQLite file, opened lazily via `getDb()` in `src/db/index.ts`. The first call runs `SCHEMA_SQL` (idempotent `CREATE TABLE IF NOT EXISTS`) and seeds the 8 default tags from `DEFAULT_TAGS`.
- Schema lives in `src/db/schema.ts` and uses SQL `CHECK` constraints to enforce every enum from the handoff. Enum values themselves are defined once in `src/db/types.ts` and reused in both the schema DDL and TypeScript types — **do not duplicate enum string literals elsewhere**.
- `resetDb()` exists for dev use; it deletes the DB file and clears the cached handle. Don't ship a path that calls it from the UI.
- There is no migration framework yet. When the schema changes before v1 ships, either bump the DB filename or add a migration step — don't silently mutate existing DBs.

## Architecture notes worth knowing before editing

**Three modes, one throw screen.** Practice, Game Plan, and Tournament share the same throw-logging UI but differ in behavior (recommendations shown, disc pre-selection, read/write vs read-only plan header). When modifying the throw screen, always consider all three modes — do not special-case one without checking the others.

**Mode color is identity, not decoration.** Blue `#5b8af5` = Practice, Green `#4a9e5c` = Game Plan, Pink `#e8809a` = Tournament. The color appears on mode badges, selected pills, and primary action buttons so the player always knows which mode they're in. Don't reuse these colors for unrelated UI.

**HOLE belongs to LAYOUT, not COURSE.** A course has many layouts (Short/Long/Tournament); holes live under a layout. Practice sessions and game plans reference `layout_id`, never `course_id` directly. This is easy to get wrong in queries and joins.

**Enums are fixed lists.** `throw_type`, `shot_shape`, `result`, and disc `category` must never accept free-text. See the handoff's §4 for exact values.

**Thumber/Tomahawk coupling.** Selecting `Thumber` or `Tomahawk` as `shot_shape` must auto-set `throw_type = Overhand` and disable the throw_type selector. Switching away re-enables it. Enforce this in the form layer, not just visually.

**Recommendation ranking.** `GAME_PLAN_SHOT` is derived from `THROW` history per hole. Ranking priority: most throws landing in {Fairway, C2, C1, Basket} → fewest OB → more total throws as tiebreaker. Confidence tiers are 4+ / 2–3 / 0–1 throws. Holes with 0–1 throws must render the amber "no data" warning.

## Build order

Follow the handoff's §8 sequence: DB scaffold → My Discs → Courses → Practice throw screen → Game Plan review → Tournament throw screen → Home → polish. Each step assumes the previous. Don't skip ahead — the Game Plan screen is meaningless without practice data flowing in.
