# ShotCaller — UI Design Brief

> For **Claude Design** (or any designer) to produce the UI independently.
> This is a **design brief**, not an engineering spec. It tells you what the
> product is, who uses it and where, what each screen must accomplish, and the
> non-negotiable principles — then hands you the freedom to design the rest.

---

## 1. What ShotCaller is

**One line:** A disc golf **game-planning** app. You author a hole-by-hole plan
at home; you read it, glanceably, while you play.

**Tagline:** *You call the shots.*

ShotCaller is **not** a scorekeeping app and **not** a stats app. Players already
use **UDisc** or the **PDGA** app to keep score. ShotCaller runs *alongside* those
— it is the **second screen** that answers one question on every tee: *"What am I
throwing here, and where?"*

**The competition is the Notes app and a spreadsheet.** Serious players already
write plans into Apple Notes or a Google Sheet. ShotCaller only earns its place
if it is meaningfully **easier and more disc-golf-native** than typing notes.
Every design decision should be measured against: *"Is this actually better than
a note?"* If a screen feels like data entry into a form, it has failed.

---

## 2. Who uses it, and where (this drives everything)

- **Author (Plan mode):** at home, on the couch, thumbs and attention are cheap.
  Willing to spend time getting the plan right. Calm, deliberate.
- **Reader (Play mode):** on the course, outdoors, **one hand** (a disc in the
  other), **direct sunlight**, **walking**, **~8 seconds** between glancing at the
  phone and throwing, and **constantly switching back from UDisc**. Impatient,
  distracted, sometimes cold/wet/windy.

These are almost two different apps stitched together by one shared data model.
Design them for their two very different moments. Do not let Play mode inherit
Plan mode's density.

---

## 3. The two modes

Mode is a core identity in this app — **each mode has a signature color**
that appears on its badges, selected controls, and primary actions so the player
always knows which mode they're in. There are **two** modes. Pick two
clearly distinct colors; propose them.

### PLAN (authoring)
The user builds a plan for a specific **Course → Layout → Hole**. For each hole the
plan captures:

- **Disc** — chosen from the player's bag (see §5). Shown by its name/nickname.
- **Throw type** — one of: **Backhand, Forehand, Overhand**.
- **Shot shape** — one of: **Hyzer, Flat, Anhyzer, Flex, Turnover, Roller, Spike
  hyzer, Thumber, Tomahawk**. (Coupling rule: **Thumber** and **Tomahawk** are
  overhand throws — selecting either forces Throw type = Overhand and locks it.)
- **Aim / target** — a short **free-text** note describing where to aim and what
  the disc should do. e.g. *"Right edge of the gap, let it fade back to the
  basket. OB left — don't flip it."* This is the heart of the plan in MVP.
- **Hole facts** — par and tee distance (feet), editable per hole.

Design the authoring flow to feel **fast and low-friction** — closer to filling a
smart card than a database form. Selecting disc / throw / shape should be
tap-to-pick (pills/chips), not typing. The only place the user types is the aim
note (and hole facts).

### PLAY (reading) — **design this as a caddie card, not a screen**
The design question is not *"how do I display the plan?"* It is: **"What would a
human caddie say as the player steps to the tee?"** — *Disc. Shape. Target. One
warning.* Everything that doesn't fit in a caddie's single sentence gets demoted
to a detail nobody opens mid-round.

Play mode requirements (hard):

- **One hole per screen.** No scrolling list of holes to read the current one.
- **Disc name in the largest type on the screen.** It's the first thing the eye
  needs. Throw type + shot shape as one compact compound phrase (e.g. *"FH Flex"*).
  Aim note below, readable at arm's length in sun.
- **Advance holes with a swipe or a giant tap target.** Never a dropdown, never a
  scroll-to-find. Advancing must be cheap enough to do while walking.
- **Sunlight-first legibility.** High-contrast, light theme by default in Play
  mode even if the rest of the app is dark. Big type, heavy weight, generous
  spacing. Assume glare.
- **Reopen exactly where you left off.** The player will background ShotCaller to
  check UDisc and come back many times per round. Returning must land on the same
  hole they were on. (Engineering persists this; design should assume it and not
  add a "where was I?" step.)
- **Glanceable in under two seconds, one-handed.** If Play mode needs two taps to
  answer its one question, a laminated index card beats us. That's the bar.

---

## 4. Screen inventory (MVP)

You have freedom in structure, but the product needs at least these surfaces.
Feel free to merge, split, or rename — justify departures.

