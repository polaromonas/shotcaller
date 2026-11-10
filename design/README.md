# Handoff: ShotCaller — Full App UI

## Overview
ShotCaller is a disc golf **game-planning** app (tagline: *You call the shots*). The player authors a hole-by-hole plan at home (**Plan mode**) and reads it glanceably on the course (**Play mode**). It is NOT a scorekeeping or stats app — it runs alongside UDisc/PDGA as a "second screen." This handoff covers the complete MVP UI: both modes, all navigation surfaces, the disc bag, pickers, and destructive-action patterns.

The original product brief is included as `BRIEF.md` — read it for product rationale and constraints. This README documents the **design decisions made and approved by the product owner** during design review.

## About the Design Files
The files in this bundle are **design references created in HTML** — they show intended look and behavior, they are not production code. `ShotCaller.dc.html` is a design-review canvas containing every iteration; the **canonical screens** (listed below) are what to build. The target is **React Native + Expo** (per the brief; a web build exists as a demo channel). Recreate the designs using that codebase's established patterns — do not port the HTML.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final unless noted. Recreate pixel-faithfully at 390×844 reference size, scaling for other devices.

## Canonical screens
The design file contains numbered option cards (badges like `1d`, `9b`). Only these are canonical — ignore all other cards (superseded iterations):

| Surface | Card id in design file |
|---|---|
| Home | 1d |
| Courses | 1e |
| Layout → holes | 1f |
| Plan a hole | **10a** |
| Disc picker sheet | **5a** |
| Play caddie card | **9b** |
| Play card, Plan B expanded | **10b** |
| Play layout picker | 6a |
| My Bag | 9a |
| Add disc | 7a |
| Confirm delete layout | 8a |
| Confirm delete disc | 8b |
| About | 1i |

Sample-data note: the reference bag is 22 discs. Home (1d) predates that and says "14 discs" — treat it as dynamic copy (`{n} discs`).

## Design Tokens

### Mode colors (identity, not decoration)
- **PLAN indigo:** `#5B4FC7` — badges, selected chips/segments, primary buttons in authoring surfaces. Gradient on Home tile: `linear-gradient(160deg, #5B4FC7, #4A3FA8)`.
- **PLAY teal:** `#0E8C8C` — badges, shape pill on the caddie card, resume cards, play buttons. Gradient on Home tile: `linear-gradient(160deg, #0E8C8C, #0A6E6E)`.
- Never use mode colors for unrelated UI. Neutral surfaces (Bag, Add disc) use white/neutral selection states instead.

### Dark shell (everything except Play-mode reading surfaces)
- Background `#101216` · Card `#171A20` · Card border `#232733` · Dashed/empty border `#3a4050`
- Text primary `#EDEEF2` · Secondary `#B7BBC6` · Muted `#8B909B` · Faint `#5c6270`
- Selected disc row fill `#1E2032` (with 2px `#5B4FC7` border)

### Play mode light theme (sunlight-first)
- Background `#F6F7F4` · White cards `#fff` · Ink `#101312`
- Secondary `#5c6663` · Muted `#9aa29e` / `#8a938f` · Borders `#d4d8d3` (active) / `#e0e3de` (dimmed)

### Accents
- **Plan B cream:** badge/condition `#FDF1D7`, badge text on light `#6b5a1e`. Highlight-marker span in aim notes: background `#FDF1D7`.
- **Destructive red:** `#C7362B` — ONLY on the destructive confirm button, nowhere else.
- **Toggle-on green:** `#3FA05A`.
- **Disc plastic swatches (curated set):** `#D8342C` `#E8443A` `#E87A2C` `#F2C230` `#3FA05A` `#2D8CC9` `#8B5CC7` `#E86FA4` `#F5F1E8` `#3A3F4A` (+ `#C7CDD6` seen on a shelved disc).

### Typography
- **Barlow Condensed** (600/700/800): disc names, hole numerals, screen titles, section labels (letter-spaced uppercase), button labels.
- **Barlow** (400/500/600/700): body, chips, list rows, aim notes.
- Section label pattern: `700 12px Barlow Condensed, letter-spacing .16em, uppercase, color #8B909B`.

