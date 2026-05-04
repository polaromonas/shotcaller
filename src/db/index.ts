import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import {
  DEFAULT_SHOT_TAGS,
  DEFAULT_TAGS,
  LEGACY_SHOT_TAG_NAMES,
} from './types';

const DB_NAME = 'shotcaller.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      await db.execAsync(SCHEMA_SQL);
      await seedDefaultTags(db);
      await seedDefaultShotTags(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  // game_plan_shot moved from session_id to layout_id (see CLAUDE.md).
  // If a pre-migration table exists with session_id, drop it so the fresh
  // CREATE TABLE IF NOT EXISTS in SCHEMA_SQL builds the new shape.
  const planCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('game_plan_shot')"
  );
  if (planCols.some((c) => c.name === 'session_id')) {
    await db.execAsync('DROP TABLE game_plan_shot');
  }

  // practice_session.mode added when Tournament round shipped. ALTER TABLE
  // here so existing rows keep their throws and pick up the default 'Practice'.
  const sessionCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('practice_session')"
  );
  if (sessionCols.length > 0 && !sessionCols.some((c) => c.name === 'mode')) {
    await db.execAsync(
      "ALTER TABLE practice_session ADD COLUMN mode TEXT NOT NULL DEFAULT 'Practice'"
    );
  }

  // disc.plastic and disc.nickname added so users can label specific plastic
  // blends and personal nicknames ("My Roller") per disc. Free-text, nullable.
  const discCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('disc')"
  );
  if (discCols.length > 0 && !discCols.some((c) => c.name === 'plastic')) {
    await db.execAsync('ALTER TABLE disc ADD COLUMN plastic TEXT');
  }
  if (discCols.length > 0 && !discCols.some((c) => c.name === 'nickname')) {
    await db.execAsync('ALTER TABLE disc ADD COLUMN nickname TEXT');
  }

  // practice_session.completed_at lets us distinguish in-progress rounds from
  // finished ones. NULL = ongoing.
  const sessionCols2 = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('practice_session')"
  );
  if (
    sessionCols2.length > 0 &&
    !sessionCols2.some((c) => c.name === 'completed_at')
  ) {
    await db.execAsync(
      'ALTER TABLE practice_session ADD COLUMN completed_at TEXT'
    );
  }

  // Prune legacy shot-tag defaults if the table exists and the rows aren't
  // referenced by any throw_tag (so user-actually-used tags with the same
  // name survive). Idempotent and cheap.
  const shotTagTable = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('shot_tag')"
  );
  if (shotTagTable.length > 0) {
    const placeholders = LEGACY_SHOT_TAG_NAMES.map(() => '?').join(', ');
    await db.runAsync(
      `DELETE FROM shot_tag
        WHERE name IN (${placeholders})
          AND id NOT IN (SELECT shot_tag_id FROM throw_tag)`,
      [...LEGACY_SHOT_TAG_NAMES]
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

async function seedDefaultShotTags(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  const statement = await db.prepareAsync(
    'INSERT OR IGNORE INTO shot_tag (name) VALUES ($name)'
  );
  try {
    for (const name of DEFAULT_SHOT_TAGS) {
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