1. **Home / entry** — get into Plan or Play fast; resume the last thing.
2. **Courses** — list of courses; each course has one or more **Layouts**
   (e.g. "Short", "Long", "Tournament"). Create/edit courses & layouts.
   *(Sort the active/most-recent layout first — see §6.)*
3. **Layout → holes** — the list of holes under a layout, showing at a glance
   which holes have a plan vs. which are still blank.
4. **Plan a hole (Plan mode)** — the authoring card described in §3.
5. **Play a layout (Play mode)** — the caddie-card reader described in §3,
   hole 1 → N, swipeable.
6. **My Bag / Discs** — the player's disc collection (see §5); used as the
   source list when picking a disc in a plan.
7. **About / how it works** — short explainer (carry the spirit of the prototype's About).

---

## 5. The disc bag (kept from the prototype — it's a structural advantage)

Plans reference **real discs from the player's bag**, not free text. This is a
key reason ShotCaller beats a note: the player picks "Destroyer" from a list
instead of retyping it 18 times. A disc has: **model name**, optional
**nickname** (used as its primary display name when set), **category** (one of
**DD** = distance driver, **FWD** = fairway driver, **MID** = midrange,
**P&A** = putt & approach), and flight-number-ish metadata. Keep disc selection
in a plan **fast** — recently/ in-bag discs first.

You don't need to redesign the whole bag manager from scratch; the prototype's disc list is
a reasonable baseline. Focus your energy on Plan and Play.

---

## 6. Design principles & carry-overs (non-negotiable)

- **Mode color is identity, not decoration.** Two modes, two signature colors, on
  badges / selected pills / primary buttons. Don't reuse them for unrelated UI.
- **Play mode = caddie card.** Restated because it's the whole game (see §3).
- **Sort "active" items first.** In-bag discs, the currently-selected/most-recent
  layout — surface them at the top of their lists. (Established preference.)
- **Keep destructive actions confirmed.** Deleting a course, layout, plan, or disc
  gets a confirmation step. (Established preference.)
- **Disc-golf-native vocabulary, fixed lists.** Throw type and shot shape are the
  fixed enums above — never free-text dropdowns. The aim note is the one free
  field.
- **Offline, on-device, no account.** Nothing in the UI implies login, sync, or a
  network. (Native iOS/Android is the primary target; a web build exists as a
  demo/preview channel — design for phone-in-hand first.)

---

## 7. Explicitly OUT of scope for MVP (but design around them)

- **Tee-pad photo + aim-line annotation.** The planned *hero* feature for the
  release **after** MVP: the player photographs the tee and draws their aim line
  on it. **Not built in MVP**, but it will attach to a hole's plan. **Design
  request:** on the Plan-a-hole card, reserve a natural, obvious slot where a
  photo/aim-line would live later (an "Add tee photo" affordance is fine to show,
  even if disabled/"coming soon"), and imagine how Play mode would surface it (a
  photo the player can tap to enlarge). Don't design the drawing tool itself yet —
  just don't paint the layout into a corner that has no room for it.
- **Per-hole "Plan B" (conditional alternative).** e.g. *"Hyzer through the gap —
  but if it's into the wind, forehand roller."* A **fast-follow** right after MVP,
  not in it. One primary line now; leave conceptual room for a secondary
  conditional line (shown in Play as a small secondary card / swipe-up) later.
- **Scorekeeping, stats, practice logging, recommendations.** Cut
  entirely. UDisc/PDGA keep score; ShotCaller never does. Do not add score fields,
  result tracking, or any "best disc" suggestion.

---

## 8. What the prototype looked like (aesthetic baseline)

The app lives in the same codebase as the prototype (React Native + Expo). Its visual
language — clean cards, Ionicons, a considered color palette — is a fine starting
point, not a constraint. There is a palette exploration at `mockups/palettes.html`.
You are free to re-skin the app; just keep the mode-color-as-identity principle and the
sunlight-first Play mode.

---

## 9. Deliverables requested from Claude Design

1. **Plan mode** — the hole-authoring card (the primary craft surface).
2. **Play mode** — the caddie card + hole-to-hole navigation (the make-or-break
   surface; spend the most time here).
3. **Navigation / IA** — how Home, Courses, Layouts, Bag, Plan, and Play connect.
4. **The two mode colors** + how they're applied.
5. **Light/sunlight treatment** for Play mode.
6. Notes on where the **future photo feature** and **Plan B** slot in without a
   redesign.

Ground rule to keep repeating to yourself: *if it's not clearly better than a
note in Apple Notes, it's not done.*