### Shape & spacing
- Screen padding: 20px horizontal, 24–26px top. Reference frame 390×844.
- Radii: cards 12–16px, sheets 22px (top corners), pills 999px, mode badges 6px, big buttons 14px, Play-card panels 18px.
- Bottom sheets: `box-shadow: 0 -12px 32px rgba(0,0,0,.5)`, 44×5px grab handle `#3a4050`, background behind dimmed to 35% opacity + 1px blur.
- Minimum hit target 44px; Play-mode nav targets are 96px+ tall.

## Screens / Views

### Play caddie card (9b) — the make-or-break surface
One hole per screen. Light theme. Layout top→bottom:
1. **Header row:** PLAY badge (teal, `700 13px BC`, .12em, 6×10px padding, 6px radius) — course·layout caption centered (`700 12px BC`, .12em, `#9aa29e` — deliberately tiny) — ✕ exit.
2. **Hole row:** hole numeral `800 58px/0.9 BC` + "PAR 3 · 285 FT" (`600 17px Barlow`, `#5c6663`).
3. **Center block (vertically centered, 18px gaps):**
   - Disc display name `800 62px/0.95 BC` — the largest type on screen.
   - Subline: 24px disc-color dot (2px border `rgba(0,0,0,.12)`) + "Firebird · FWD" (`600 16px`, `#5c6663`).
   - Shape pill: teal bg, white, `700 26px BC`, .06em, 12×18px padding, 10px radius — compound phrase e.g. "FH FLEX".
   - Aim note: `600 27px/1.3 Barlow`, ink color, `text-wrap: pretty`.
4. **Plan B collapsed strip:** white card, 2px `#d4d8d3` border, 14px radius — black PLAN B badge (`800 14px BC`) + 18px color dot of the backup disc + one-line condition→plan text (ellipsized) + ⌃ chevron. Tapping expands (see 10b).
5. **Nav row:** prev = 84×96px outlined "‹ 6"; next = flexible ×96px solid black bar "HOLE 8 ›" (`800 30px BC`). Below: "or swipe anywhere" (`600 12px`, `#9aa29e`).

**Behavior:** swipe left/right anywhere advances/retreats holes; the giant bar duplicates next. Reopening the app returns to the exact hole (persisted). No dropdowns, no scrolling lists.

### Plan B expanded (10b)
Same screen after tapping the strip:
- Plan A collapses to a dimmed (75% opacity) one-liner card: gray PLAN A badge + 18px red dot + "Raskolnikov · FH Flex" + ⌄. Tap restores.
- Plan B fills the center as a **dark card** (`#101312`, 18px radius, `0 10px 28px rgba(16,19,18,.25)` shadow): cream PLAN B badge + condition "INTO THE WIND" in cream `800 17px BC` .12em (high contrast — was reviewed for legibility), then the same disc-name/dot/pill/note hierarchy in white, ⌄ collapse hint at bottom. Nav row unchanged.
- Dark-on-light inversion is intentional: it makes "you are reading Plan B" unmistakable.
- Note: Plan B is a **fast-follow after MVP** — build the strip/expansion so it can ship later without relayout; MVP may omit the strip entirely.

