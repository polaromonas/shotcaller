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
