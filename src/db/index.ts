import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { DEFAULT_TAGS } from './types';

const DB_NAME = 'shotcaller.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      await db.execAsync(SCHEMA_SQL);
      await seedDefaultTags(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  // game_plan_shot moved from session_id to layout_id (see CLAUDE.md).
  // If a pre-migration table exists with session_id, drop it so the fresh
  // CREATE TABLE IF NOT EXISTS in SCHEMA_SQL builds the new shape.
  const cols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('game_plan_shot')"
  );
  if (cols.some((c) => c.name === 'session_id')) {
    await db.execAsync('DROP TABLE game_plan_shot');
  }
}

async function seedDefaultTags(db: SQLite.SQLiteDatabase): Promise<void> {
  const statement = await db.prepareAsync(
    'INSERT OR IGNORE INTO tag (name) VALUES ($name)'
  );
  try {
    for (const name of DEFAULT_TAGS) {
      await statement.executeAsync({ $name: name });
    }
  } finally {
    await statement.finalizeAsync();
  }
}

export async function resetDb(): Promise<void> {
  dbPromise = null;
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
