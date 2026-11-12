// Demo data for screenshots and walkthroughs (scripts/capture-screens.mjs).
// Dev-only: App.tsx runs this on web when the URL has `?seed=demo`, behind
// __DEV__, so it never ships in the production web build. It wipes the local
// DB first, so the result is the same every time.
//
// The course is fictional on purpose — we don't misstate a real course's holes.
// Disc flight numbers are real (from the bundled catalog).
import { createCourse, createLayoutWithHoles, listHoles, updateHole } from '../db/courses';
import { createDisc, type NewDiscInput } from '../db/discs';
import { getDb, resetDb } from '../db';
import { saveHolePlan, setHolePlanReview } from '../db/plans';
import { setPlayHoleNumber } from '../db/play';
import { setBagColor } from '../db/settings';
import type { ThrowType } from '../db/types';

type DiscKey =
  | 'destroyer' | 'zeus' | 'wraith' | 'tbird' | 'firebird' | 'teebird' | 'leopard'
  | 'volt' | 'buzzz' | 'roc' | 'mako' | 'zone' | 'envy' | 'judge' | 'luna';

const BAG: Record<DiscKey, NewDiscInput> = {
  destroyer: { manufacturer: 'Innova', model: 'Destroyer', plastic: 'Star', color: '#e63946', category: 'DD', speed: 12, glide: 5, turn: -1, fade: 3 },
  zeus:      { manufacturer: 'Discraft', model: 'Zeus', plastic: 'ESP', color: '#1d3557', category: 'DD', speed: 12, glide: 5, turn: -1, fade: 3, nickname: 'Big Blue' },
  wraith:    { manufacturer: 'Innova', model: 'Wraith', plastic: 'Champion', color: '#9b5de5', category: 'FWD', speed: 11, glide: 5, turn: -1, fade: 3 },
  tbird:     { manufacturer: 'Innova', model: 'Thunderbird', plastic: 'Star', color: '#ff6b35', category: 'FWD', speed: 9, glide: 5, turn: 0, fade: 2 },
  firebird:  { manufacturer: 'Innova', model: 'Firebird', plastic: 'Champion', color: '#ffdd00', category: 'FWD', speed: 9, glide: 3, turn: 0, fade: 4, nickname: 'Old Faithful' },
  teebird:   { manufacturer: 'Innova', model: 'Teebird', plastic: 'Star', color: '#6ab04c', category: 'FWD', speed: 7, glide: 5, turn: 0, fade: 2 },
  leopard:   { manufacturer: 'Innova', model: 'Leopard3', plastic: 'DX', color: '#00b4d8', category: 'FWD', speed: 7, glide: 5, turn: -2, fade: 1 },
  volt:      { manufacturer: 'MVP', model: 'Volt', plastic: 'Neutron', color: '#ff006e', category: 'FWD', speed: 8, glide: 5, turn: -0.5, fade: 2 },
  buzzz:     { manufacturer: 'Discraft', model: 'Buzzz', plastic: 'ESP', color: '#2a9d8f', category: 'MID', speed: 5, glide: 4, turn: -1, fade: 1 },
  roc:       { manufacturer: 'Innova', model: 'Roc3', plastic: 'Star', color: '#f4a261', category: 'MID', speed: 5, glide: 4, turn: 0, fade: 3 },
  mako:      { manufacturer: 'Innova', model: 'Mako3', plastic: 'Champion', color: '#ff99c8', category: 'MID', speed: 5, glide: 5, turn: 0, fade: 0 },
  zone:      { manufacturer: 'Discraft', model: 'Zone', plastic: 'ESP', color: '#ffffff', category: 'MID', speed: 4, glide: 3, turn: 0, fade: 3 },
  envy:      { manufacturer: 'Axiom Discs', model: 'Envy', plastic: 'Electron', color: '#457b9d', category: 'P&A', speed: 3, glide: 3, turn: 0, fade: 2 },
  judge:     { manufacturer: 'Dynamic Discs', model: 'Judge', plastic: 'Classic', color: '#cccccc', category: 'P&A', speed: 2, glide: 4, turn: 0, fade: 1, nickname: 'Putter' },
  luna:      { manufacturer: 'Discraft', model: 'Luna', plastic: 'Jawbreaker', color: '#7f5539', category: 'P&A', speed: 3, glide: 3, turn: 0, fade: 3 },
};
// Shelved: owned but not bagged — shows the "shelved" section in My Bag.
const SHELVED: NewDiscInput[] = [
  { manufacturer: 'Innova', model: 'Teebird', plastic: 'DX', color: '#2a2d3a', category: 'FWD', speed: 7, glide: 5, turn: 0, fade: 2 },
  { manufacturer: 'Latitude 64', model: 'Compass', plastic: 'Opto', color: '#f4a261', category: 'MID', speed: 5, glide: 5, turn: 0, fade: 1 },
];

type HoleSpec = {
  par: number;
  ft: number;
  disc?: DiscKey;
  throw?: ThrowType;
  shape?: string;
  aim?: string;
  revise?: boolean;
};

