import { getDb } from './index';
import type { Hole } from './courses';
import type { DiscCategory, ResultKind, ShotShape, ThrowType } from './types';

const GOOD_RESULTS = ['Basket', 'C1', 'C2', 'Fairway'] as const;

const RESULT_RANK: Record<ResultKind, number> = {
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

export type ComboRec = {
  disc_id: number;
  disc_manufacturer: string;
  disc_model: string;
  disc_color: string;
  disc_category: DiscCategory;
  throw_type: ThrowType;
  shot_shape: ShotShape;
  total: number;
  good: number;
  ob: number;
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
  session_id: number;
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
  sessionId: number
): Promise<GamePlanContext | null> {
  const db = await getDb();

  const sessionRow = await db.getFirstAsync<{
    layout_id: number;
    course_name: string;
    layout_name: string;
  }>(
    `SELECT ps.layout_id, c.name AS course_name, l.name AS layout_name
       FROM practice_session ps
       JOIN layout l ON l.id = ps.layout_id
       JOIN course c ON c.id = l.course_id
      WHERE ps.id = $id`,
    { $id: sessionId }
  );
  if (!sessionRow) return null;

  const holes = await db.getAllAsync<Hole>(
    'SELECT * FROM hole WHERE layout_id = $id ORDER BY hole_number ASC',
    { $id: sessionRow.layout_id }
  );

  const savedPlanRows = await db.getAllAsync<{
    id: number;
    session_id: number;
    hole_id: number;
    disc_id: number;
    throw_type: ThrowType;
    shot_shape: ShotShape;
    notes: string | null;
    is_manual_override: number;
  }>(
    'SELECT * FROM game_plan_shot WHERE session_id = $id',
    { $id: sessionId }
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
    layoutId: sessionRow.layout_id,
    courseName: sessionRow.course_name,
    layoutName: sessionRow.layout_name,
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
        d.color AS disc_color,
        d.category AS disc_category,
        t.throw_type,
        t.shot_shape,
        COUNT(*) AS total,
        SUM(CASE WHEN t.result IN ('Basket','C1','C2','Fairway') THEN 1 ELSE 0 END) AS good,
        SUM(CASE WHEN t.result = 'OB' THEN 1 ELSE 0 END) AS ob
       FROM throw t
       JOIN disc d ON d.id = t.disc_id
      WHERE t.hole_id = $hole_id
      GROUP BY t.disc_id, t.throw_type, t.shot_shape
      ORDER BY good DESC, ob ASC, total DESC
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
  sessionId: number,
  plans: HolePlanInput[]
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM game_plan_shot WHERE session_id = $id',
      { $id: sessionId }
    );
    const stmt = await db.prepareAsync(
      `INSERT INTO game_plan_shot
         (session_id, hole_id, disc_id, throw_type, shot_shape, notes, is_manual_override)
       VALUES
         ($session_id, $hole_id, $disc_id, $throw_type, $shot_shape, $notes, $is_manual_override)`
    );
    try {
      for (const p of plans) {
        await stmt.executeAsync({
          $session_id: sessionId,
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

export type SessionCandidate = {
  id: number;
  session_date: string;
  notes: string | null;
  course_name: string;
  layout_name: string;
  throw_count: number;
  has_plan: number;
};

export async function listSessionsForGamePlan(): Promise<SessionCandidate[]> {
  const db = await getDb();
  return db.getAllAsync<SessionCandidate>(
    `SELECT ps.id, ps.session_date, ps.notes,
            c.name AS course_name,
            l.name AS layout_name,
            (SELECT COUNT(*) FROM throw t WHERE t.session_id = ps.id) AS throw_count,
            (SELECT COUNT(*) FROM game_plan_shot g WHERE g.session_id = ps.id) AS has_plan
       FROM practice_session ps
       JOIN layout l ON l.id = ps.layout_id
       JOIN course c ON c.id = l.course_id
      ORDER BY ps.session_date DESC, ps.id DESC`
  );
}

export function resultRank(r: ResultKind): number {
  return RESULT_RANK[r];
}

export function isGoodResult(r: ResultKind): boolean {
  return (GOOD_RESULTS as readonly ResultKind[]).includes(r);
}
