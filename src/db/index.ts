import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { DEFAULT_TAGS } from './types';

// Filename is bumped on schema changes pre-release (no migration framework yet).
// v2b: shot_shape is no longer a fixed enum — the `shape` table makes it
// user-extensible, so hole_plan.shot_shape dropped its CHECK constraint.
const DB_NAME = 'shotcaller-v2b.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(SCHEMA_SQL);
      await seedDefaultTags(db);
      return db;
    });
  }
  return dbPromise;
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
