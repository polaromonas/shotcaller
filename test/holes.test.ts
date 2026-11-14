import { resetDb, getDb } from '../src/db';
import {
  addHole,
  createCourse,
  createLayoutWithHoles,
  listHoles,
  MAX_HOLES,
  removeLastHole,
} from '../src/db/courses';
import { getHolePlan, saveHolePlan } from '../src/db/plans';
import { getPlayHoleNumber, setPlayHoleNumber } from '../src/db/play';

async function layout(holeCount: number) {
  const courseId = await createCourse({ name: 'Maple Hill', location: 'MA' });
  return createLayoutWithHoles({ courseId, name: 'Long', holeCount });
}

beforeEach(async () => {
  await resetDb();
  await getDb();
});

test('addHole appends the next number with defaults', async () => {
  const id = await layout(3);
  const hole = await addHole(id);
  expect(hole).toMatchObject({ hole_number: 4, par: 3, distance_ft: 0 });
  expect((await listHoles(id)).map((h) => h.hole_number)).toEqual([1, 2, 3, 4]);
});

test('addHole stops at MAX_HOLES', async () => {
  const id = await layout(MAX_HOLES);
  expect(await addHole(id)).toBeNull();
  expect(await listHoles(id)).toHaveLength(MAX_HOLES);
});

test('removeLastHole drops the last hole and its plan', async () => {
  const id = await layout(3);
  const last = (await listHoles(id))[2];
  await saveHolePlan(id, last.id, {
    disc_id: null,
    throw_type: null,
    shot_shape: null,
    aim_note: 'left gap',
  });
  expect(await removeLastHole(id)).toBe(true);
  expect((await listHoles(id)).map((h) => h.hole_number)).toEqual([1, 2]);
  expect(await getHolePlan(last.id)).toBeNull();
});

test('removeLastHole keeps at least one hole', async () => {
  const id = await layout(1);
  expect(await removeLastHole(id)).toBe(false);
  expect(await listHoles(id)).toHaveLength(1);
});

test('removing the hole a round is on moves the round back', async () => {
  const id = await layout(3);
  await setPlayHoleNumber(id, 3);
  await removeLastHole(id);
  expect(await getPlayHoleNumber(id)).toBe(2);
  await setPlayHoleNumber(id, 1);
  await removeLastHole(id);
  expect(await getPlayHoleNumber(id)).toBe(1);
});
