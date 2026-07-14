import { getDb } from './index';

// A shot shape offered in the Plan-a-hole chip row. The 9 built-ins are seeded
// and protected (is_builtin); users add their own, which persist and can be
// deleted. is_overhand drives the Thumber/Tomahawk → Overhand lock.
export type Shape = {
  id: number;
  name: string;
  is_overhand: boolean;
  is_builtin: boolean;
};

export async function listShapes(): Promise<Shape[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    is_overhand: number;
    is_builtin: number;
  }>('SELECT id, name, is_overhand, is_builtin FROM shape ORDER BY sort_order ASC, name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    is_overhand: r.is_overhand === 1,
    is_builtin: r.is_builtin === 1,
  }));
}

// Add a user shape. No-op on blank or duplicate names (UNIQUE + OR IGNORE).
export async function createShape(name: string): Promise<void> {
  const db = await getDb();
  const trimmed = name.trim();
  if (trimmed.length === 0) return;
  await db.runAsync(
    'INSERT OR IGNORE INTO shape (name, is_overhand, is_builtin, sort_order) VALUES ($name, 0, 0, 100)',
    { $name: trimmed }
  );
}

// Delete a shape — built-ins are protected by the is_builtin guard. Plans that
// already reference the deleted shape keep their stored name (shot_shape is
// free text, not an FK); the shape just stops appearing as a new option.
export async function deleteShape(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shape WHERE id = $id AND is_builtin = 0', {
    $id: id,
  });
}
