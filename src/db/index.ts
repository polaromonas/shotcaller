import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { DEFAULT_TAGS } from './types';

// Fresh filename for V2 — the V1 practice/stats/tournament tables are gone, so
// a new DB starts clean rather than carrying forward the old shape. There are
// no V1 users and no practice data worth migrating.
const DB_NAME = 'shotcaller-v2.db';

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
