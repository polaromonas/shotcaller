import { resetDb, getDb } from '../src/db';
import { getBagColor, setBagColor } from '../src/db/settings';

beforeEach(async () => {
  await resetDb();
  await getDb();
});

test('bag color defaults to null and round-trips (incl. clearing)', async () => {
  expect(await getBagColor()).toBeNull();
  await setBagColor('#e63946');
  expect(await getBagColor()).toBe('#e63946');
  await setBagColor(null);
  expect(await getBagColor()).toBeNull();
});
