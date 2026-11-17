import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from './index';

// Bags are named groups of discs. A disc can be in several bags (the same
// Firebird in the main and travel bag); a disc in no bag is "shelved". One bag
// is "active" — the one you're carrying — and it decides which discs Plan
// offers and which bag My Bag shows.

export type Bag = {
  id: number;
  name: string;
  color: string | null;
  disc_count: number;
};

export const DEFAULT_BAG_NAME = 'My Bag';

// Runs on every open (after SCHEMA_SQL). The first time there are no bags —
// a fresh install, or an upgrade from the single-bag app — it creates "My Bag"
// from the old settings: the old bag color, and every disc that was in_bag.
// Then makes sure active_bag_id points at a real bag.
export async function ensureBags(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM bag');
  if ((row?.n ?? 0) === 0) {
    await db.withTransactionAsync(async () => {
      const settings = await db.getFirstAsync<{ bag_color: string | null }>(
        'SELECT bag_color FROM app_settings WHERE id = 1'
      );
      const result = await db.runAsync(
        'INSERT INTO bag (name, color) VALUES ($name, $color)',
        { $name: DEFAULT_BAG_NAME, $color: settings?.bag_color ?? null }
      );
      const bagId = result.lastInsertRowId;
      await db.runAsync(
        'INSERT INTO bag_disc (bag_id, disc_id) SELECT $bag, id FROM disc WHERE in_bag = 1',
        { $bag: bagId }
      );
      await db.runAsync('UPDATE app_settings SET active_bag_id = $bag WHERE id = 1', {
        $bag: bagId,
      });
    });
  }
  await db.runAsync(
    `UPDATE app_settings SET active_bag_id = (SELECT MIN(id) FROM bag)
      WHERE id = 1
        AND (active_bag_id IS NULL OR active_bag_id NOT IN (SELECT id FROM bag))`
  );
}

export async function listBags(): Promise<Bag[]> {
  const db = await getDb();
  return db.getAllAsync<Bag>(
    `SELECT b.id, b.name, b.color,
            (SELECT COUNT(*) FROM bag_disc bd WHERE bd.bag_id = b.id) AS disc_count
       FROM bag b
      ORDER BY b.id ASC`
  );
}

export async function getActiveBagId(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ active_bag_id: number }>(
    'SELECT active_bag_id FROM app_settings WHERE id = 1'
  );
  if (!row?.active_bag_id) throw new Error('No active bag'); // ensureBags guarantees one
  return row.active_bag_id;
}

export async function getActiveBag(): Promise<Bag> {
  const [bags, id] = await Promise.all([listBags(), getActiveBagId()]);
  return bags.find((b) => b.id === id) ?? bags[0];
}

export async function setActiveBag(bagId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE app_settings SET active_bag_id = $bag WHERE id = 1 AND EXISTS (SELECT 1 FROM bag WHERE id = $bag)',
    { $bag: bagId }
  );
}

export async function createBag(input: { name: string; color: string | null }): Promise<number> {
  const name = input.name.trim();
  if (!name) throw new Error('Bag name is required');
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO bag (name, color) VALUES ($name, $color)', {
    $name: name,
    $color: input.color,
  });
  return result.lastInsertRowId;
}

export async function updateBag(
  bagId: number,
  input: { name: string; color: string | null }
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error('Bag name is required');
  const db = await getDb();
  await db.runAsync('UPDATE bag SET name = $name, color = $color WHERE id = $id', {
    $name: name,
    $color: input.color,
    $id: bagId,
  });
}

// Removes the grouping only — the discs stay in your collection and in any
// other bags. Refuses to delete the last bag. If the active bag goes, the
// first remaining bag becomes active.
export async function deleteBag(bagId: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM bag');
  if ((row?.n ?? 0) <= 1) return false;
  await db.runAsync('DELETE FROM bag WHERE id = $id', { $id: bagId });
  await ensureBags(db);
  return true;
}

export async function setDiscInBag(
  bagId: number,
  discId: number,
  inBag: boolean
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    inBag
      ? 'INSERT OR IGNORE INTO bag_disc (bag_id, disc_id) VALUES ($bag, $disc)'
      : 'DELETE FROM bag_disc WHERE bag_id = $bag AND disc_id = $disc',
    { $bag: bagId, $disc: discId }
  );
}

// Shelve = take the disc out of every bag. It stays in the collection and in
// any plans that use it.
export async function shelveDisc(discId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bag_disc WHERE disc_id = $disc', { $disc: discId });
}
