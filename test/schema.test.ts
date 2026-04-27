import { getDb, resetDb } from '../src/db';
import { __resetAllDatabases } from './mocks/expo-sqlite';

afterEach(async () => {
  await resetDb();
  __resetAllDatabases();
});

// jest 30's expect(promise).rejects.toThrow() silently misses the rejection on
// some platforms (reproduced consistently on the Linux CI runner, passes on
// macOS). Use this explicit try/catch instead until upstream is sorted.
async function expectRejection(
  promise: Promise<unknown>,
  contains?: string
): Promise<void> {
  let err: Error | null = null;
  try {
    await promise;
  } catch (e) {
    err = e instanceof Error ? e : new Error(String(e));
  }
  if (err === null) {
    throw new Error('Expected promise to reject, but it resolved');
  }
  if (contains !== undefined && !err.message.includes(contains)) {
    throw new Error(
      `Expected rejection to include "${contains}", got: ${err.message}`
    );
  }
}

describe('SCHEMA_SQL', () => {
  test('loads cleanly on a fresh DB', async () => {
    const db = await getDb();
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    );
    const names = tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'course',
        'disc',
        'disc_tag',
        'game_plan_shot',
        'hole',
        'layout',
        'practice_session',
        'tag',
        'throw',
      ])
    );
  });

  test('seeds the 8 default tags', async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM tag'
    );
    expect(row?.count).toBe(8);
  });

  test('disc.category CHECK rejects a bogus enum', async () => {
    const db = await getDb();
    await expectRejection(
      db.runAsync(
        "INSERT INTO disc (manufacturer, model, color, category) VALUES ('x', 'y', '#000', 'NOPE')"
      ),
      'CHECK constraint failed'
    );
  });

  test('throw.result CHECK rejects a bogus enum', async () => {
    const db = await getDb();
    await db.runAsync(
      "INSERT INTO course (name, location) VALUES ('C', 'L')"
    );
    await db.runAsync(
      "INSERT INTO layout (course_id, name) VALUES (1, 'Main')"
    );
    await db.runAsync(
      'INSERT INTO hole (layout_id, hole_number, par, distance_ft) VALUES (1, 1, 3, 300)'
    );
    await db.runAsync(
      "INSERT INTO disc (manufacturer, model, color, category) VALUES ('Innova', 'Destroyer', '#e63946', 'DD')"
    );
    await db.runAsync(
      "INSERT INTO practice_session (layout_id, session_date, mode) VALUES (1, '2026-04-24', 'Practice')"
    );
    await expectRejection(
      db.runAsync(
        `INSERT INTO throw (session_id, hole_id, disc_id, throw_type, shot_shape, result)
         VALUES (1, 1, 1, 'Backhand', 'Flat', 'Nowhere')`
      ),
      'CHECK constraint failed'
    );
  });

  test('migration drops a pre-session_id game_plan_shot table', async () => {
    const SQLite = await import('expo-sqlite');
    const raw = await SQLite.openDatabaseAsync('shotcaller.db');
    await raw.execAsync(`
      CREATE TABLE game_plan_shot (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        hole_id INTEGER NOT NULL,
        disc_id INTEGER NOT NULL,
        throw_type TEXT NOT NULL,
        shot_shape TEXT NOT NULL,
        notes TEXT,
        is_manual_override INTEGER NOT NULL DEFAULT 0
      );
    `);

    await getDb();

    const cols = await raw.getAllAsync<{ name: string }>(
      "PRAGMA table_info('game_plan_shot')"
    );
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain('layout_id');
    expect(colNames).not.toContain('session_id');
  });

  test('migration adds disc.plastic to a pre-plastic table', async () => {
    const SQLite = await import('expo-sqlite');
    const raw = await SQLite.openDatabaseAsync('shotcaller.db');
    await raw.execAsync(`
      CREATE TABLE disc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT NOT NULL,
        model TEXT NOT NULL,
        color TEXT NOT NULL,
        category TEXT NOT NULL,
        in_bag INTEGER NOT NULL DEFAULT 0,
        speed REAL,
        glide REAL,
        turn REAL,
        fade REAL
      );
      INSERT INTO disc (manufacturer, model, color, category)
      VALUES ('Innova', 'Destroyer', '#e63946', 'DD');
    `);

    await getDb();

    const cols = await raw.getAllAsync<{ name: string }>(
      "PRAGMA table_info('disc')"
    );
    expect(cols.map((c) => c.name)).toContain('plastic');
    const row = await raw.getFirstAsync<{ model: string; plastic: string | null }>(
      'SELECT model, plastic FROM disc WHERE id = 1'
    );
    expect(row?.model).toBe('Destroyer');
    expect(row?.plastic).toBeNull();
  });

  test('migration adds practice_session.mode to a pre-mode table', async () => {
    const SQLite = await import('expo-sqlite');
    const raw = await SQLite.openDatabaseAsync('shotcaller.db');
    await raw.execAsync(`
      CREATE TABLE practice_session (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        layout_id INTEGER NOT NULL,
        session_date TEXT NOT NULL,
        notes TEXT
      );
      INSERT INTO practice_session (layout_id, session_date, notes)
      VALUES (1, '2026-04-20', 'before mode existed');
    `);

    await getDb();

    const cols = await raw.getAllAsync<{ name: string }>(
      "PRAGMA table_info('practice_session')"
    );
    expect(cols.map((c) => c.name)).toContain('mode');
    const row = await raw.getFirstAsync<{ mode: string; notes: string }>(
      'SELECT mode, notes FROM practice_session WHERE id = 1'
    );
    expect(row?.mode).toBe('Practice');
    expect(row?.notes).toBe('before mode existed');
  });

  test('practice_session.mode CHECK rejects a bogus value', async () => {
    const db = await getDb();
    await db.runAsync(
      "INSERT INTO course (name, location) VALUES ('C', 'L')"
    );
    await db.runAsync(
      "INSERT INTO layout (course_id, name) VALUES (1, 'Main')"
    );
    await expectRejection(
      db.runAsync(
        "INSERT INTO practice_session (layout_id, session_date, mode) VALUES (1, '2026-04-24', 'Casual')"
      ),
      'CHECK constraint failed'
    );
  });
});
