import { resetDb, getDb, migrate } from '../src/db';
import { SCHEMA_SQL } from '../src/db/schema';
import { createDisc, listDiscs, updateDisc } from '../src/db/discs';

beforeEach(async () => {
  await resetDb();
  await getDb();
});

const base = {
  manufacturer: 'Innova',
  model: 'Firebird',
  color: '#ffdd00',
  category: 'FWD' as const,
};

test('weight is optional and defaults to null', async () => {
  await createDisc(base);
  const [disc] = await listDiscs();
  expect(disc.weight_g).toBeNull();
});

test('weight saves on create and changes on update', async () => {
  const id = await createDisc({ ...base, weight_g: 175 });
  expect((await listDiscs())[0].weight_g).toBe(175);

  await updateDisc(id, { ...base, weight_g: 172 });
  expect((await listDiscs())[0].weight_g).toBe(172);

  await updateDisc(id, { ...base, weight_g: null });
  expect((await listDiscs())[0].weight_g).toBeNull();
});

test('the database rejects an impossible weight', async () => {
  await expect(createDisc({ ...base, weight_g: 0 })).rejects.toThrow();
  await expect(createDisc({ ...base, weight_g: 999 })).rejects.toThrow();
});

test('migration adds weight_g to a disc table created before it existed', async () => {
  const db = await getDb();
  // Rebuild `disc` the way an older install had it (no weight_g), with a row.
  await db.execAsync(`
    DROP TABLE disc_tag;
    DROP TABLE disc;
    CREATE TABLE disc (
      id INTEGER PRIMARY KEY AUTOINCREMENT, manufacturer TEXT NOT NULL,
      model TEXT NOT NULL, color TEXT NOT NULL, category TEXT NOT NULL,
      in_bag INTEGER NOT NULL DEFAULT 0, speed REAL, glide REAL, turn REAL,
      fade REAL, plastic TEXT, nickname TEXT
    );
    INSERT INTO disc (manufacturer, model, color, category) VALUES ('Innova', 'Teebird', '#6ab04c', 'FWD');
  `);
  await migrate(db);
  await migrate(db); // idempotent: a second run is a no-op
  await db.execAsync(SCHEMA_SQL); // recreates disc_tag, as getDb() would

  const discs = await listDiscs();
  expect(discs.map((d) => d.model)).toEqual(['Teebird']);
  expect(discs[0].weight_g).toBeNull();
  await createDisc({ ...base, weight_g: 170 });
  expect((await listDiscs()).find((d) => d.model === 'Firebird')?.weight_g).toBe(170);
  await expect(createDisc({ ...base, weight_g: 999 })).rejects.toThrow();
});
