import { getDb } from './index';
import { listShotTagsForThrows, setThrowShotTags, type ShotTag } from './shotTags';
import type { ResultKind, ShotShape, ThrowType } from './types';

export type Throw = {
  id: number;
  session_id: number;
  hole_id: number;
  disc_id: number;
  throw_type: ThrowType;
  shot_shape: ShotShape;
  result: ResultKind;
  distance_from_basket_ft: number | null;
  notes: string | null;
};

export type ThrowWithDisc = Throw & {
  disc_manufacturer: string;
  disc_model: string;
  disc_color: string;
  disc_nickname: string | null;
  tags: ShotTag[];
};

export type NewThrowInput = {
  sessionId: number;
  holeId: number;
  discId: number;
  throwType: ThrowType;
  shotShape: ShotShape;
  result: ResultKind;
  distanceFt: number | null;
  notes?: string | null;
  shotTagIds?: number[];
};

export async function logThrow(input: NewThrowInput): Promise<number> {
  const db = await getDb();
  let throwId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO throw
         (session_id, hole_id, disc_id, throw_type, shot_shape, result, distance_from_basket_ft, notes)
       VALUES
         ($session_id, $hole_id, $disc_id, $throw_type, $shot_shape, $result, $distance, $notes)`,
      {
        $session_id: input.sessionId,
        $hole_id: input.holeId,
        $disc_id: input.discId,
        $throw_type: input.throwType,
        $shot_shape: input.shotShape,
        $result: input.result,
        $distance: input.distanceFt,
        $notes: input.notes?.trim() || null,
      }
    );
    throwId = result.lastInsertRowId;
    if (input.shotTagIds && input.shotTagIds.length > 0) {
      await setThrowShotTags(throwId, input.shotTagIds);
    }
  });
  return throwId;
}

export async function deleteThrow(throwId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM throw WHERE id = $id', { $id: throwId });
}

export async function getMostRecentDiscIdForHole(
  holeId: number
): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ disc_id: number }>(
    `SELECT disc_id FROM throw
      WHERE hole_id = $hole_id
      ORDER BY id DESC
      LIMIT 1`,
    { $hole_id: holeId }
  );
  return row?.disc_id ?? null;
}

async function attachTags(
  rows: Omit<ThrowWithDisc, 'tags'>[]
): Promise<ThrowWithDisc[]> {
  if (rows.length === 0) return [];
  const tagsByThrow = await listShotTagsForThrows(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, tags: tagsByThrow.get(r.id) ?? [] }));
}

export async function listThrowsForSession(
  sessionId: number
): Promise<ThrowWithDisc[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Omit<ThrowWithDisc, 'tags'>>(
    `SELECT t.*,
            d.manufacturer AS disc_manufacturer,
            d.model AS disc_model,
            d.color AS disc_color,
            d.nickname AS disc_nickname
       FROM throw t
       JOIN disc d ON d.id = t.disc_id
      WHERE t.session_id = $session_id
      ORDER BY t.id ASC`,
    { $session_id: sessionId }
  );
  return attachTags(rows);
}

export async function listThrowsForHole(
  sessionId: number,
  holeId: number
): Promise<ThrowWithDisc[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Omit<ThrowWithDisc, 'tags'>>(
    `SELECT t.*,
            d.manufacturer AS disc_manufacturer,
            d.model AS disc_model,
            d.color AS disc_color,
            d.nickname AS disc_nickname
       FROM throw t
       JOIN disc d ON d.id = t.disc_id
      WHERE t.session_id = $session_id AND t.hole_id = $hole_id
      ORDER BY t.id DESC`,
    { $session_id: sessionId, $hole_id: holeId }
  );
  return attachTags(rows);
}
