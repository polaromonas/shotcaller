#!/usr/bin/env node
/**
 * Renders the ShotCaller app icon set from one SVG definition.
 *
 *   node scripts/build-icons.mjs
 *
 * The mark: "SC" in Barlow Condensed ExtraBold, S indigo / C teal (both one
 * step brighter than the app's mode colors so they read equally on the dark
 * tile), with a white disc flying through and a dark gap cut around it.
 *
 * Writes:
 *   assets/icon.png           1024² opaque, full-bleed (iOS rounds the corners)
 *   assets/adaptive-icon.png  1024² transparent foreground, mark inside
 *                             Android's 66% safe zone (bg color in app.json)
 *   assets/splash-icon.png    1024² transparent, mark + "You call the shots."
 *   assets/favicon.png        48² rounded tile for browser tabs
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER =
  process.env.BROWSER ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const font = (rel) => pathToFileURL(join(ROOT, 'node_modules/@expo-google-fonts', rel)).href;
const FONT = font('barlow-condensed/800ExtraBold/BarlowCondensed_800ExtraBold.ttf');
const TAGLINE_FONT = font('barlow/600SemiBold/Barlow_600SemiBold.ttf');
const TAGLINE = 'You call the shots.';

export const COLORS = {
  tile: '#101216', // app dark shell
  s: '#7970D1', // indigo, brightened for the dark tile
  c: '#0D8B8B', // teal, brightened to match the S
  disc: '#F6F7F4', // Play's light ground
  tagline: '#8B909B', // muted text, as under the wordmark on Home
};

// The mark in a 100×100 box. `scale` shrinks it around the center (safe
// zones); `tile` draws the dark background; `radius` rounds the tile;
// `tagline` lifts the mark and sets "You call the shots." under it.
function svg({ size, scale = 1, tile = true, radius = 0, tagline = false }) {
  const tilt = 'transform="rotate(-10 50 51)"';
  const lift = tagline ? -6 : 0;
  const shrink = `translate(50 ${50 + lift}) scale(${scale}) translate(-50 -50)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <mask id="cut"><rect width="100" height="100" fill="#fff"/>
      <ellipse cx="50" cy="51" rx="49" ry="5.2" ${tilt} fill="#000"/></mask>
  </defs>
  ${tile ? `<rect width="100" height="100" rx="${radius}" fill="${COLORS.tile}"/>` : ''}
  <g transform="${shrink}">
    <g mask="url(#cut)">
      <text x="50" y="76" text-anchor="middle" font-family="BC" font-weight="800"
        font-size="74" letter-spacing="-1"><tspan fill="${COLORS.s}">S</tspan><tspan fill="${COLORS.c}">C</tspan></text>
    </g>
    <ellipse cx="50" cy="51" rx="42" ry="2.6" ${tilt} fill="${COLORS.disc}"/>
  </g>
  ${tagline ? `<text x="50" y="69" text-anchor="middle" font-family="B" font-weight="600" font-size="5.6" fill="${COLORS.tagline}">${TAGLINE}</text>` : ''}
</svg>`;
}

const OUTPUTS = [
  { file: 'assets/icon.png', size: 1024, opts: {} },
  { file: 'assets/adaptive-icon.png', size: 1024, opts: { tile: false, scale: 0.72 } },
  { file: 'assets/splash-icon.png', size: 1024, opts: { tile: false, scale: 0.5, tagline: true } },
  { file: 'assets/favicon.png', size: 48, opts: { radius: 22 } },
];

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'sc-icons-'));
  const browser = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    args: ['--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    for (const { file, size, opts } of OUTPUTS) {
      const html = join(dir, 'icon.html');
      await writeFile(
        html,
        `<!doctype html><html><head><style>
          @font-face{font-family:BC;font-weight:800;src:url(${FONT})}
          @font-face{font-family:B;font-weight:600;src:url(${TAGLINE_FONT})}
          html,body{margin:0;background:transparent}svg{display:block}
        </style></head><body>${svg({ size, ...opts })}</body></html>`
      );
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');
      await page.screenshot({
        path: join(ROOT, file),
        omitBackground: opts.tile === false || (opts.radius ?? 0) > 0,
      });
      console.log(`wrote ${file} (${size}×${size})`);
    }
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
