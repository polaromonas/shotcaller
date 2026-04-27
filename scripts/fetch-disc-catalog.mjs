#!/usr/bin/env node
/**
 * Refreshes src/data/disc-catalog.json from discit-api.fly.dev.
 *
 * Run manually when you want a fresher catalog:
 *   node scripts/fetch-disc-catalog.mjs
 *
 * Not wired into CI — keeps the build off the network and lets us
 * pin to a known-good snapshot.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'src/data/disc-catalog.json');
const SRC_URL = 'https://discit-api.fly.dev/disc';

// Map discit's wider category list to our 4-enum schema.
const CATEGORY_MAP = {
  'Distance Driver': 'DD',
  'Hybrid Driver': 'FWD',
  'Control Driver': 'FWD',
  Midrange: 'MID',
  Putter: 'P&A',
  'Approach Discs': 'P&A',
};

const parseFlight = (s) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

async function main() {
  console.log(`fetching ${SRC_URL}…`);
  const res = await fetch(SRC_URL);
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  console.log(`  received ${raw.length} entries`);

  const slim = [];
  let skippedCategory = 0;
  let skippedFlight = 0;
  for (const d of raw) {
    const category = CATEGORY_MAP[d.category];
    if (!category) {
      skippedCategory += 1;
      continue;
    }
    const speed = parseFlight(d.speed);
    const glide = parseFlight(d.glide);
    const turn = parseFlight(d.turn);
    const fade = parseFlight(d.fade);
    if (
      speed === null ||
      glide === null ||
      turn === null ||
      fade === null
    ) {
      skippedFlight += 1;
      continue;
    }
    slim.push({
      model: d.name,
      manufacturer: d.brand,
      category,
      speed,
      glide,
      turn,
      fade,
    });
  }

  // Stable sort so diffs stay readable.
  slim.sort((a, b) =>
    `${a.manufacturer}/${a.model}`.localeCompare(`${b.manufacturer}/${b.model}`)
  );

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(slim, null, 2) + '\n');
  console.log(
    `wrote ${slim.length} discs to ${OUT_PATH}` +
      ` (skipped ${skippedCategory} unmapped categories, ${skippedFlight} bad flight numbers)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
