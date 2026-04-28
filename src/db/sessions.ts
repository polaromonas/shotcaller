import { getDb } from './index';
import type { SessionMode } from './types';

export type PracticeSession = {
  id: number;
  layout_id: number;
  session_date: string;
  mode: SessionMode;
  notes: string | null;
  completed_at: string | null;
};

export type PracticeSessionWithContext = PracticeSession & {
  course_name: string;
  layout_name: string;
  throw_count: number;
};

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function createSession(input: {
  layoutId: number;
  sessionDate: string;
  mode?: SessionMode;
  notes?: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO practice_session (layout_id, session_date, mode, notes)
     VALUES ($layout_id, $session_date, $mode, $notes)`,
    {
      $layout_id: input.layoutId,
      $session_date: input.sessionDate,
      $mode: input.mode ?? 'Practice',
      $notes: input.notes?.trim() || null,
    }
  );
  return result.lastInsertRowId;
}

export async function findActiveSession(input: {
  layoutId: number;
  sessionDate: string;
  mode: SessionMode;
}): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM practice_session
      WHERE mode = $mode
        AND layout_id = $layout_id
        AND session_date = $session_date
        AND completed_at IS NULL
      ORDER BY id DESC
      LIMIT 1`,
    {
      $mode: input.mode,
      $layout_id: input.layoutId,
      $session_date: input.sessionDate,
    }
  );
  return row?.id ?? null;
}

export async function listActiveSessionsByLayout(input: {
  sessionDate: string;
  mode: SessionMode;
}): Promise<Map<number, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; layout_id: number }>(
    `SELECT id, layout_id FROM practice_session
      WHERE mode = $mode
        AND session_date = $session_date
        AND completed_at IS NULL
      ORDER BY id DESC`,
    { $mode: input.mode, $session_date: input.sessionDate }
  );
  const map = new Map<number, number>();
  for (const r of rows) {
    if (!map.has(r.layout_id)) map.set(r.layout_id, r.id);
  }
  return map;
}

export async function listOngoingSessions(): Promise<PracticeSessionWithContext[]> {
  const db = await getDb();
  return db.getAllAsync<PracticeSessionWithContext>(
    `SELECT ps.*, c.name AS course_name, l.name AS layout_name,
            (SELECT COUNT(*) FROM throw t WHERE t.session_id = ps.id) AS throw_count
       FROM practice_session ps
       JOIN layout l ON l.id = ps.layout_id
       JOIN course c ON c.id = l.course_id
      WHERE ps.completed_at IS NULL
      ORDER BY ps.session_date DESC, ps.id DESC`
  );
}

export async function markSessionCompleted(sessionId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE practice_session SET completed_at = $now WHERE id = $id`,
    { $now: new Date().toISOString(), $id: sessionId }
  );
}

export async function listSessions(): Promise<PracticeSessionWithContext[]> {
  const db = await getDb();
  return db.getAllAsync<PracticeSessionWithContext>(
    `SELECT ps.*, c.name AS course_name, l.name AS layout_name,
            (SELECT COUNT(*) FROM throw t WHERE t.session_id = ps.id) AS throw_count
       FROM practice_session ps
       JOIN layout l ON l.id = ps.layout_id
       JOIN course c ON c.id = l.course_id
      ORDER BY ps.session_date DESC, ps.id DESC`
  );
}

// throw.session_id has ON DELETE CASCADE, so this also removes every throw
// logged in the session. game_plan_shot is keyed on layout, not session, so
// saved game plans are unaffected.
export async function deleteSession(sessionId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM practice_session WHERE id = $id', {
    $id: sessionId,
  });
}

export async function getMostRecentSession(): Promise<PracticeSessionWithContext | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PracticeSessionWithContext>(
    `SELECT ps.*, c.name AS course_name, l.name AS layout_name,
            (SELECT COUNT(*) FROM throw t WHERE t.session_id = ps.id) AS throw_count
       FROM practice_session ps
       JOIN layout l ON l.id = ps.layout_id
       JOIN course c ON c.id = l.course_id
       ORDER BY ps.session_date DESC, ps.id DESC
       LIMIT 1`
  );
  return row ?? null;
}