### Plan a hole (10a)
Dark shell, indigo accents. Top→bottom:
1. Header: "‹ Long Layout" back + PLAN badge.
2. "HOLE 7" (`800 44px BC`) + "Par **3** · **285** ft ✎" (nowrap) — ✎ opens the hole-facts editor (par + tee distance in feet, per hole). Editor itself not drawn; a simple stepper sheet is fine.
3. **DISC — FROM YOUR BAG:** pill chips of recent/likely discs, each with a 16px color dot inside the pill (selected = indigo fill, white text); final dashed chip "All 22 discs…" opens the picker sheet (5a).
4. **THROW:** 3-segment control (Backhand / Forehand / Overhand), selected = indigo segment.
5. **SHAPE:** wrap of 9 chips: Hyzer, Flat, Anhyzer, Flex, Turnover, Roller, Spike hyzer, Thumber ⇒OH, Tomahawk ⇒OH. **Coupling rule:** selecting Thumber or Tomahawk forces Throw = Overhand and locks the segment (visually disable the other two).
6. **AIM — "WHAT WOULD YOUR CADDIE SAY?":** free-text area, `600 17px/1.45 Barlow`. The only free-text field in a plan.
7. Footer: dashed "📷 Add tee photo / coming soon" slot (disabled affordance reserving the post-MVP photo feature) + indigo "SAVE · NEXT HOLE ›" (saves and advances to the next hole's card — authoring is a flow, not a form).

### Disc picker (5a)
Bottom sheet over the dimmed Plan card, rising to ~118px from top:
- Title "PICK A DISC" + Cancel.
- Filter chips: "All · 22" (selected, indigo) / DD / FWD / MID / P&A. **No recent row** (explicit decision), **no search** — filter chips do the narrowing.
- Scrolling list grouped by category section labels ("DD — DISTANCE DRIVERS"…). Row: 22px color dot (2px `rgba(255,255,255,.25)` border) + display name (+ "· Model" muted if nicknamed) + flight numbers right-aligned (`700 14px BC`, `#8B909B`, e.g. "12/5/-1/3").
- Selected row: **2px indigo border + `#1E2032` fill, flight numbers `#B7BBC6` — no checkmark** (explicit decision).
- One tap picks and dismisses. Shelved discs are not listed; footer caption: "22 in bag · scroll for P&A · shelved discs in My Bag". Bottom scroll fade: `linear-gradient(180deg, rgba(23,26,32,0), #171A20)` 70px.

### Play layout picker (6a)
Dark shell, teal accents. "‹ Home", title "PICK A LAYOUT" + PLAY badge.
- **Resume card first** (solid teal): "RESUME — YOU WERE ON HOLE 7", course·layout, planned count, white "RESUME ›" button. One-tap common case.
- "ALL LAYOUTS — MOST PLANNED FIRST": rows with layout name, teal progress bar + "16/18" coverage, teal "PLAY ›".
- **Unplanned layouts:** dashed border, muted, "No plan yet", and route to indigo "PLAN IT ›" instead of a dead play button (mode colors as wayfinding).
- Footer hint: "Playing starts at hole 1 — or long-press PLAY to start elsewhere" (long-press start-at-hole is optional; drop if scope-tight).

### My Bag (9a)
Dark shell, **neutral** (no mode color). "22 in bag · 3 shelved" caption. Rows grouped by category section labels; each row = 22px color dot + display name (+ "· Model" if nicknamed) + flight numbers "S / G / T / F" right. Footer outlined "+ ADD DISC". Shelved discs live at the bottom (dimmed) — the brief allows the earlier bag screen as a baseline; don't over-invest here.

### Add disc (7a)
Dark shell, neutral. Fields top→bottom:
- MODEL (text) · NICKNAME (text, caption: "optional, shown everywhere if set")
- CATEGORY: 4-segment DD / FWD / MID / P&A — selected segment is **white with dark text** (neutral surface, deliberately not a mode color)
- FLIGHT — SPEED / GLIDE / TURN / FADE: four cells with big numerals (`800 24px BC`); tap opens a number picker/stepper
- PLASTIC COLOR: 36px swatch circles from the curated set; selected gets `outline: 3px solid #EDEEF2, offset 3px`
- "In my bag" toggle (green when on) with caption "Shelved discs don't show in disc pickers"
- Full-width white "SAVE DISC" button.

### Home (1d)
Dark shell. Wordmark "SHOTCALLER" + tagline. Teal-labeled **RESUME ROUND** card (course·layout, "On hole 7 of 18", teal "PLAY ›"). Two large gradient mode tiles (PLAN indigo / PLAY teal) filling most of the screen, each with a one-line description and entry link. Bottom: "My Bag · {n} discs" card. "About" link top-right.

### Courses (1e)
Dark shell, PLAN badge. Course cards each listing layout chips (selected/most-recent layout = indigo chip, sorted first); most-recent course carries an indigo card border + "Most recent — planned 16/18 holes" caption. Bottom: indigo "+ NEW COURSE". Courses themselves are **not deletable** (explicit decision) — only layouts are.

### Layout → holes (1f)
Dark shell, PLAN badge. Title + "16 of 18 holes planned". 3-column grid of hole cells: hole number (`800 24px BC`), "P3·310" facts, one-line plan summary ("Zone · BH Hyzer", ellipsized). **Planned** = solid card; **unplanned** = dashed border with indigo "+ Plan"; current/last-edited = indigo border. Footer: "EDIT LAYOUT" (neutral) + teal "▶ PLAY THIS".

### Confirm delete — layout (8a)
Bottom sheet over dimmed screen: "DELETE LONG LAYOUT?", copy states the cascade inline ("…including its **16 hole plans**. The course and its other layouts stay. There's no undo."). Red button **restates the cost**: "DELETE LAYOUT + 16 PLANS". Below: outlined "Keep it". Red appears only on the destructive act.

### Confirm delete — disc (8b)
Sheet with the disc's dot + "DELETE RASKOLNIKOV?". Copy: "**12 hole plans** use this disc. Deleting clears the disc from those plans — the rest of each plan stays." Buttons in order: outlined "SHELVE INSTEAD — KEEP PLANS INTACT" (safe out, listed first) → red "DELETE FROM 12 PLANS" → "Cancel".

### About (1i)
Dark shell. "YOU CALL THE SHOTS." display type; positioning copy (plan ≠ scorecard, UDisc keeps score); three numbered steps (1 indigo = plan at home, 2 teal = play with one glance, 3 neutral = on-device/no account).

## Interactions & Behavior
- **Play navigation:** horizontal swipe anywhere + giant next bar + small prev. Advancing must work one-handed while walking.
- **Resume:** app persists current layout + hole; backgrounding/returning (constant UDisc switching) lands on the same hole with no interstitial.
- **Thumber/Tomahawk lock:** forces + locks Throw = Overhand; deselecting unlocks.
- **Plan authoring flow:** SAVE · NEXT HOLE advances through holes sequentially.
- **Sorting:** most-recent/most-planned first everywhere (courses, layouts, layout chips).
- **Destructive actions:** always confirmed via bottom sheet; the confirm button restates the cost; shelving offered as the safe alternative for discs.
- **Sheets:** slide up, dim + slightly blur the screen behind; drag-handle + Cancel dismiss.
- No login, no network, no score fields anywhere.

## State Management (minimum)
- `bag: Disc[]` — disc: model, nickname?, category (DD|FWD|MID|P&A), flight {speed,glide,turn,fade}, **plasticColor** (from curated swatches — added during design; carries into picker rows, bag rows, plan chips, Play card dots), inBag: bool.
- `courses: Course[]` → `layouts: Layout[]` → `holes: Hole[]` (par, distanceFt) → `plan?: {discId, throw, shape, aimNote}` (+ future `planB?: {condition, discId, throw, shape, aimNote}` and `teePhoto?`).
- `session: {layoutId, holeIndex}` — persisted for resume.
- Display-name rule (single source of truth): `displayName = nickname ?? model`; secondary line = `nickname ? "model · category" : "category"` — never repeat the model twice.

## Assets
- **Fonts:** Barlow + Barlow Condensed (Google Fonts, OFL).
- No images/icons required for MVP; glyphs shown (‹ › ⌃ ⌄ ✕ ✓ ✎ 📷 ▶ ●) should be replaced with the codebase's icon set (Ionicons).

## Out of scope (design around, don't build)
- Tee-pad photo + aim-line annotation (slot reserved on Plan card; Play would show a tappable photo).
- Plan B authoring (Play-side reading is designed at 10b; strip may be hidden until it ships).
- Scorekeeping, stats, recommendations — never.

## Files
- `ShotCaller.dc.html` — the design canvas (all iterations; canonical cards per the table above). Open in a browser; it's pan/zoomable.
- `BRIEF.md` — the original product brief.
- `screens/` — PNG screenshots of the 13 canonical screens, named `NN-surface-cardid.png` in the manifest order. The HTML canvas remains the source of truth for exact values.
