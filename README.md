# ShotCaller

> You call the shots.

ShotCaller is a disc golf tournament-prep app. Build your disc collection,
log practice throws, lock in a hole-by-hole game plan, and execute it
during the tournament — all on one device, fully offline.

**Live demo:** <https://polaromonas.github.io/shotcaller/>

## How it works

Three connected modes that share one throw-logging UI:

1. **Practice round.** Walk up to a course, pick (or create) the layout,
   log throws as you play. Par and distance are filled in at each tee box.
   You can leave and resume later.
2. **Game plan.** After enough practice on a layout, the app ranks your
   most reliable disc + throw type + shot shape per hole and surfaces
   it as a recommendation. Override anything you want, then lock it in.
3. **Tournament round.** Each hole shows the locked-in plan as a
   read-only card with the planned disc and shot shape pre-selected.
   One tap logs a throw if you executed as planned. Override per
   throw without modifying the plan.

The recommendation engine weighs Basket and C1 equally (a reliable
inside-circle shot is as good as an ace for tournament planning) and
weighs OB at −1 — a combo that occasionally goes OB ranks below a
slightly less spectacular combo that never does.

## Stack

- **React Native + Expo (SDK 54)** — single codebase, runs on iOS,
  Android, and the web.
- **Expo SQLite (wa-sqlite on web)** — every disc, course, throw, and
  game plan is stored on-device. No account, no server, no cloud sync.
- **TypeScript**, strict.

## Privacy & persistence

All your data stays in your browser's local storage (OPFS on web,
SQLite on native). Nothing is uploaded anywhere. The flip side:
clearing your browser data, switching devices, or being on iOS Safari
without cross-origin isolation headers means the data may be lost.
Game plans can be exported to plain text as a hedge.

## Development

```
npm install
npx expo install
npm start            # opens the dev server
npm test             # SQL smoke tests against an in-memory better-sqlite3
npx expo export --platform web   # produces dist/ for static deploy
```

The full design rationale lives in [`SHOTCALLER_HANDOFF.md`](./SHOTCALLER_HANDOFF.md).
Codebase conventions live in [`CLAUDE.md`](./CLAUDE.md).
