import { getDb } from './index';
import { getDiscSort } from './settings';
import { getActiveBagId, setDiscInBag } from './bags';
import { CATEGORY_LABELS, type DiscCategory, type DiscSort } from './types';

export type Disc = {
  id: number;
  manufacturer: string;
  model: string;
  color: string;
  category: DiscCategory;
  /** In the ACTIVE bag (the one you're carrying). Not the legacy column. */
  in_bag: boolean;
  /** Every bag this disc is in. Empty = shelved. */
  bag_ids: number[];
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  plastic: string | null;
  nickname: string | null;
  weight_g: number | null;
};

export type DiscWithTags = Disc & { tags: { id: number; name: string }[] };

// `in_active` is computed per query; the table's own in_bag column is legacy
// and dropped here so it can't be mistaken for membership.
type DiscRow = Omit<Disc, 'in_bag' | 'bag_ids'> & { in_bag: number; in_active: number };

const toDisc = (row: DiscRow, bagIds: number[]): Disc => {
  const { in_active, in_bag: _legacy, ...rest } = row;
  return { ...rest, in_bag: in_active === 1, bag_ids: bagIds };
};

export const isShelved = (d: Pick<Disc, 'bag_ids'>): boolean => d.bag_ids.length === 0;

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

// Secondary line under the display name (disc display rule, see CLAUDE.md). Plastic type is
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
  /** Put the new disc in the active bag. */
  in_bag?: boolean;
  speed?: number | null;
  glide?: number | null;
  turn?: number | null;
  fade?: number | null;
  plastic?: string | null;
  nickname?: string | null;
  weight_g?: number | null;
  tagIds?: number[];
};

function orderBySql(sort: DiscSort): string {
  // Discs in the active bag always sort first regardless of mode — players
  // want bagged discs up top. Display name (nickname OR model) drives every
  // alphabetical tiebreak so the visible order matches the visible label.
  const nameExpr = "COALESCE(NULLIF(nickname, ''), model) COLLATE NOCASE ASC";
  switch (sort) {
    case 'alphabetical':
      return `in_active DESC, ${nameExpr}`;
    case 'speed-fast':
      // `speed IS NULL` puts unset speeds at the end whether ASC or DESC.
      return `in_active DESC, speed IS NULL, speed DESC, ${nameExpr}`;
    case 'speed-slow':
      return `in_active DESC, speed IS NULL, speed ASC, ${nameExpr}`;
    case 'bag-order':
    default:
      // Mirrors a physical bag: drivers, fairways, mids, putters; within each,
      // fastest first; ties break by display name.
      return `in_active DESC,
        CASE category
          WHEN 'DD' THEN 1
          WHEN 'FWD' THEN 2
          WHEN 'MID' THEN 3
          WHEN 'P&A' THEN 4
        END,
        speed IS NULL, speed DESC, ${nameExpr}`;
  }
}

export async function listDiscs(): Promise<DiscWithTags[]> {
  const db = await getDb();
  const [sort, activeBag] = await Promise.all([getDiscSort(), getActiveBagId()]);
  const rows = await db.getAllAsync<DiscRow>(
    `SELECT d.*,
            EXISTS (SELECT 1 FROM bag_disc bd
                     WHERE bd.disc_id = d.id AND bd.bag_id = $bag) AS in_active
       FROM disc d
      ORDER BY ${orderBySql(sort)}`,
    { $bag: activeBag }
  );
  if (rows.length === 0) return [];

  const memberships = await db.getAllAsync<{ disc_id: number; bag_id: number }>(
    'SELECT disc_id, bag_id FROM bag_disc ORDER BY bag_id'
  );
  const bagsByDisc = new Map<number, number[]>();
  for (const m of memberships) {
    const list = bagsByDisc.get(m.disc_id) ?? [];
    list.push(m.bag_id);
    bagsByDisc.set(m.disc_id, list);
  }
  const discs = rows.map((r) => toDisc(r, bagsByDisc.get(r.id) ?? []));

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
    `INSERT INTO disc (manufacturer, model, color, category, speed, glide, turn, fade, plastic, nickname, weight_g)
     VALUES ($manufacturer, $model, $color, $category, $speed, $glide, $turn, $fade, $plastic, $nickname, $weight_g)`,
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
      $weight_g: input.weight_g ?? null,
    }
  );

  const discId = result.lastInsertRowId;
  if (input.in_bag) await setDiscInBag(await getActiveBagId(), discId, true);
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
       nickname = $nickname,
       weight_g = $weight_g
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
      $weight_g: input.weight_g ?? null,
      $id: discId,
    }
  );
  await setDiscTags(discId, input.tagIds ?? []);
}

// Add to / remove from the ACTIVE bag. Other bags are untouched.
export async function setInBag(discId: number, inBag: boolean): Promise<void> {
  await setDiscInBag(await getActiveBagId(), discId, inBag);
}

export async function deleteDisc(discId: number): Promise<void> {
  const db = await getDb();
  // disc_tag rows cascade via the disc FK; hole_plan.disc_id is ON DELETE SET
  // NULL, so any plans using this disc keep the rest of their plan and just
  // lose the disc (design 8b). Both happen automatically with foreign_keys ON.
  await db.runAsync('DELETE FROM disc WHERE id = $id', { $id: discId });
}
