import { getDb } from './index';
import type { Hole } from './courses';
import type { DiscCategory, ResultKind, ShotShape, ThrowType } from './types';

// Display rank: Basket is strictly better than C1, etc. Used for "best result
// achieved" stats where we want to surface rare good outcomes.
const DISPLAY_RANK: Record<ResultKind, number> = {
  Basket: 6,
  C1: 5,
  C2: 4,
  Fairway: 3,
  Rough: 2,
  OB: 1,
};

const RANK_TO_RESULT: Record<number, ResultKind> = {
  6: 'Basket',
  5: 'C1',
  4: 'C2',
  3: 'Fairway',
  2: 'Rough',
  1: 'OB',
};

// Scoring weight for the recommendation engine. Basket and C1 are tied
// because aces are luck-dependent; a reliable C1 is worth just as much.
// OB is negative because it costs a real penalty stroke.
const SCORE_CASE_SQL = `CASE result
  WHEN 'Basket' THEN 5
  WHEN 'C1' THEN 5
  WHEN 'C2' THEN 4
  WHEN 'Fairway' THEN 3
  WHEN 'Rough' THEN 2
  WHEN 'OB' THEN -1
END`;

export type ComboRec = {
  disc_id: number;
  disc_manufacturer: string;
  disc_model: string;
  disc_nickname: string | null;
  disc_color: string;
  disc_category: DiscCategory;
  throw_type: ThrowType;
  shot_shape: ShotShape;
  total: number;
  good: number;
  ob: number;
  avg_score: number;
};

export type HoleStats = {
  total: number;
  good: number;
  fairway_pct: number;
  best: ResultKind | null;
  notes: string[];
};

export type SavedPlan = {
  id: number;
  layout_id: number;
  hole_id: number;
  disc_id: number;
  throw_type: ThrowType;
  shot_shape: ShotShape;
  notes: string | null;
  is_manual_override: boolean;
};

export type HoleRec = {
  hole: Hole;
  stats: HoleStats;
  combo: ComboRec | null;
  savedPlan: SavedPlan | null;
};

export type GamePlanContext = {
  layoutId: number;
  courseName: string;
  layoutName: string;
  holes: HoleRec[];
};

export async function loadGamePlanContext(
  layoutId: number
): Promise<GamePlanContext | null> {
  const db = await getDb();

  const layoutRow = await db.getFirstAsync<{
    course_name: string;
    layout_name: string;
  }>(
    `SELECT c.name AS course_name, l.name AS layout_name
       FROM layout l
       JOIN course c ON c.id = l.course_id
      WHERE l.id = $id`,
    { $id: layoutId }
  );
  if (!layoutRow) return null;

  const holes = await db.getAllAsync<Hole>(
    'SELECT * FROM hole WHERE layout_id = $id ORDER BY hole_number ASC',
    { $id: layoutId }
  );

  const savedPlanRows = await db.getAllAsync<{
    id: number;
    layout_id: number;
    hole_id: number;
    disc_id: number;
    throw_type: ThrowType;
    shot_shape: ShotShape;
    notes: string | null;
    is_manual_override: number;
  }>(
    'SELECT * FROM game_plan_shot WHERE layout_id = $id',
    { $id: layoutId }
  );
  const savedByHole = new Map<number, SavedPlan>();
  for (const row of savedPlanRows) {
    savedByHole.set(row.hole_id, {
      ...row,
      is_manual_override: row.is_manual_override === 1,
    });
  }

  const holeRecs: HoleRec[] = [];
  for (const hole of holes) {
    const [stats, combo] = await Promise.all([
      computeHoleStats(hole.id),
      computeBestCombo(hole.id),
    ]);
    holeRecs.push({
      hole,
      stats,
      combo,
      savedPlan: savedByHole.get(hole.id) ?? null,
    });
  }

  return {
    layoutId,
    courseName: layoutRow.course_name,
    layoutName: layoutRow.layout_name,
    holes: holeRecs,
  };
}

