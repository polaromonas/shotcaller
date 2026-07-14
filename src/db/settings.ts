import { getDb } from './index';
import { DEFAULT_DISC_SORT, type DiscSort } from './types';

export async function getDiscSort(): Promise<DiscSort> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ disc_sort: DiscSort }>(
    'SELECT disc_sort FROM app_settings WHERE id = 1'
  );
  return row?.disc_sort ?? DEFAULT_DISC_SORT;
}

export async function setDiscSort(sort: DiscSort): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE app_settings SET disc_sort = $sort WHERE id = 1', {
    $sort: sort,
  });
}

// The player's real-life bag color — tints the My Bag card on Home. null = the
// default neutral card.
export async function getBagColor(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ bag_color: string | null }>(
    'SELECT bag_color FROM app_settings WHERE id = 1'
  );
  return row?.bag_color ?? null;
}

export async function setBagColor(color: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE app_settings SET bag_color = $color WHERE id = 1', {
    $color: color,
  });
}
