import { getDb } from './index';
import type { DiscCategory } from './types';

export type Disc = {
  id: number;
  manufacturer: string;
  model: string;
  color: string;
  category: DiscCategory;
  in_bag: boolean;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  plastic: string | null;
};

export type DiscWithTags = Disc & { tags: { id: number; name: string }[] };

type DiscRow = Omit<Disc, 'in_bag'> & { in_bag: number };

const toDisc = (row: DiscRow): Disc => ({
  ...row,
  in_bag: row.in_bag === 1,
});

export type NewDiscInput = {
  manufacturer: string;
  model: string;
  color: string;
  category: DiscCategory;
  in_bag?: boolean;
  speed?: number | null;
  glide?: number | null;
  turn?: number | null;
  fade?: number | null;
  plastic?: string | null;
  tagIds?: number[];
};

export async function listDiscs(): Promise<DiscWithTags[]> {
  const db = await getDb();
  const discs = (
    await db.getAllAsync<DiscRow>(
      'SELECT * FROM disc ORDER BY in_bag DESC, manufacturer ASC, model ASC'
    )
  ).map(toDisc);

  if (discs.length === 0) return [];

  const joins = await db.getAllAsync<{
    disc_id: number;
    tag_id: number;
    tag_name: string;
  }>(
    `SELECT dt.disc_id, t.id AS tag_id, t.name AS tag_name
       FROM disc_tag dt
       JOIN tag t ON t.id = dt.tag_id
      ORDER BY t.name ASC`
  );

  const tagsByDisc = new Map<number, { id: number; name: string }[]>();
  for (const row of joins) {
    const list = tagsByDisc.get(row.disc_id) ?? [];
    list.push({ id: row.tag_id, name: row.tag_name });
    tagsByDisc.set(row.disc_id, list);
  }

  return discs.map((d) => ({ ...d, tags: tagsByDisc.get(d.id) ?? [] }));
}

export async function createDisc(input: NewDiscInput): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO disc (manufacturer, model, color, category, in_bag, speed, glide, turn, fade, plastic)
     VALUES ($manufacturer, $model, $color, $category, $in_bag, $speed, $glide, $turn, $fade, $plastic)`,
    {
      $manufacturer: input.manufacturer.trim(),
      $model: input.model.trim(),
      $color: input.color,
      $category: input.category,
      $in_bag: input.in_bag ? 1 : 0,
      $speed: input.speed ?? null,
      $glide: input.glide ?? null,
      $turn: input.turn ?? null,
      $fade: input.fade ?? null,
      $plastic: input.plastic?.trim() || null,
    }
  );

  const discId = result.lastInsertRowId;
  if (input.tagIds && input.tagIds.length > 0) {
    await setDiscTags(discId, input.tagIds);
  }
  return discId;
}

export async function setDiscTags(
  discId: number,
  tagIds: number[]
): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM disc_tag WHERE disc_id = $id', { $id: discId });
  if (tagIds.length === 0) return;
  const stmt = await db.prepareAsync(
    'INSERT INTO disc_tag (disc_id, tag_id) VALUES ($disc_id, $tag_id)'
  );
  try {
    for (const tagId of tagIds) {
      await stmt.executeAsync({ $disc_id: discId, $tag_id: tagId });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export type UpdateDiscInput = Omit<NewDiscInput, 'in_bag'>;

export async function updateDisc(
  discId: number,
  input: UpdateDiscInput
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE disc SET
       manufacturer = $manufacturer,
       model = $model,
       color = $color,
       category = $category,
       speed = $speed,
       glide = $glide,
       turn = $turn,
       fade = $fade,
       plastic = $plastic
     WHERE id = $id`,
    {
      $manufacturer: input.manufacturer.trim(),
      $model: input.model.trim(),
      $color: input.color,
      $category: input.category,
      $speed: input.speed ?? null,
      $glide: input.glide ?? null,
      $turn: input.turn ?? null,
      $fade: input.fade ?? null,
      $plastic: input.plastic?.trim() || null,
      $id: discId,
    }
  );
  await setDiscTags(discId, input.tagIds ?? []);
}

export async function setInBag(discId: number, inBag: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE disc SET in_bag = $in_bag WHERE id = $id', {
    $in_bag: inBag ? 1 : 0,
    $id: discId,
  });
}

export async function deleteDisc(discId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM disc WHERE id = $id', { $id: discId });
}

export async function deleteDiscCascade(discId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM throw WHERE disc_id = $id', { $id: discId });
    await db.runAsync('DELETE FROM game_plan_shot WHERE disc_id = $id', {
      $id: discId,
    });
    await db.runAsync('DELETE FROM disc WHERE id = $id', { $id: discId });
  });
}

export type DiscDependents = {
  throws: number;
  planShots: number;
};

export async function countDiscDependents(
  discId: number
): Promise<DiscDependents> {
  const db = await getDb();
  const throwsRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM throw WHERE disc_id = $id',
    { $id: discId }
  );
  const plansRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM game_plan_shot WHERE disc_id = $id',
    { $id: discId }
  );
  return {
    throws: throwsRow?.count ?? 0,
    planShots: plansRow?.count ?? 0,
  };
}
