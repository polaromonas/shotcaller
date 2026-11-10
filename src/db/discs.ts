import { getDb } from './index';
import { getDiscSort } from './settings';
import { CATEGORY_LABELS, type DiscCategory, type DiscSort } from './types';

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
  nickname: string | null;
};

export type DiscWithTags = Disc & { tags: { id: number; name: string }[] };

type DiscRow = Omit<Disc, 'in_bag'> & { in_bag: number };

const toDisc = (row: DiscRow): Disc => ({
  ...row,
  in_bag: row.in_bag === 1,
});

// Single source of truth for "what to display as a disc's primary name."
// Falls back to model when no nickname is set. Use this everywhere a disc is
// rendered to the user; it lets a player call their Destroyer "My Roller" and
// see that label in the picker, plan card, etc.
export function discDisplayName(d: {
  nickname: string | null;
  model: string;
}): string {
  if (d.nickname && d.nickname.trim().length > 0) return d.nickname;
  return d.model;
}

// Secondary line under the display name (V2 disc display rule). Plastic type is
// shown (a mold is bagged in different plastics); manufacturer never is.
// - nicknamed    → "{plastic} {model} · {category}"  e.g. "Star Firebird · FWD"
// - not nicknamed → "{plastic} · {category}" or "{category}" (model is already
//   the big name — never repeat it).
// Pass `withCategory: false` where a category section header already states it
// (My Bag's grouped list) — the result may then be empty, so callers must skip
// rendering a blank line.
export function discSubline(
  d: {
    nickname: string | null;
    model: string;
    plastic: string | null;
    category: DiscCategory;
  },
  opts: { withCategory?: boolean } = {}
): string {
  const withCategory = opts.withCategory ?? true;
  const plastic = d.plastic && d.plastic.trim().length > 0 ? d.plastic.trim() : null;
  const nicknamed = !!(d.nickname && d.nickname.trim().length > 0);
  const category = CATEGORY_LABELS[d.category];
  if (nicknamed) {
    const mold = plastic ? `${plastic} ${d.model}` : d.model;
    return withCategory ? `${mold} · ${category}` : mold;
  }
  if (!withCategory) return plastic ?? '';
  return plastic ? `${plastic} · ${category}` : category;
}

// Flight numbers as one glanceable string, e.g. "12 / 5 / -1 / 3". Null unless
// all four are set — a partial flight line reads as missing data.
export function discFlightText(
  d: {
    speed: number | null;
    glide: number | null;
    turn: number | null;
    fade: number | null;
  },
  sep = ' / '
): string | null {
  const nums = [d.speed, d.glide, d.turn, d.fade];
  if (nums.some((n) => n === null)) return null;
  return nums.map((n) => String(n)).join(sep);
}

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
  nickname?: string | null;
  tagIds?: number[];
};

function orderBySql(sort: DiscSort): string {
  // In-bag always sorts first regardless of mode — players want bagged discs
  // up top during a round. Display name (nickname OR model) drives every
  // alphabetical tiebreak so the visible order matches the visible label.
  const nameExpr = "COALESCE(NULLIF(nickname, ''), model) COLLATE NOCASE ASC";
  switch (sort) {
    case 'alphabetical':
      return `in_bag DESC, ${nameExpr}`;
    case 'speed-fast':
      // `speed IS NULL` puts unset speeds at the end whether ASC or DESC.
      return `in_bag DESC, speed IS NULL, speed DESC, ${nameExpr}`;
    case 'speed-slow':
      return `in_bag DESC, speed IS NULL, speed ASC, ${nameExpr}`;
    case 'bag-order':
    default:
      // Mirrors a physical bag: drivers, fairways, mids, putters; within each,
      // fastest first; ties break by display name.
      return `in_bag DESC,
        CASE category
          WHEN 'DD' THEN 1
          WHEN 'FWD' THEN 2
          WHEN 'MID' THEN 3
          WHEN 'P&A' THEN 4
        END,
        speed IS NULL, speed DESC, ${nameExpr}`;
  }
}

export async function countDiscs(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM disc'
  );
  return row?.count ?? 0;
}

export async function listDiscs(): Promise<DiscWithTags[]> {
  const db = await getDb();
  const sort = await getDiscSort();
  const discs = (
    await db.getAllAsync<DiscRow>(
      `SELECT * FROM disc ORDER BY ${orderBySql(sort)}`
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
    `INSERT INTO disc (manufacturer, model, color, category, in_bag, speed, glide, turn, fade, plastic, nickname)
     VALUES ($manufacturer, $model, $color, $category, $in_bag, $speed, $glide, $turn, $fade, $plastic, $nickname)`,
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
      $nickname: input.nickname?.trim() || null,
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
       plastic = $plastic,
       nickname = $nickname
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
      $nickname: input.nickname?.trim() || null,
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
  // disc_tag rows cascade via the disc FK; hole_plan.disc_id is ON DELETE SET
  // NULL, so any plans using this disc keep the rest of their plan and just
  // lose the disc (design 8b). Both happen automatically with foreign_keys ON.
  await db.runAsync('DELETE FROM disc WHERE id = $id', { $id: discId });
}
