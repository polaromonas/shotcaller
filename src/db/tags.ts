import { getDb } from './index';

export type Tag = { id: number; name: string };

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.getAllAsync<Tag>('SELECT id, name FROM tag ORDER BY name ASC');
}

export async function createTag(name: string): Promise<Tag> {
  const db = await getDb();
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Tag name cannot be empty');
  }
  await db.runAsync('INSERT OR IGNORE INTO tag (name) VALUES ($name)', {
    $name: trimmed,
  });
  const row = await db.getFirstAsync<Tag>(
    'SELECT id, name FROM tag WHERE name = $name',
    { $name: trimmed }
  );
  if (!row) throw new Error(`Failed to create or find tag: ${trimmed}`);
  return row;
}
