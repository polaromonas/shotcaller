#!/usr/bin/env node
/**
 * Captures phone-sized screenshots of ShotCaller with demo data, for the pitch
 * package in pitch/.
 *
 *   npx expo start --web --port 8091     # in another terminal
 *   node scripts/capture-screens.mjs     # writes pitch/screens/ + pitch/framed/
 *
 * Seeds the demo data (src/dev/seedDemo.ts) via `?seed=demo` — dev server
 * only — then clicks through Plan and Play at iPhone 15 Pro size (393×852 @3x)
 * with the notch/home-bar safe areas emulated. Each shot is also composited
 * into a phone frame with a status bar (pitch/framed/).
 *
 * Env: APP_URL (default http://localhost:8091/shotcaller/),
 *      BROWSER (default: Microsoft Edge on macOS).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'pitch/screens');
const FRAMED = join(ROOT, 'pitch/framed');
const APP_URL = process.env.APP_URL ?? 'http://localhost:8091/shotcaller/';
const BROWSER =
  process.env.BROWSER ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

const PHONE = { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SAFE_AREA = { top: 59, bottom: 34, left: 0, right: 0 };
const DARK = 'dark'; // status bar style: light text on the dark shell
const LIGHT = 'light'; // dark text on Play's sunlight theme

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForText(page, text) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 60000 }, text);
  await sleep(700); // let fonts settle and transitions finish
}

// Click the on-screen element showing `text`. Stack screens underneath stay in
// the DOM (hidden), so only match an element that is actually topmost at its
// own center point.
async function tap(page, text) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const pt = await page.evaluate((t) => {
      // Innermost elements whose text contains `t` (React may split one label
      // like "Hole 5 ›" into several text nodes, so match on textContent).
      const all = [...document.body.querySelectorAll('*')].filter((el) =>
        el.textContent.includes(t)
      );
      const innermost = all.filter(
        (el) => ![...el.children].some((c) => c.textContent.includes(t))
      );
      const hits = [];
      for (const el of innermost) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const top = document.elementFromPoint(x, y);
        if (top && (top === el || el.contains(top) || top.contains(el))) hits.push({ x, y });
      }
      return hits.at(-1) ?? null;
    }, text);
    if (pt) {
      await page.mouse.click(pt.x, pt.y);
      return;
    }
    await sleep(250);
  }
  throw new Error(`tap: no visible "${text}"`);
}

// Courses start collapsed; tapping a course reveals its layouts.
async function openLayouts(page) {
  await tap(page, 'Open courses ›');
  await waitForText(page, 'Lakeside Park');
  await tap(page, 'Cedar Ridge');
  await waitForText(page, '+ Add layout');
}

// Each shot starts from Home (a fresh load), so one bad step can't cascade.
async function home(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle0' });
  await waitForText(page, 'You call the shots.');
}

const SHOTS = [
  // ---- Plan ----
  { name: '01-home', bar: DARK, title: 'Home', go: async () => {} },
  {
    name: '02-courses', bar: DARK, title: 'Courses',
    go: async (p) => { await openLayouts(p); },
  },
  {
    name: '03-layout-holes', bar: DARK, title: 'Layout overview',
    go: async (p) => {
      await openLayouts(p);
      await tap(p, 'Blue tees'); await waitForText(p, 'holes planned');
    },
  },
  {
    name: '04-plan-hole', bar: DARK, title: 'Plan a hole',
    go: async (p) => {
      await openLayouts(p);
      await tap(p, 'Blue tees'); await waitForText(p, 'Par 3 · 290');
      await tap(p, 'Par 3 · 290'); await waitForText(p, 'Disc — from');
    },
  },
  {
    name: '05-disc-picker', bar: DARK, title: 'Disc picker',
    go: async (p) => {
      await openLayouts(p);
      await tap(p, 'Blue tees'); await waitForText(p, 'Par 3 · 290');
      await tap(p, 'Par 3 · 290'); await waitForText(p, 'Disc — from');
      await tap(p, 'discs…'); await waitForText(p, 'Pick a disc');
    },
  },
  {
    name: '06-plan-flagged', bar: DARK, title: 'Flagged to revise',
    go: async (p) => {
      await openLayouts(p);
      await tap(p, 'Blue tees'); await waitForText(p, 'Par 3 · 285');
      await tap(p, 'Par 3 · 285'); await waitForText(p, 'Flagged to revise');
    },
  },
  {
    name: '07-my-bag', bar: DARK, title: 'My Bag',
    go: async (p) => { await tap(p, 'My Bag'); await waitForText(p, '+ New bag'); },
  },
  {
    name: '14-plan-switch-bag', bar: DARK, title: 'Plan — switch bag',
    go: async (p) => {
      await openLayouts(p);
      await tap(p, 'Blue tees'); await waitForText(p, 'Par 3 · 290');
      await tap(p, 'Par 3 · 290'); await waitForText(p, 'Disc — from');
      await tap(p, 'Switch bag'); await waitForText(p, 'Which bag are you carrying?');
    },
  },
  {
    name: '13-edit-layout', bar: DARK, title: 'Edit layout — add or remove holes',
    go: async (p) => {
      await openLayouts(p);
      await tap(p, 'Blue tees'); await waitForText(p, 'holes planned');
      await tap(p, 'Edit layout'); await waitForText(p, 'Add hole');
      // Scroll the hole list to the end so the add/remove buttons show.
      await p.evaluate(() => {
        for (const el of document.querySelectorAll('*')) {
          if (el.scrollHeight > el.clientHeight + 20 && getComputedStyle(el).overflowY !== 'visible') {
            el.scrollTop = el.scrollHeight;
          }
        }
      });
      await sleep(500);
    },
  },
  // ---- Play ---- (opening a round moves the saved hole, so these run last)
  {
    name: '08-play-picker', bar: DARK, title: 'Pick a layout',
    go: async (p) => { await tap(p, 'Pick a layout ›'); await waitForText(p, 'All layouts'); },
  },
  {
    name: '09-caddie-hole-4', bar: LIGHT, title: 'Caddie card',
    go: async (p) => { await tap(p, 'Resume round'); await waitForText(p, 'Out over the creek'); },
  },
  {
    name: '10-caddie-hole-6', bar: LIGHT, title: 'Caddie card — par 4',
    go: async (p) => {
      await tap(p, 'Resume round'); await waitForText(p, 'Hole 5 ›');
      await tap(p, 'Hole 5 ›'); await waitForText(p, 'Hole 6 ›');
      await tap(p, 'Hole 6 ›'); await waitForText(p, 'Big hyzer');
    },
  },
  {
    name: '11-caddie-flagged', bar: LIGHT, title: 'Caddie card — flagged',
    go: async (p) => {
      await tap(p, 'Resume round'); await waitForText(p, 'Hole 7 ›');
      for (let n = 7; n <= 12; n++) { await tap(p, `Hole ${n} ›`); await waitForText(p, `Hole ${n + 1} ›`); }
      await waitForText(p, 'To revise');
    },
  },
  {
    name: '12-caddie-thumber', bar: LIGHT, title: 'Caddie card — overhand',
    go: async (p) => {
      await tap(p, 'Resume round'); await waitForText(p, 'Hole 13 ›');
      await tap(p, 'Hole 13 ›'); await waitForText(p, 'Hole 14 ›');
      await tap(p, 'Hole 14 ›'); await waitForText(p, 'Thumber over the top');
    },
  },
];

// Phone frame around a raw screenshot: rounded bezel, Dynamic Island, a 9:41
// status bar, and the home indicator. Rendered by the same browser.
function frameHtml(imgUrl, bar) {
  const ink = bar === LIGHT ? '#101312' : '#ffffff';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  .phone{position:relative;width:${PHONE.width + 24}px;height:${PHONE.height + 24}px;
    border-radius:64px;background:#0b0c0f;box-shadow:inset 0 0 0 2px #3a3d45, 0 0 0 1px #000;}
  .screen{position:absolute;inset:12px;border-radius:52px;overflow:hidden}
  .screen img{width:${PHONE.width}px;height:${PHONE.height}px;display:block}
  .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);width:124px;height:36px;
    border-radius:20px;background:#000}
  .status{position:absolute;top:0;left:0;right:0;height:54px;display:flex;align-items:center;
    justify-content:space-between;padding:4px 34px 0 50px;box-sizing:border-box;color:${ink};
    font:600 17px -apple-system,'SF Pro Text',Helvetica,Arial,sans-serif}
  .icons{display:flex;gap:7px;align-items:center}
  .home{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:139px;height:5px;
    border-radius:3px;background:${ink};opacity:.85}
  </style></head><body><div class="phone"><div class="screen">
  <img src="${imgUrl}">
  <div class="status"><span>9:41</span><span class="icons">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="${ink}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="${ink}"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .4 10.3 10.3 0 0 0 .8 3.3L2 4.6a8.5 8.5 0 0 1 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4a6.7 6.7 0 0 0-4.6 1.8l1.2 1.3A5 5 0 0 1 8 5.8zm0 3.5c.5 0 .9.2 1.2.5L8 11.2 6.8 9.8c.3-.3.7-.5 1.2-.5z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="${ink}" opacity=".4"/><rect x="2" y="2" width="19" height="9" rx="2" fill="${ink}"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" fill="${ink}" opacity=".5"/></svg>
  </span></div>
  <div class="island"></div><div class="home"></div>
  </div></div></body></html>`;
}

async function main() {
  await mkdir(RAW, { recursive: true });
  await mkdir(FRAMED, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport(PHONE);
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: SAFE_AREA });

    // Fresh demo data.
    await page.goto(`${APP_URL}?seed=demo`, { waitUntil: 'networkidle0', timeout: 120000 });
    await waitForText(page, 'Resume round');

    for (const shot of SHOTS) {
      await home(page);
      try {
        await shot.go(page);
      } catch (err) {
        await page.screenshot({ path: join(RAW, `FAILED-${shot.name}.png`) });
        throw new Error(`${shot.name}: ${err.message} (see pitch/screens/FAILED-${shot.name}.png)`);
      }
      const file = join(RAW, `${shot.name}.png`);
      await page.screenshot({ path: file });
      console.log(`captured ${shot.name}`);
    }

    // Frame every shot.
    const framer = await browser.newPage();
    await framer.setViewport({ width: PHONE.width + 24, height: PHONE.height + 24, deviceScaleFactor: 3 });
    for (const shot of SHOTS) {
      const html = join(FRAMED, '.frame.html');
      await writeFile(html, frameHtml(pathToFileURL(join(RAW, `${shot.name}.png`)).href, shot.bar));
      await framer.goto(pathToFileURL(html).href, { waitUntil: 'load' });
      await framer.screenshot({ path: join(FRAMED, `${shot.name}.png`), omitBackground: true });
    }
    await import('node:fs/promises').then((fs) => fs.rm(join(FRAMED, '.frame.html')));
    await writeFile(
      join(FRAMED, 'shots.json'),
      JSON.stringify(SHOTS.map(({ name, title }) => ({ name, title })), null, 2) + '\n'
    );
    console.log(`framed ${SHOTS.length} shots → pitch/framed/`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
