import { getDb, resetDb } from '../src/db';
import {
  createCourse,
  createLayoutWithHoles,
  getLayoutHeading,
  getLayoutImpact,
  deleteLayout,
} from '../src/db/courses';
import { createDisc, deleteDisc } from '../src/db/discs';
import {
  countPlannedHoles,
  countPlansUsingDisc,
  getHolePlan,
  listHolePlans,
  planSummary,
  saveHolePlan,
} from '../src/db/plans';

type HoleRow = { id: number; hole_number: number };

async function holesFor(layoutId: number): Promise<HoleRow[]> {
  const db = await getDb();
  return db.getAllAsync<HoleRow>(
    'SELECT id, hole_number FROM hole WHERE layout_id = $id ORDER BY hole_number',
    { $id: layoutId }
  );
}

async function makeLayout(holeCount = 3): Promise<{ layoutId: number; holes: HoleRow[] }> {
  const courseId = await createCourse({ name: 'Maple Hill', location: 'MA' });
  const layoutId = await createLayoutWithHoles({ courseId, name: 'Long', holeCount });
  return { layoutId, holes: await holesFor(layoutId) };
}

async function makeDisc(model = 'Firebird'): Promise<number> {
  return createDisc({
    manufacturer: 'Innova',
    model,
    plastic: 'Star',
    nickname: null,
    category: 'FWD',
    color: '#e63946',
    speed: 9,
    glide: 3,
    turn: 0,
    fade: 4,
    tagIds: [],
  });
}

beforeEach(async () => {
  await resetDb();
  await getDb();
});

test('saves and reads back a hole plan', async () => {
  const { layoutId, holes } = await makeLayout();
  const discId = await makeDisc();

  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: discId,
    throw_type: 'Forehand',
    shot_shape: 'Flex',
    aim_note: '  Right edge of the gap  ',
  });

  const plan = await getHolePlan(holes[0].id);
  expect(plan).not.toBeNull();
  expect(plan).toMatchObject({
    layout_id: layoutId,
    hole_id: holes[0].id,
    disc_id: discId,
    throw_type: 'Forehand',
    shot_shape: 'Flex',
    aim_note: 'Right edge of the gap', // trimmed
  });
  expect(plan?.updated_at).toBeTruthy();
});

test('upsert updates in place — one row per hole, no duplicate', async () => {
  const { layoutId, holes } = await makeLayout();

  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: null,
    throw_type: 'Backhand',
    shot_shape: 'Hyzer',
    aim_note: null,
  });
  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: null,
    throw_type: 'Backhand',
    shot_shape: 'Anhyzer',
    aim_note: 'flip it',
  });

  const all = await listHolePlans(layoutId);
  expect(all).toHaveLength(1);
  expect(all[0].shot_shape).toBe('Anhyzer');
  expect(all[0].aim_note).toBe('flip it');
});

test('a partial (aim-note-only) plan still counts as planned', async () => {
  const { layoutId, holes } = await makeLayout();
  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: null,
    throw_type: null,
    shot_shape: null,
    aim_note: 'just send it',
  });
  expect(await countPlannedHoles(layoutId)).toBe(1);
});

test('clearing every field un-plans the hole (row removed)', async () => {
  const { layoutId, holes } = await makeLayout();
  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: null,
    throw_type: 'Backhand',
    shot_shape: 'Hyzer',
    aim_note: null,
  });
  expect(await countPlannedHoles(layoutId)).toBe(1);

  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: null,
    throw_type: null,
    shot_shape: null,
    aim_note: '   ', // whitespace-only → empty
  });
  expect(await countPlannedHoles(layoutId)).toBe(0);
  expect(await getHolePlan(holes[0].id)).toBeNull();
});

test('deleting a disc clears it from plans but keeps the rest of the plan', async () => {
  const { layoutId, holes } = await makeLayout();
  const discId = await makeDisc();
  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: discId,
    throw_type: 'Forehand',
    shot_shape: 'Flex',
    aim_note: 'anhyzer over the water',
  });

  expect(await countPlansUsingDisc(discId)).toBe(1);

  await deleteDisc(discId);

  expect(await countPlansUsingDisc(discId)).toBe(0);
  const plan = await getHolePlan(holes[0].id);
  expect(plan).not.toBeNull(); // plan survives
  expect(plan?.disc_id).toBeNull(); // disc cleared (ON DELETE SET NULL)
  expect(plan?.shot_shape).toBe('Flex'); // rest intact
  expect(await countPlannedHoles(layoutId)).toBe(1);
});

test('deleting a layout cascades its hole plans, and impact reports them', async () => {
  const { layoutId, holes } = await makeLayout();
  await saveHolePlan(layoutId, holes[0].id, {
    disc_id: null,
    throw_type: 'Backhand',
    shot_shape: 'Hyzer',
    aim_note: null,
  });
  await saveHolePlan(layoutId, holes[1].id, {
    disc_id: null,
    throw_type: 'Forehand',
    shot_shape: 'Flat',
    aim_note: null,
  });

  const impact = await getLayoutImpact(layoutId);
  expect(impact.holes).toBe(3);
  expect(impact.plannedHoles).toBe(2);

  await deleteLayout(layoutId);
  expect(await listHolePlans(layoutId)).toHaveLength(0);
});

test('planSummary composes disc + throw/shape, with sensible fallbacks', () => {
  expect(planSummary({ throw_type: 'Backhand', shot_shape: 'Hyzer', aim_note: null }, 'Zone'))
    .toBe('Zone · BH Hyzer');
  expect(planSummary({ throw_type: 'Overhand', shot_shape: null, aim_note: null }, 'Destroyer'))
    .toBe('Destroyer · OH');
  expect(planSummary({ throw_type: null, shot_shape: 'Flex', aim_note: null }, null))
    .toBe('Flex');
  expect(planSummary({ throw_type: null, shot_shape: null, aim_note: '  send it  ' }, null))
    .toBe('send it');
  expect(planSummary({ throw_type: null, shot_shape: null, aim_note: null }, null))
    .toBe('Planned');
});

test('getLayoutHeading returns the layout and course names', async () => {
  const courseId = await createCourse({ name: 'Maple Hill', location: 'MA' });
  const layoutId = await createLayoutWithHoles({ courseId, name: 'Long', holeCount: 3 });
  expect(await getLayoutHeading(layoutId)).toEqual({
    layoutName: 'Long',
    courseName: 'Maple Hill',
  });
  expect(await getLayoutHeading(99999)).toBeNull();
});

test('rejects an invalid enum via the CHECK constraint', async () => {
  const { layoutId, holes } = await makeLayout();
  const db = await getDb();
  await expect(
    db.runAsync(
      `INSERT INTO hole_plan (layout_id, hole_id, throw_type, updated_at)
       VALUES ($l, $h, 'Sidearm', '2026-01-01')`,
      { $l: layoutId, $h: holes[0].id }
    )
  ).rejects.toThrow();
});
