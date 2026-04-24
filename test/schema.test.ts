import { getDb, resetDb } from '../src/db';
import { __resetAllDatabases } from './mocks/expo-sqlite';

afterEach(async () => {
  await resetDb();
  __resetAllDatabases();
});

describe('SCHEMA_SQL', () => {
  test('diagnostics: CHECK constraint behavior', async () => {
    const SQLite = await import('expo-sqlite');
    const shim = await SQLite.openDatabaseAsync('diagnostic.db');
    // Direct better-sqlite3 access, bypass shim plumbing.
    const raw = (shim as unknown as { raw: import('better-sqlite3').Database }).raw;
    raw.exec("CREATE TABLE t (c TEXT NOT NULL CHECK (c IN ('A','B')))");

    // Path 1: raw better-sqlite3 prepare+run.
    let rawThrew = false;
    let rawErr = '';
    try {
      raw.prepare("INSERT INTO t VALUES ('NOPE')").run();
    } catch (e) {
      rawThrew = true;
      rawErr = e instanceof Error ? e.message : String(e);
    }

    // Path 2: shim's runAsync (what the failing tests use).
    let shimThrew = false;
    let shimErr = '';
    try {
      await shim.runAsync("INSERT INTO t VALUES ('NOPE')");
    } catch (e) {
      shimThrew = true;
      shimErr = e instanceof Error ? e.message : String(e);
    }

    // Verify what's actually in t.
    const rows = raw.prepare('SELECT * FROM t').all();

    // eslint-disable-next-line no-console
    console.log('[diag] sqlite_version:', raw.prepare('SELECT sqlite_version() AS v').get());
    // eslint-disable-next-line no-console
    console.log('[diag] raw threw:', rawThrew, 'err:', rawErr);
    // eslint-disable-next-line no-console
    console.log('[diag] shim threw:', shimThrew, 'err:', shimErr);
    // eslint-disable-next-line no-console
    console.log('[diag] rows after attempted inserts:', rows);
  });

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
    await expect(
      db.runAsync(
        "INSERT INTO disc (manufacturer, model, color, category) VALUES ('x', 'y', '#000', 'NOPE')"
      )
    ).rejects.toThrow();
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
    await expect(
      db.runAsync(
        `INSERT INTO throw (session_id, hole_id, disc_id, throw_type, shot_shape, result)
         VALUES (1, 1, 1, 'Backhand', 'Flat', 'Nowhere')`
      )
    ).rejects.toThrow();
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
    await expect(
      db.runAsync(
        "INSERT INTO practice_session (layout_id, session_date, mode) VALUES (1, '2026-04-24', 'Casual')"
      )
    ).rejects.toThrow();
  });
});
