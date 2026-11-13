import { getDb } from './index';
import type { ThrowType } from './types';

const THROW_ABBREV: Record<ThrowType, string> = {
  Backhand: 'BH',
  Forehand: 'FH',
  Overhand: 'OH',
};

// One-line summary of a hole plan for the layout grid, e.g. "Zone · BH Hyzer".
// Falls back to the throw/shape alone, then the aim note, then "Planned".
export function planSummary(
  plan: {
    throw_type: ThrowType | null;
    shot_shape: string | null;
    aim_note: string | null;
  },
  discName: string | null
): string {
  const throwShape = [
    plan.throw_type ? THROW_ABBREV[plan.throw_type] : null,
    plan.shot_shape,
  ]
    .filter(Boolean)
    .join(' ');
  const parts = [discName, throwShape].filter((p) => p && p.length > 0);
  if (parts.length > 0) return parts.join(' · ');
  const aim = plan.aim_note?.trim();
  return aim && aim.length > 0 ? aim : 'Planned';
}

// A saved plan for one hole. Every field except the row's own bookkeeping is
// nullable — a hole is "planned" once a row exists, even if it only holds an
// aim note. See src/db/schema.ts for the table and its FK behavior.
export type HolePlan = {
  id: number;
  layout_id: number;
  hole_id: number;
  disc_id: number | null;
  throw_type: ThrowType | null;
  shot_shape: string | null;
  aim_note: string | null;
  // Set from Play when a hole's plan didn't work out — a note-to-self to revise
  // it back in Plan mode. Stored as 0/1 in SQLite; mapped to a boolean here.
  needs_review: boolean;
  // Optional "what to change" jotted in Play alongside the flag. Only
  // meaningful while needs_review is set; cleared when the flag is.
  review_note: string | null;
  updated_at: string;
};

// SQLite has no boolean type, so needs_review comes back as 0/1. Map rows
// through here so callers get a real boolean.
type HolePlanRow = Omit<HolePlan, 'needs_review'> & { needs_review: number };
const mapPlan = (row: HolePlanRow): HolePlan => ({
  ...row,
  needs_review: row.needs_review === 1,
});

export type HolePlanInput = {
  disc_id: number | null;
  throw_type: ThrowType | null;
  shot_shape: string | null;
  aim_note: string | null;
};

export async function getHolePlan(holeId: number): Promise<HolePlan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HolePlanRow>(
    'SELECT * FROM hole_plan WHERE hole_id = $hole_id',
    { $hole_id: holeId }
  );
  return row ? mapPlan(row) : null;
}

export async function listHolePlans(layoutId: number): Promise<HolePlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HolePlanRow>(
    `SELECT hp.* FROM hole_plan hp
       JOIN hole h ON h.id = hp.hole_id
      WHERE hp.layout_id = $layout_id
      ORDER BY h.hole_number ASC`,
    { $layout_id: layoutId }
  );
  return rows.map(mapPlan);
}

// Flag/unflag a hole's plan for revision — the Play → Plan note-to-self, with
// an optional short note on what to change. Unflagging clears the note. Only
// these two fields are touched; the rest of the plan is left exactly as it
// was. A no-op if the hole has no plan row (you can only flag a plan).
export async function setHolePlanReview(
  holeId: number,
  value: boolean,
  note: string | null = null
): Promise<void> {
  const db = await getDb();
  const trimmed = value && note?.trim() ? note.trim() : null;
  await db.runAsync(
    'UPDATE hole_plan SET needs_review = $value, review_note = $note WHERE hole_id = $hole_id',
    { $value: value ? 1 : 0, $note: trimmed, $hole_id: holeId }
  );
}

// Upsert one hole's plan. If the input is entirely empty (no disc, throw,
// shape, or aim note) the row is removed instead — an empty plan is no plan, so
// clearing every field un-plans the hole and it stops counting as planned.
export async function saveHolePlan(
  layoutId: number,
  holeId: number,
  input: HolePlanInput
): Promise<void> {
  const db = await getDb();
  const aim = input.aim_note?.trim() ? input.aim_note.trim() : null;
  const isEmpty =
    input.disc_id == null &&
    input.throw_type == null &&
    input.shot_shape == null &&
    aim == null;

  if (isEmpty) {
    await db.runAsync('DELETE FROM hole_plan WHERE hole_id = $hole_id', {
      $hole_id: holeId,
    });
    return;
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO hole_plan
       (layout_id, hole_id, disc_id, throw_type, shot_shape, aim_note, updated_at)
     VALUES
       ($layout_id, $hole_id, $disc_id, $throw_type, $shot_shape, $aim_note, $updated_at)
     ON CONFLICT(hole_id) DO UPDATE SET
       disc_id = excluded.disc_id,
       throw_type = excluded.throw_type,
       shot_shape = excluded.shot_shape,
       aim_note = excluded.aim_note,
       updated_at = excluded.updated_at`,
    {
      $layout_id: layoutId,
      $hole_id: holeId,
      $disc_id: input.disc_id,
      $throw_type: input.throw_type,
      $shot_shape: input.shot_shape,
      $aim_note: aim,
      $updated_at: now,
    }
  );
}

export async function countPlannedHoles(layoutId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM hole_plan WHERE layout_id = $layout_id',
    { $layout_id: layoutId }
  );
  return row?.count ?? 0;
}

// How many hole plans reference a disc — surfaced in the delete-disc
// confirmation. Deleting the disc clears it from these plans via the FK's
// ON DELETE SET NULL; the rest of each plan stays.
export async function countPlansUsingDisc(discId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM hole_plan WHERE disc_id = $disc_id',
    { $disc_id: discId }
  );
  return row?.count ?? 0;
}