// Cedar Ridge — Blue tees. Mostly planned; holes 15 and 17 left blank to show
// that partial plans are fine; hole 12 flagged "to revise" from a past round.
const CEDAR_BLUE: HoleSpec[] = [
  { par: 3, ft: 312, disc: 'tbird', throw: 'Backhand', shape: 'Hyzer', aim: 'Start at the lone oak, let it fade to the pin. Short is fine — OB long.' },
  { par: 3, ft: 268, disc: 'leopard', throw: 'Backhand', shape: 'Turnover', aim: 'Gap right of the big maple, let it turn into the bowl.' },
  { par: 4, ft: 545, disc: 'destroyer', throw: 'Backhand', shape: 'Flat', aim: 'Middle of the fairway. Landing zone is the mowed strip past the bench.' },
  { par: 3, ft: 290, disc: 'firebird', throw: 'Forehand', shape: 'Flex', aim: 'Out over the creek, let it fight back left to the basket.' },
  { par: 3, ft: 215, disc: 'buzzz', throw: 'Backhand', shape: 'Flat', aim: 'Straight up the tunnel. Smooth, 70%.' },
  { par: 4, ft: 610, disc: 'zeus', throw: 'Backhand', shape: 'Hyzer', aim: 'Big hyzer over the first pine. Lay up — water guards the green.' },
  { par: 3, ft: 330, disc: 'teebird', throw: 'Backhand', shape: 'Anhyzer', aim: 'Low anny around the boulder. Stay under the canopy.' },
  { par: 3, ft: 245, disc: 'roc', throw: 'Backhand', shape: 'Spike hyzer', aim: 'Elevated pin. Spike it in — anything long rolls away.' },
  { par: 3, ft: 375, disc: 'wraith', throw: 'Backhand', shape: 'Hyzer', aim: 'Wide-open field. Let it rip, early fade is fine.' },
  { par: 3, ft: 198, disc: 'envy', throw: 'Backhand', shape: 'Flat', aim: 'Island green. Putter, dead straight, no heroics.' },
  { par: 4, ft: 490, disc: 'volt', throw: 'Forehand', shape: 'Hyzer', aim: 'Dogleg right. Forehand around the corner, stay off the left rough.' },
  { par: 3, ft: 285, disc: 'mako', throw: 'Backhand', shape: 'Flat', aim: 'Narrow gap at 150 ft. Hit the gap, the rest is easy.', revise: true },
  { par: 3, ft: 260, disc: 'zone', throw: 'Backhand', shape: 'Hyzer', aim: 'Downhill into the wind. Overstable, low and controlled.' },
  { par: 3, ft: 340, throw: 'Overhand', shape: 'Thumber', aim: 'Blocked by the cedar wall. Thumber over the top, aim at the gap.' },
  { par: 3, ft: 230 },
  { par: 4, ft: 520, disc: 'destroyer', throw: 'Backhand', shape: 'Anhyzer', aim: 'Anny the whole fairway; it flattens out at the gravel path.' },
  { par: 3, ft: 300 },
  { par: 3, ft: 255, disc: 'luna', throw: 'Backhand', shape: 'Hyzer', aim: 'Finishing hole, crowd behind. Hyzer putter, keep it below the basket.' },
];

async function seedLayout(
  courseId: number,
  name: string,
  spec: HoleSpec[],
  discIds: Record<DiscKey, number>
): Promise<number> {
  const layoutId = await createLayoutWithHoles({ courseId, name, holeCount: spec.length });
  const holes = await listHoles(layoutId);
  for (const [i, h] of spec.entries()) {
    const hole = holes[i];
    await updateHole({ id: hole.id, par: h.par, distance_ft: h.ft });
    if (h.disc || h.throw || h.shape || h.aim) {
      await saveHolePlan(layoutId, hole.id, {
        disc_id: h.disc ? discIds[h.disc] : null,
        throw_type: h.throw ?? null,
        shot_shape: h.shape ?? null,
        aim_note: h.aim ?? null,
      });
      if (h.revise) await setHolePlanReview(hole.id, true);
    }
  }
  return layoutId;
}

export async function seedDemo(): Promise<void> {
  await resetDb();
  await getDb();

  const discIds = {} as Record<DiscKey, number>;
  for (const [key, disc] of Object.entries(BAG) as [DiscKey, NewDiscInput][]) {
    discIds[key] = await createDisc({ ...disc, in_bag: true });
  }
  for (const disc of SHELVED) await createDisc({ ...disc, in_bag: false });
  await setBagColor('#2a9d8f');

  const cedar = await createCourse({ name: 'Cedar Ridge', location: 'Hillsborough, NC' });
  const blue = await seedLayout(cedar, 'Blue tees', CEDAR_BLUE, discIds);
  // A shorter layout of the same course, lightly planned.
  await seedLayout(
    cedar,
    'Red tees',
    CEDAR_BLUE.map((h, i) =>
      i < 4
        ? { ...h, ft: Math.round(h.ft * 0.75), disc: h.disc === 'destroyer' ? 'tbird' : h.disc }
        : { par: h.par, ft: Math.round(h.ft * 0.75) }
    ),
    discIds
  );

  const lakeside = await createCourse({ name: 'Lakeside Park', location: 'Durham, NC' });
  await seedLayout(
    lakeside,
    'Main',
    Array.from({ length: 18 }, (_, i) => ({ par: i % 6 === 2 ? 4 : 3, ft: 220 + ((i * 37) % 180) })),
    discIds
  );

  // A round in progress on the Blue tees, so Home shows "Resume round".
  await setPlayHoleNumber(blue, 4);
}
