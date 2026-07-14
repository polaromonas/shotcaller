import { resetDb, getDb } from '../src/db';
import { createCourse, createLayoutWithHoles, deleteLayout } from '../src/db/courses';
import { createDisc } from '../src/db/discs';
import { saveHolePlan } from '../src/db/plans';
import {
  clearPlayState,
  getPlayHoleNumber,
  listPlayableLayouts,
  loadPlayDeck,
  mostRecentlyPlayed,
  setPlayHoleNumber,
} from '../src/db/play';

type HoleRow = { id: number; hole_number: number };

async function setup() {
  const courseId = await createCourse({ name: 'Maple Hill', location: 'MA' });
  const layoutId = await createLayoutWithHoles({ courseId, name: 'Long', holeCount: 3 });
  const db = await getDb();
  const holes = await db.getAllAsync<HoleRow>(
    'SELECT id, hole_number FROM hole WHERE layout_id = $id ORDER BY hole_number',
    { $id: layoutId }
  );
  return { layoutId, holes };
}

beforeEach(async () => {
  await resetDb();
  await getDb();
});

test('play position round-trips and defaults to null', async () => {
  const { layoutId } = await setup();
  expect(await getPlayHoleNumber(layoutId)).toBeNull();
  await setPlayHoleNumber(layoutId, 7);
  expect(await getPlayHoleNumber(layoutId)).toBe(7);
  await setPlayHoleNumber(layoutId, 12); // upsert
  expect(await getPlayHoleNumber(layoutId)).toBe(12);
  await clearPlayState(layoutId); // end the round
  expect(await getPlayHoleNumber(layoutId)).toBeNull();
});

test('loadPlayDeck resolves plan + disc per hole, leaving blanks null', async () => {
  const { layoutId, holes } = await setup();
  const discId = await createDisc({
    manufacturer: 'Innova',
    model: 'Firebird',
    plastic: 'Star',
    nickname: 'Zone',
    category: 'FWD',
    color: '#e63946',
    speed: 9, glide: 3, turn: 0, fade: 4,
    tagIds: [],
  });
  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: discId,
    throw_type: 'Forehand',
    shot_shape: 'Flex',
    aim_note: 'flex it back',
  });

  const deck = await loadPlayDeck(layoutId);
  expect(deck).toHaveLength(3);
  // hole 1: planned with disc
  expect(deck[0].plan?.shot_shape).toBe('Flex');
  expect(deck[0].disc?.nickname).toBe('Zone');
  expect(deck[0].disc?.plastic).toBe('Star');
  // holes 2 & 3: no plan
  expect(deck[1].plan).toBeNull();
  expect(deck[1].disc).toBeNull();
});

test('listPlayableLayouts reports coverage most-planned-first; mostRecentlyPlayed picks the latest', async () => {
  const courseId = await createCourse({ name: 'Maple Hill', location: 'MA' });
  const short = await createLayoutWithHoles({ courseId, name: 'Short', holeCount: 9 });
  const long = await createLayoutWithHoles({ courseId, name: 'Long', holeCount: 18 });

  const db = await getDb();
  const longHoles = await db.getAllAsync<HoleRow>(
    'SELECT id, hole_number FROM hole WHERE layout_id = $id ORDER BY hole_number',
    { $id: long }
  );
  // Plan two holes on Long, none on Short.
  await saveHolePlan(long, longHoles[0].id, { disc_id: null, throw_type: 'Backhand', shot_shape: 'Hyzer', aim_note: null });
  await saveHolePlan(long, longHoles[1].id, { disc_id: null, throw_type: 'Forehand', shot_shape: 'Flat', aim_note: null });

  const rows = await listPlayableLayouts();
  expect(rows.map((r) => r.layoutName)).toEqual(['Long', 'Short']); // most-planned first
  expect(rows[0]).toMatchObject({ plannedCount: 2, holeCount: 18, lastHole: null });
  expect(rows[1]).toMatchObject({ plannedCount: 0, holeCount: 9 });
  expect(mostRecentlyPlayed(rows)).toBeNull(); // never played

  await setPlayHoleNumber(short, 3);
  const played = mostRecentlyPlayed(await listPlayableLayouts());
  expect(played?.layoutName).toBe('Short');
  expect(played?.lastHole).toBe(3);
});

test('play_state is cleared when its layout is deleted (FK cascade)', async () => {
  const { layoutId } = await setup();
  await setPlayHoleNumber(layoutId, 5);
  await deleteLayout(layoutId);
  expect(await getPlayHoleNumber(layoutId)).toBeNull();
});
