import { getDb } from './index';

export type PracticeSession = {
  id: number;
  layout_id: number;
  session_date: string;
  notes: string | null;
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
  notes?: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO practice_session (layout_id, session_date, notes)
     VALUES ($layout_id, $session_date, $notes)`,
    {
      $layout_id: input.layoutId,
      $session_date: input.sessionDate,
      $notes: input.notes?.trim() || null,
    }
  );
  return result.lastInsertRowId;
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
