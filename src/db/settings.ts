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
