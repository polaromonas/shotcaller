import * as SQLite from 'expo-sqlite';
import { DISC_WEIGHT_CHECK, SCHEMA_SQL } from './schema';
import { DEFAULT_TAGS } from './types';

// The "v2b" in the name is historical. Do NOT rename it: players already have
// data in this file, and a new name would silently start them on an empty DB.
// Evolve the schema through the additive steps in migrate() below.
const DB_NAME = 'shotcaller-v2b.db';

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

// Additive, data-preserving migrations (ADD COLUMN is safe in SQLite). Runs
// before SCHEMA_SQL. Guard each with a column/table check so it's idempotent.
export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const settingsCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('app_settings')"
  );
  if (settingsCols.length > 0 && !settingsCols.some((c) => c.name === 'bag_color')) {
    await db.execAsync('ALTER TABLE app_settings ADD COLUMN bag_color TEXT');
  }

  const discCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info('disc')");
  if (discCols.length > 0 && !discCols.some((c) => c.name === 'weight_g')) {
    await db.execAsync(
      `ALTER TABLE disc ADD COLUMN weight_g INTEGER CHECK (${DISC_WEIGHT_CHECK})`
    );
  }

  const holePlanCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('hole_plan')"
  );
  if (holePlanCols.length > 0 && !holePlanCols.some((c) => c.name === 'needs_review')) {
    await db.execAsync(
      'ALTER TABLE hole_plan ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0'
    );
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
