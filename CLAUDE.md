# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

`SHOTCALLER_HANDOFF.md` at the repo root is the authoritative design document. Read it before writing code. If this file and the handoff disagree, the handoff wins — update CLAUDE.md to match.

## Project status

Greenfield. As of this writing, the repo contains only design docs — no source, no `package.json`, no Expo scaffold. The first coding task is to initialize a React Native Expo project with TypeScript and Expo SQLite, then scaffold every table in the handoff's data model before building any screens. Update this file with build/test/lint commands once they exist.

## Stack

- React Native + Expo (single codebase, iOS + Android)
- TypeScript required throughout
- Expo SQLite for on-device storage — **offline-first, no network dependency in v1**
- Supabase is planned for future sync/auth; do **not** add it in v1

## Architecture notes worth knowing before editing

**Three modes, one throw screen.** Practice, Game Plan, and Tournament share the same throw-logging UI but differ in behavior (recommendations shown, disc pre-selection, read/write vs read-only plan header). When modifying the throw screen, always consider all three modes — do not special-case one without checking the others.

**Mode color is identity, not decoration.** Blue `#5b8af5` = Practice, Green `#4a9e5c` = Game Plan, Pink `#e8809a` = Tournament. The color appears on mode badges, selected pills, and primary action buttons so the player always knows which mode they're in. Don't reuse these colors for unrelated UI.

**HOLE belongs to LAYOUT, not COURSE.** A course has many layouts (Short/Long/Tournament); holes live under a layout. Practice sessions and game plans reference `layout_id`, never `course_id` directly. This is easy to get wrong in queries and joins.

**Enums are fixed lists.** `throw_type`, `shot_shape`, `result`, and disc `category` must never accept free-text. See the handoff's §4 for exact values.

**Thumber/Tomahawk coupling.** Selecting `Thumber` or `Tomahawk` as `shot_shape` must auto-set `throw_type = Overhand` and disable the throw_type selector. Switching away re-enables it. Enforce this in the form layer, not just visually.

**Recommendation ranking.** `GAME_PLAN_SHOT` is derived from `THROW` history per hole. Ranking priority: most throws landing in {Fairway, C2, C1, Basket} → fewest OB → more total throws as tiebreaker. Confidence tiers are 4+ / 2–3 / 0–1 throws. Holes with 0–1 throws must render the amber "no data" warning.

## Build order

Follow the handoff's §8 sequence: DB scaffold → My Discs → Courses → Practice throw screen → Game Plan review → Tournament throw screen → Home → polish. Each step assumes the previous. Don't skip ahead — the Game Plan screen is meaningless without practice data flowing in.
