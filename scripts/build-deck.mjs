#!/usr/bin/env node
/**
 * Builds the pitch slide deck from the framed phone screenshots.
 *
 *   node scripts/capture-screens.mjs   # first: pitch/framed/*.png
 *   node scripts/build-deck.mjs        # writes pitch/ShotCaller-deck.pdf
 *                                      #    and pitch/slides/NN.png
 *
 * Slides are 1920×1080, in the app's own palette and Barlow fonts (loaded from
 * node_modules, so this works offline).
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PITCH = join(ROOT, 'pitch');
const BROWSER =
  process.env.BROWSER ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const font = (pkg, file) =>
  pathToFileURL(join(ROOT, 'node_modules/@expo-google-fonts', pkg, file)).href;
const shot = (name) => pathToFileURL(join(PITCH, 'framed', `${name}.png`)).href;

const PLAN = '#5B4FC7';
const PLAY = '#0E8C8C';
const DEMO_URL = 'polaromonas.github.io/shotcaller';

// A phone with an optional caption under it. `h` is the phone's height in px.
const phone = (name, caption = '', h = 680) => `
  <figure class="phone" style="--h:${h}px">
    <img src="${shot(name)}" alt="">
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}
  </figure>`;

const SLIDES = [
  // 1 — Title
  `<section class="title">
    <div class="copy">
      <div class="wordmark">ShotCaller</div>
      <div class="tagline">You call the shots.</div>
      <p class="lede">A game-planning app for disc golf. Write a hole-by-hole plan at home,
        then read it on the tee — one glance, one throw.</p>
      <div class="chips"><span class="chip plan">Plan</span><span class="chip play">Play</span></div>
    </div>
    <div class="stack">
      ${phone('01-home', '', 820)}
      ${phone('09-caddie-hole-4', '', 820)}
    </div>
  </section>`,

  // 2 — Problem
  `<section class="text">
    <div class="kicker">The problem</div>
    <h1>Serious players already plan their rounds.<br>They do it in the Notes app.</h1>
    <div class="cards">
      <div class="card"><h3>Not built for disc golf</h3><p>Free-text notes and spreadsheets don't know your bag, your throws, or your shot shapes.</p></div>
      <div class="card"><h3>Unreadable on the tee</h3><p>Small text, scrolling, glare. You have seconds before you throw — not a minute to find hole 12.</p></div>
      <div class="card"><h3>Lost between apps</h3><p>You keep score in UDisc. Every switch back means hunting for where you were.</p></div>
    </div>
  </section>`,

  // 3 — How it works
  `<section class="split">
    <div class="copy">
      <div class="kicker">How it works</div>
      <h1>Two modes.<br>Two moments.</h1>
      <div class="mode"><span class="chip plan">Plan</span><p><b>At home.</b> For each hole, pick the disc, the throw, the shot shape, and jot where to aim.</p></div>
      <div class="mode"><span class="chip play">Play</span><p><b>On the tee.</b> One hole per screen, sunlight-readable. The disc name is the biggest thing on it.</p></div>
      <p class="note">It runs alongside UDisc or the PDGA app. It never keeps score.</p>
    </div>
    <div class="row">
      ${phone('04-plan-hole', 'Plan a hole', 740)}
      <div class="arrow">→</div>
      ${phone('09-caddie-hole-4', 'Read it on the tee', 740)}
    </div>
  </section>`,

  // 4 — Plan
  `<section class="gallery">
    <div class="head"><span class="chip plan">Plan</span><h2>Build it at home</h2>
      <p>Partial plans are fine — jot what you know, fill in the rest later.</p></div>
    <div class="row">
      ${phone('03-layout-holes', 'Every hole at a glance — planned, blank, flagged')}
      ${phone('04-plan-hole', 'Disc, throw, shape, and an aim note')}
      ${phone('05-disc-picker', 'Your whole bag, with real flight numbers')}
    </div>
  </section>`,

  // 5 — Bag & courses
  `<section class="gallery">
    <div class="head"><span class="chip neutral">Setup</span><h2>Your bag. Your courses.</h2>
      <p>Type a mold and the built-in catalog of ~1,200 discs fills in the flight numbers.</p></div>
    <div class="row">
      ${phone('07-my-bag', 'My Bag — grouped by category, shelved discs kept')}
      ${phone('02-courses', 'Courses with multiple layouts (Blue tees, Red tees)')}
      ${phone('08-play-picker', 'Most-planned layouts first')}
    </div>
  </section>`,

  // 6 — Play
  `<section class="gallery play-bg">
    <div class="head"><span class="chip play">Play</span><h2>Read it on the tee</h2>
      <p>High contrast for sunlight. Swipe or tap to the next hole.</p></div>
    <div class="row">
      ${phone('09-caddie-hole-4', 'Disc, shape, aim — in under two seconds')}
      ${phone('10-caddie-hole-6', 'Par 4s: plan the drive, note the layup')}
      ${phone('12-caddie-thumber', 'Overhands too — Thumber locks to Overhand')}
    </div>
  </section>`,

  // 7 — The loop
  `<section class="gallery">
    <div class="head"><span class="chip review">Revise</span><h2>Flag it on the course. Fix it at home.</h2>
      <p>One tap on the tee marks a plan that didn't work. It's waiting for you in Plan.</p></div>
    <div class="row">
      ${phone('11-caddie-flagged', 'On the tee: tap the flag')}
      <div class="arrow">→</div>
      ${phone('03-layout-holes', 'At home: "1 to revise"')}
      <div class="arrow">→</div>
      ${phone('06-plan-flagged', 'Revise, then resolve')}
    </div>
  </section>`,

  // 8 — Built for the course
  `<section class="split">
    <div class="copy">
      <div class="kicker">Built for the course</div>
      <h1>Picks up where<br>you left off.</h1>
      <ul>
        <li><b>Resume after UDisc.</b> Switch away to keep score; Play reopens on the hole you were on.</li>
        <li><b>On your phone only.</b> Your bag, courses and plans stay on the device. No account, no server.</li>
        <li><b>iOS and Android</b> from one codebase, plus a web demo.</li>
      </ul>
    </div>
    <div class="row">
      ${phone('01-home', '“Resume round” on Home', 740)}
      ${phone('08-play-picker', 'And in the layout picker', 740)}
    </div>
  </section>`,

  // 9 — Close
  `<section class="close">
    <div class="wordmark">ShotCaller</div>
    <div class="tagline">You call the shots.</div>
    <div class="cta">Try it: <b>${DEMO_URL}</b></div>
    <p class="note">Early prototype — feedback very welcome. Screens show demo data.</p>
  </section>`,
];

const css = `
@font-face{font-family:BC;font-weight:700;src:url(${font('barlow-condensed', '700Bold/BarlowCondensed_700Bold.ttf')})}
@font-face{font-family:BC;font-weight:800;src:url(${font('barlow-condensed', '800ExtraBold/BarlowCondensed_800ExtraBold.ttf')})}
@font-face{font-family:B;font-weight:500;src:url(${font('barlow', '500Medium/Barlow_500Medium.ttf')})}
@font-face{font-family:B;font-weight:600;src:url(${font('barlow', '600SemiBold/Barlow_600SemiBold.ttf')})}
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#101216}
section{width:1920px;height:1080px;position:relative;overflow:hidden;page-break-after:always;
  background:radial-gradient(1200px 700px at 85% 10%, #1b1d33 0%, #101216 60%);color:#EDEEF2;
  font-family:B;font-weight:500;padding:96px 120px}
.play-bg{background:radial-gradient(1200px 700px at 15% 0%, #0f2b2c 0%, #101216 60%)}
h1{font-family:BC;font-weight:800;font-size:96px;line-height:.98;margin:0 0 40px}
h2{font-family:BC;font-weight:800;font-size:72px;margin:0}
h3{font-family:BC;font-weight:700;font-size:36px;margin:0 0 12px}
p,li{font-size:28px;line-height:1.4;color:#B7BBC6}
b{color:#EDEEF2;font-weight:600}
.kicker{font-family:BC;font-weight:700;font-size:30px;color:#8B909B;margin-bottom:20px}
.wordmark{font-family:BC;font-weight:800;font-size:180px;line-height:.9}
.tagline{font-family:B;font-weight:600;font-size:44px;color:#8B909B;margin-top:12px}
.chip{display:inline-block;font-family:BC;font-weight:700;font-size:30px;color:#fff;
  padding:8px 22px;border-radius:12px}
.chip.plan{background:${PLAN}}.chip.play{background:${PLAY}}
.chip.neutral{background:#232733}.chip.review{background:#C98A1B;color:#1a1200}
.chips{display:flex;gap:16px;margin-top:40px}
.phone{margin:0;display:flex;flex-direction:column;align-items:center;gap:22px}
.phone img{height:var(--h);filter:drop-shadow(0 30px 60px rgba(0,0,0,.55))}
.phone figcaption{font-size:24px;color:#B7BBC6;text-align:center;max-width:360px;line-height:1.3}
.row{display:flex;gap:56px;align-items:center;justify-content:center}
.arrow{font-family:BC;font-weight:800;font-size:72px;color:#5c6270;margin-bottom:60px}
.title{display:flex;align-items:center;justify-content:space-between}
.title .copy{max-width:760px}
.title .lede{font-size:34px;margin-top:48px}
.title .stack{position:relative;width:820px;height:900px}
.title .stack .phone{position:absolute;top:40px}
.title .stack .phone:first-child{left:0;transform:rotate(-4deg)}
.title .stack .phone:last-child{right:0;top:80px;transform:rotate(4deg)}
.text{display:flex;flex-direction:column;justify-content:center}
.text h1{max-width:1500px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:80px}
.card{background:#171A20;border:1px solid #232733;border-radius:28px;padding:44px}
.card p{margin:0}
.split{display:flex;align-items:center;justify-content:space-between;gap:60px}
.split .copy{max-width:720px}
.mode{display:flex;gap:24px;align-items:flex-start;margin:28px 0}
.mode .chip{flex:none;margin-top:4px}.mode p{margin:0}
.note{font-size:24px;color:#8B909B;margin-top:36px}
ul{padding-left:28px;margin:0}li{margin:0 0 22px}
.gallery{display:flex;flex-direction:column;justify-content:space-between;gap:48px;padding-top:72px;padding-bottom:56px}
.gallery .head{display:flex;align-items:baseline;gap:28px;flex-wrap:wrap}
.gallery .head p{flex-basis:100%;margin:12px 0 0}
.close{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.close .cta{font-size:44px;margin-top:80px;color:#B7BBC6}
.close .cta b{color:#fff;border-bottom:4px solid ${PLAY};padding-bottom:4px}
`;

async function main() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>ShotCaller</title>
    <style>${css}</style></head><body>${SLIDES.join('\n')}</body></html>`;
  const tmp = join(PITCH, '.deck.html');
  await writeFile(tmp, html);
  await mkdir(join(PITCH, 'slides'), { recursive: true });

  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');

    await page.pdf({
      path: join(PITCH, 'ShotCaller-deck.pdf'),
      width: '1920px',
      height: '1080px',
      printBackground: true,
    });

    const sections = await page.$$('section');
    for (const [i, el] of sections.entries()) {
      await el.screenshot({ path: join(PITCH, 'slides', `${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log(`wrote pitch/ShotCaller-deck.pdf and ${sections.length} slide PNGs`);
  } finally {
    await browser.close();
    await rm(tmp, { force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
