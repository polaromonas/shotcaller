import { getDb } from './index';
import { listHoles, type Hole } from './courses';
import { listDiscs, type Disc } from './discs';
import { listHolePlans, type HolePlan } from './plans';

// One hole as Play mode reads it: the hole facts, its saved plan (if any), and
// the resolved disc (if the plan names one). The caddie card composes display
// text from `disc` via discDisplayName/discSubline.
export type PlayHole = {
  hole: Hole;
  plan: HolePlan | null;
  disc: Disc | null;
};

export async function loadPlayDeck(layoutId: number): Promise<PlayHole[]> {
  const [holes, plans, discs] = await Promise.all([
    listHoles(layoutId),
    listHolePlans(layoutId),
    listDiscs(),
  ]);
  const planByHole = new Map(plans.map((p) => [p.hole_id, p]));
  const discById = new Map(discs.map((d) => [d.id, d]));
  return holes.map((hole) => {
    const plan = planByHole.get(hole.id) ?? null;
    const disc = plan?.disc_id != null ? discById.get(plan.disc_id) ?? null : null;
    return { hole, plan, disc };
  });
}

// Every layout with its play-readiness, for the Play picker and Home resume
// card. `lastHole`/`lastPlayedAt` come from play_state (null if never played).
// Sorted most-planned first (the layout you're likeliest to want to play).
export type PlayableLayout = {
  layoutId: number;
  layoutName: string;
  courseName: string;
  holeCount: number;
  plannedCount: number;
  lastHole: number | null;
  lastPlayedAt: string | null;
};

export async function listPlayableLayouts(): Promise<PlayableLayout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    layout_id: number;
    layout_name: string;
    course_name: string;
    hole_count: number;
    planned_count: number;
    last_hole: number | null;
    last_played_at: string | null;
  }>(
    `SELECT
        l.id AS layout_id,
        l.name AS layout_name,
        c.name AS course_name,
        (SELECT COUNT(*) FROM hole h WHERE h.layout_id = l.id) AS hole_count,
        (SELECT COUNT(*) FROM hole_plan hp WHERE hp.layout_id = l.id) AS planned_count,
        ps.hole_number AS last_hole,
        ps.updated_at AS last_played_at
     FROM layout l
     JOIN course c ON c.id = l.course_id
     LEFT JOIN play_state ps ON ps.layout_id = l.id
     ORDER BY planned_count DESC, l.name ASC`
  );
  return rows.map((r) => ({
    layoutId: r.layout_id,
    layoutName: r.layout_name,
    courseName: r.course_name,
    holeCount: r.hole_count,
    plannedCount: r.planned_count,
    lastHole: r.last_hole,
    lastPlayedAt: r.last_played_at,
  }));
}

// The single most-recently-played layout (for Home's resume card), or null.
export function mostRecentlyPlayed(
  layouts: PlayableLayout[]
): PlayableLayout | null {
  return layouts
    .filter((l) => l.lastPlayedAt != null)
    .reduce<PlayableLayout | null>(
      (acc, l) => (!acc || (l.lastPlayedAt as string) > (acc.lastPlayedAt as string) ? l : acc),
      null
    );
}

export async function getPlayHoleNumber(layoutId: number): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hole_number: number }>(
    'SELECT hole_number FROM play_state WHERE layout_id = $id',
    { $id: layoutId }
  );
  return row?.hole_number ?? null;
}

export async function setPlayHoleNumber(
  layoutId: number,
  holeNumber: number
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO play_state (layout_id, hole_number, updated_at)
     VALUES ($layout_id, $hole_number, $updated_at)
     ON CONFLICT(layout_id) DO UPDATE SET
       hole_number = excluded.hole_number,
       updated_at = excluded.updated_at`,
    { $layout_id: layoutId, $hole_number: holeNumber, $updated_at: now }
  );
}
