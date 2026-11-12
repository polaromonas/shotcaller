# ShotCaller

> You call the shots.

ShotCaller is a disc golf game-planning app. Write a hole-by-hole plan at
home, then read it on the tee — big, glanceable, one-handed, in sunlight.
It runs alongside your scorekeeping app (UDisc, PDGA); it never keeps score.

**Live demo:** <https://polaromonas.github.io/shotcaller/>

## How it works

Two modes, each with its own color:

1. **Plan** (indigo). Pick a course and layout, then plan each hole: the
   disc, the throw (backhand / forehand / overhand), the shot shape, and a
   note on where to aim. Partial plans are fine — jot what you know. While
   playing you can flag a hole "to revise" and fix the plan later.
2. **Play** (teal). One hole per screen on a high-contrast light card: the
   disc name is the biggest thing, the throw and shape read as one phrase
   ("FH Flex"), the aim note sits below. Swipe to the next tee. When you
   come back from your scorekeeping app it reopens on the hole you were on.

**My Bag** holds your discs. Adding one is fast: type a model and the
built-in catalog of ~1,200 molds fills in the manufacturer, category and
flight numbers.

## Stack

- **React Native + Expo (SDK 54)** — one codebase for iOS, Android and the
  web. Native is the primary target; the web build is a demo.
- **Expo SQLite** (wa-sqlite in the browser) — everything is stored
  on-device. No account, no server, no sync.
- **TypeScript**, strict.

## Privacy and storage

Your discs, courses and plans never leave your device. On the web demo they
live in your browser's storage, so clearing site data or switching browsers
starts you fresh.

## Development

```
npm install
npm start                        # Expo dev server (QR code for a device)
npm run web                      # run in the browser
npm test                         # SQL smoke tests (in-memory SQLite)
npx tsc --noEmit                 # type-check
npx expo export --platform web   # static build in dist/
```

Every push to `main` runs the tests and deploys the web build to GitHub
Pages (`.github/workflows/deploy.yml`).

Product and data-model decisions live in
[`SHOTCALLER_HANDOFF.md`](./SHOTCALLER_HANDOFF.md); the approved UI is in
[`design/`](./design/); codebase conventions are in [`CLAUDE.md`](./CLAUDE.md).

## Credits

The disc catalog behind Add Disc search (names, brands and flight numbers)
comes from the [Marshall Street Disc Golf Interactive Flight Guide](https://www.marshallstreetdiscgolf.com/flightguide),
collected by the [DiscIt API](https://github.com/DiscIt-API/discit-api).
It ships as a snapshot in `src/data/disc-catalog.json`; refresh it with
`node scripts/fetch-disc-catalog.mjs`. Fonts: Barlow and Barlow Condensed
(SIL Open Font License).

## History

ShotCaller started as a practice-logging and stats prototype (git tag
[`v1-final`](https://github.com/polaromonas/shotcaller/tree/v1-final)). It
was rebuilt as this focused planning app; the handoff's §7 lists what was cut.
