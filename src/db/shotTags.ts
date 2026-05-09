import { getDb } from './index';

export type ShotTag = { id: number; name: string };

export async function listShotTags(): Promise<ShotTag[]> {
  const db = await getDb();
  return db.getAllAsync<ShotTag>(
    'SELECT id, name FROM shot_tag ORDER BY name ASC'
  );
}

export async function createShotTag(name: string): Promise<ShotTag> {
  const db = await getDb();
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Shot tag name cannot be empty');
  }
  await db.runAsync('INSERT OR IGNORE INTO shot_tag (name) VALUES ($name)', {
    $name: trimmed,
  });
  const row = await db.getFirstAsync<ShotTag>(
    'SELECT id, name FROM shot_tag WHERE name = $name',
    { $name: trimmed }
  );
  if (!row) throw new Error(`Failed to create or find shot tag: ${trimmed}`);
  return row;
}

export async function setThrowShotTags(
  throwId: number,
  shotTagIds: number[]
): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM throw_tag WHERE throw_id = $id', {
    $id: throwId,
  });
  if (shotTagIds.length === 0) return;
  const stmt = await db.prepareAsync(
    'INSERT INTO throw_tag (throw_id, shot_tag_id) VALUES ($throw_id, $shot_tag_id)'
  );
  try {
    for (const tagId of shotTagIds) {
      await stmt.executeAsync({ $throw_id: throwId, $shot_tag_id: tagId });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function setGamePlanShotTags(
  planId: number,
  shotTagIds: number[]
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM game_plan_shot_tag WHERE game_plan_shot_id = $id',
    { $id: planId }
  );
  if (shotTagIds.length === 0) return;
  const stmt = await db.prepareAsync(
    'INSERT INTO game_plan_shot_tag (game_plan_shot_id, shot_tag_id) VALUES ($plan_id, $tag_id)'
  );
  try {
    for (const tagId of shotTagIds) {
      await stmt.executeAsync({ $plan_id: planId, $tag_id: tagId });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function listShotTagsForGamePlanShots(
  planIds: number[]
): Promise<Map<number, ShotTag[]>> {
  const out = new Map<number, ShotTag[]>();
  if (planIds.length === 0) return out;
  const db = await getDb();
  const placeholders = planIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{
    plan_id: number;
    id: number;
    name: string;
  }>(
    `SELECT gpst.game_plan_shot_id AS plan_id, st.id, st.name
       FROM game_plan_shot_tag gpst
       JOIN shot_tag st ON st.id = gpst.shot_tag_id
      WHERE gpst.game_plan_shot_id IN (${placeholders})
      ORDER BY st.name ASC`,
    planIds
  );
  for (const r of rows) {
    const list = out.get(r.plan_id) ?? [];
    list.push({ id: r.id, name: r.name });
    out.set(r.plan_id, list);
  }
  return out;
}

// Bulk-fetch tags for a set of throws, keyed by throw_id. Avoids N queries
// when rendering history lists.
export async function listShotTagsForThrows(
  throwIds: number[]
): Promise<Map<number, ShotTag[]>> {
  const out = new Map<number, ShotTag[]>();
  if (throwIds.length === 0) return out;
  const db = await getDb();
  const placeholders = throwIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{
    throw_id: number;
    id: number;
    name: string;
  }>(
    `SELECT tt.throw_id, st.id, st.name
       FROM throw_tag tt
       JOIN shot_tag st ON st.id = tt.shot_tag_id
      WHERE tt.throw_id IN (${placeholders})
      ORDER BY st.name ASC`,
    throwIds
  );
  for (const r of rows) {
    const list = out.get(r.throw_id) ?? [];
    list.push({ id: r.id, name: r.name });
    out.set(r.throw_id, list);
  }
  return out;
}
