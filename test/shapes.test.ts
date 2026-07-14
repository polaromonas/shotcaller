import { resetDb, getDb } from '../src/db';
import { listShapes, createShape, deleteShape } from '../src/db/shapes';
import { createCourse, createLayoutWithHoles } from '../src/db/courses';
import { saveHolePlan, getHolePlan } from '../src/db/plans';

beforeEach(async () => {
  await resetDb();
  await getDb();
});

test('seeds the 9 built-in shapes in order, with overhand flags', async () => {
  const shapes = await listShapes();
  expect(shapes.map((s) => s.name)).toEqual([
    'Hyzer', 'Flat', 'Anhyzer', 'Flex', 'Turnover', 'Roller', 'Spike hyzer', 'Thumber', 'Tomahawk',
  ]);
  expect(shapes.every((s) => s.is_builtin)).toBe(true);
  expect(shapes.find((s) => s.name === 'Thumber')?.is_overhand).toBe(true);
  expect(shapes.find((s) => s.name === 'Hyzer')?.is_overhand).toBe(false);
});

test('createShape adds a persistent user shape, deduped and trimmed', async () => {
  await createShape('  Hyzer flip  ');
  await createShape('Hyzer flip'); // duplicate ignored (UNIQUE)
  await createShape('   '); // blank ignored
  const custom = (await listShapes()).filter((s) => !s.is_builtin);
  expect(custom.map((s) => s.name)).toEqual(['Hyzer flip']);
});

test('deleteShape removes user shapes but protects built-ins', async () => {
  await createShape('Grenade');
  const before = await listShapes();
  await deleteShape(before.find((s) => s.name === 'Hyzer')!.id); // no-op
  await deleteShape(before.find((s) => s.name === 'Grenade')!.id);
  const after = await listShapes();
  expect(after.some((s) => s.name === 'Hyzer')).toBe(true);
  expect(after.some((s) => s.name === 'Grenade')).toBe(false);
});

test('a custom shape saves on a hole plan (no enum CHECK any more)', async () => {
  const courseId = await createCourse({ name: 'X', location: 'Y' });
  const layoutId = await createLayoutWithHoles({ courseId, name: 'L', holeCount: 1 });
  const db = await getDb();
  const hole = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM hole WHERE layout_id = $l',
    { $l: layoutId }
  );
  await createShape('S-curve');
  await saveHolePlan(layoutId, hole!.id, {
    disc_id: null,
    throw_type: 'Backhand',
    shot_shape: 'S-curve',
    aim_note: null,
  });
  expect((await getHolePlan(hole!.id))?.shot_shape).toBe('S-curve');
});
