import { resetDb, getDb, migrate } from '../src/db';
import { SCHEMA_SQL } from '../src/db/schema';
import {
  createBag,
  deleteBag,
  ensureBags,
  getActiveBag,
  getActiveBagId,
  listBags,
  setActiveBag,
  setDiscInBag,
  shelveDisc,
  updateBag,
} from '../src/db/bags';
import { createDisc, deleteDisc, isShelved, listDiscs, setInBag } from '../src/db/discs';

beforeEach(async () => {
  await resetDb();
  await getDb();
});

const disc = (model: string, in_bag = true) =>
  createDisc({ manufacturer: 'Innova', model, color: '#ffdd00', category: 'FWD', in_bag });

const byModel = async (model: string) =>
  (await listDiscs()).find((d) => d.model === model)!;

test('a fresh install starts with one active bag, "My Bag"', async () => {
  const bags = await listBags();
  expect(bags).toHaveLength(1);
  expect(bags[0]).toMatchObject({ name: 'My Bag', color: null, disc_count: 0 });
  expect(await getActiveBagId()).toBe(bags[0].id);
});

test('upgrading from the single-bag app keeps the bag, its color and its discs', async () => {
  const db = await getDb();
  // Rebuild the pre-bags state: no bag tables, discs flagged with in_bag.
  await db.execAsync(`
    DROP TABLE bag_disc;
    DROP TABLE bag;
    UPDATE app_settings SET bag_color = '#2a9d8f', active_bag_id = NULL WHERE id = 1;
    INSERT INTO disc (manufacturer, model, color, category, in_bag) VALUES
      ('Innova', 'Firebird', '#f00', 'FWD', 1),
      ('Innova', 'Teebird',  '#0f0', 'FWD', 0);
  `);
  await migrate(db);
  await db.execAsync(SCHEMA_SQL);
  await ensureBags(db);
  await ensureBags(db); // idempotent: never creates a second "My Bag"

  const bags = await listBags();
  expect(bags).toHaveLength(1);
  expect(bags[0]).toMatchObject({ name: 'My Bag', color: '#2a9d8f', disc_count: 1 });
  expect((await getActiveBag()).id).toBe(bags[0].id);
  expect((await byModel('Firebird')).in_bag).toBe(true);
  expect(isShelved(await byModel('Teebird'))).toBe(true);
});

test('a disc can be in several bags; in_bag follows the active bag', async () => {
  const main = await getActiveBagId();
  const glow = await createBag({ name: 'Glow bag', color: null });
  const fb = await disc('Firebird'); // goes in the active bag (main)
  await setDiscInBag(glow, fb, true);

  expect((await byModel('Firebird')).bag_ids.sort()).toEqual([main, glow].sort());
  await setActiveBag(glow);
  expect((await byModel('Firebird')).in_bag).toBe(true);

  await setInBag(fb, false); // removes from the active (glow) bag only
  expect((await byModel('Firebird')).bag_ids).toEqual([main]);
  expect((await byModel('Firebird')).in_bag).toBe(false);
});

test('a new disc added with in_bag off is shelved', async () => {
  await disc('Teebird', false);
  const d = await byModel('Teebird');
  expect(d.in_bag).toBe(false);
  expect(isShelved(d)).toBe(true);
});

test('shelving takes a disc out of every bag but keeps it', async () => {
  const glow = await createBag({ name: 'Glow bag', color: null });
  const fb = await disc('Firebird');
  await setDiscInBag(glow, fb, true);
  await shelveDisc(fb);
  expect(isShelved(await byModel('Firebird'))).toBe(true);
  expect((await listBags()).every((b) => b.disc_count === 0)).toBe(true);
});

test('deleting a bag keeps its discs, and the last bag cannot be deleted', async () => {
  const main = await getActiveBagId();
  const glow = await createBag({ name: 'Glow bag', color: null });
  const fb = await disc('Firebird');
  await setDiscInBag(glow, fb, true);
  await setActiveBag(glow);

  expect(await deleteBag(glow)).toBe(true);
  expect(await getActiveBagId()).toBe(main); // active falls back to a real bag
  expect((await byModel('Firebird')).bag_ids).toEqual([main]);

  expect(await deleteBag(main)).toBe(false);
  expect(await listBags()).toHaveLength(1);
});

test('deleting a disc removes it from its bags', async () => {
  const fb = await disc('Firebird');
  await deleteDisc(fb);
  expect((await listBags())[0].disc_count).toBe(0);
});

test('bags can be renamed and recolored, and need a name', async () => {
  const id = await getActiveBagId();
  await updateBag(id, { name: '  Winter bag ', color: '#2D8CC9' });
  expect((await listBags())[0]).toMatchObject({ name: 'Winter bag', color: '#2D8CC9' });
  await expect(createBag({ name: '   ', color: null })).rejects.toThrow();
});