async function computeHoleStats(holeId: number): Promise<HoleStats> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    total: number;
    good: number;
    best_rank: number | null;
  }>(
    `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN result IN ('Basket','C1','C2','Fairway') THEN 1 ELSE 0 END), 0) AS good,
        MAX(CASE result
              WHEN 'Basket' THEN 6
              WHEN 'C1' THEN 5
              WHEN 'C2' THEN 4
              WHEN 'Fairway' THEN 3
              WHEN 'Rough' THEN 2
              WHEN 'OB' THEN 1
            END) AS best_rank
       FROM throw
      WHERE hole_id = $hole_id`,
    { $hole_id: holeId }
  );

  const total = row?.total ?? 0;
  const good = row?.good ?? 0;
  const bestRank = row?.best_rank ?? null;

  const noteRows = await db.getAllAsync<{ notes: string }>(
    `SELECT notes FROM throw
      WHERE hole_id = $hole_id AND notes IS NOT NULL AND TRIM(notes) != ''
      ORDER BY id DESC`,
    { $hole_id: holeId }
  );

  return {
    total,
    good,
    fairway_pct: total === 0 ? 0 : Math.round((good / total) * 100),
    best: bestRank !== null ? RANK_TO_RESULT[bestRank] : null,
    notes: noteRows.map((r) => r.notes),
  };
}

async function computeBestCombo(holeId: number): Promise<ComboRec | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ComboRec>(
    `SELECT
        t.disc_id,
        d.manufacturer AS disc_manufacturer,
        d.model AS disc_model,
        d.nickname AS disc_nickname,
        d.color AS disc_color,
        d.category AS disc_category,
        t.throw_type,
        t.shot_shape,
        COUNT(*) AS total,
        SUM(CASE WHEN t.result IN ('Basket','C1','C2','Fairway') THEN 1 ELSE 0 END) AS good,
        SUM(CASE WHEN t.result = 'OB' THEN 1 ELSE 0 END) AS ob,
        AVG(${SCORE_CASE_SQL}) AS avg_score
       FROM throw t
       JOIN disc d ON d.id = t.disc_id
      WHERE t.hole_id = $hole_id
      GROUP BY t.disc_id, t.throw_type, t.shot_shape
      ORDER BY avg_score DESC, total DESC
      LIMIT 1`,
    { $hole_id: holeId }
  );
  return row ?? null;
}

export type HolePlanInput = {
  holeId: number;
  discId: number;
  throwType: ThrowType;
  shotShape: ShotShape;
  notes: string | null;
  isManualOverride: boolean;
};

export async function saveGamePlan(
  layoutId: number,
  plans: HolePlanInput[]
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM game_plan_shot WHERE layout_id = $id',
      { $id: layoutId }
    );
    const stmt = await db.prepareAsync(
      `INSERT INTO game_plan_shot
         (layout_id, hole_id, disc_id, throw_type, shot_shape, notes, is_manual_override)
       VALUES
         ($layout_id, $hole_id, $disc_id, $throw_type, $shot_shape, $notes, $is_manual_override)`
    );
    try {
      for (const p of plans) {
        await stmt.executeAsync({
          $layout_id: layoutId,
          $hole_id: p.holeId,
          $disc_id: p.discId,
          $throw_type: p.throwType,
          $shot_shape: p.shotShape,
          $notes: p.notes?.trim() || null,
          $is_manual_override: p.isManualOverride ? 1 : 0,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}

export type LayoutCandidate = {
  layout_id: number;
  layout_name: string;
  course_name: string;
  course_location: string;
  hole_count: number;
  throw_count: number;
  session_count: number;
  planned_holes: number;
};

export async function listLayoutsForGamePlan(): Promise<LayoutCandidate[]> {
  const db = await getDb();
  return db.getAllAsync<LayoutCandidate>(
    `SELECT
        l.id AS layout_id,
        l.name AS layout_name,
        c.name AS course_name,
        c.location AS course_location,
        (SELECT COUNT(*) FROM hole h WHERE h.layout_id = l.id) AS hole_count,
        (SELECT COUNT(*) FROM throw t
           JOIN hole h ON h.id = t.hole_id
          WHERE h.layout_id = l.id) AS throw_count,
        (SELECT COUNT(*) FROM practice_session ps
          WHERE ps.layout_id = l.id) AS session_count,
        (SELECT COUNT(*) FROM game_plan_shot g
          WHERE g.layout_id = l.id) AS planned_holes
       FROM layout l
       JOIN course c ON c.id = l.course_id
      ORDER BY throw_count DESC, c.name ASC, l.name ASC`
  );
}

export function displayRank(r: ResultKind): number {
  return DISPLAY_RANK[r];
}

export async function listSavedPlansForLayout(
  layoutId: number
): Promise<SavedPlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    layout_id: number;
    hole_id: number;
    disc_id: number;
    throw_type: ThrowType;
    shot_shape: ShotShape;
    notes: string | null;
    is_manual_override: number;
  }>(
    'SELECT * FROM game_plan_shot WHERE layout_id = $id',
    { $id: layoutId }
  );
  return rows.map((r) => ({
    ...r,
    is_manual_override: r.is_manual_override === 1,
  }));
}
