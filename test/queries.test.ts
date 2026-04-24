import { getDb, resetDb } from '../src/db';
import { createDisc, listDiscs, setInBag } from '../src/db/discs';
import {
  createCourse,
  createLayoutWithHoles,
  listHoles,
} from '../src/db/courses';
import { createSession } from '../src/db/sessions';
import { logThrow } from '../src/db/throws';
import {
  loadGamePlanContext,
  listLayoutsForGamePlan,
  saveGamePlan,
  listSavedPlansForLayout,
} from '../src/db/gamePlan';
import { loadStats } from '../src/db/stats';
import { __resetAllDatabases } from './mocks/expo-sqlite';

afterEach(async () => {
  await resetDb();
  __resetAllDatabases();
});

async function seedBaseline() {
  const courseId = await createCourse({ name: 'Hawk Run', location: 'NC' });
  const layoutId = await createLayoutWithHoles({
    courseId,
    name: 'Tournament',
    holeCount: 3,
  });
  const discId = await createDisc({
    manufacturer: 'Innova',
    model: 'Destroyer',
    color: '#e63946',
    category: 'DD',
    in_bag: true,
    speed: 12,
    glide: 5,
    turn: -1,
    fade: 3,
  });
  const sessionId = await createSession({
    layoutId,
    sessionDate: '2026-04-24',
    mode: 'Practice',
  });
  const holes = await listHoles(layoutId);
  return { courseId, layoutId, discId, sessionId, holes };
}

describe('discs', () => {
  test('createDisc + listDiscs roundtrip', async () => {
    await createDisc({
      manufacturer: 'Innova',
      model: 'Aviar',
      color: '#ffffff',
      category: 'P&A',
    });
    const discs = await listDiscs();
    expect(discs).toHaveLength(1);
    expect(discs[0]).toMatchObject({
      manufacturer: 'Innova',
      model: 'Aviar',
      category: 'P&A',
      in_bag: false,
    });
  });

  test('setInBag flips the flag', async () => {
    const id = await createDisc({
      manufacturer: 'Discraft',
      model: 'Buzzz',
      color: '#ffdd00',
      category: 'MID',
    });
    await setInBag(id, true);
    const discs = await listDiscs();
    expect(discs[0].in_bag).toBe(true);
  });

  test('in-bag discs sort before out-of-bag', async () => {
    await createDisc({
      manufacturer: 'A',
      model: 'Out',
      color: '#000',
      category: 'DD',
    });
    const inBagId = await createDisc({
      manufacturer: 'Z',
      model: 'In',
      color: '#000',
      category: 'DD',
    });
    await setInBag(inBagId, true);
    const discs = await listDiscs();
    expect(discs.map((d) => d.model)).toEqual(['In', 'Out']);
  });
});

describe('game plan', () => {
  test('listLayoutsForGamePlan returns counts', async () => {
    const { layoutId, discId, sessionId, holes } = await seedBaseline();
    await logThrow({
      sessionId,
      holeId: holes[0].id,
      discId,
      throwType: 'Backhand',
      shotShape: 'Flat',
      result: 'Fairway',
      distanceFt: 80,
    });

    const rows = await listLayoutsForGamePlan();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      layout_id: layoutId,
      layout_name: 'Tournament',
      course_name: 'Hawk Run',
      hole_count: 3,
      throw_count: 1,
      session_count: 1,
      planned_holes: 0,
    });
  });

  test('saveGamePlan + listSavedPlansForLayout roundtrip', async () => {
    const { layoutId, discId, holes } = await seedBaseline();
    await saveGamePlan(layoutId, [
      {
        holeId: holes[0].id,
        discId,
        throwType: 'Backhand',
        shotShape: 'Flat',
        notes: 'gap left',
        isManualOverride: true,
      },
    ]);
    const saved = await listSavedPlansForLayout(layoutId);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      hole_id: holes[0].id,
      disc_id: discId,
      throw_type: 'Backhand',
      shot_shape: 'Flat',
      notes: 'gap left',
      is_manual_override: true,
    });
  });

  test('loadGamePlanContext recommends the best-scoring combo', async () => {
    const { layoutId, discId, sessionId, holes } = await seedBaseline();
    const hole1 = holes[0];
    // Three throws of Destroyer/Backhand/Flat, all in-circle.
    for (let i = 0; i < 3; i++) {
      await logThrow({
        sessionId,
        holeId: hole1.id,
        discId,
        throwType: 'Backhand',
        shotShape: 'Flat',
        result: 'C2',
        distanceFt: 40,
      });
    }
    const ctx = await loadGamePlanContext(layoutId);
    expect(ctx).not.toBeNull();
    const rec = ctx!.holes.find((h) => h.hole.id === hole1.id);
    expect(rec?.combo).toMatchObject({
      disc_id: discId,
      throw_type: 'Backhand',
      shot_shape: 'Flat',
      total: 3,
    });
    expect(rec?.stats.total).toBe(3);
    expect(rec?.stats.fairway_pct).toBe(100);
    expect(rec?.stats.best).toBe('C2');
  });

  test('OB weighted negative drops a combo below a safer one', async () => {
    const { layoutId, sessionId, holes } = await seedBaseline();
    const hole1 = holes[0];

    // Driver: 2x C2 + 1x OB. avg = (4 + 4 + -1) / 3 = 7/3 ≈ 2.33
    const driverId = await createDisc({
      manufacturer: 'Innova',
      model: 'Wraith',
      color: '#00b4d8',
      category: 'DD',
    });
    for (let i = 0; i < 2; i++) {
      await logThrow({
        sessionId,
        holeId: hole1.id,
        discId: driverId,
        throwType: 'Backhand',
        shotShape: 'Flat',
        result: 'C2',
        distanceFt: 30,
      });
    }
    await logThrow({
      sessionId,
      holeId: hole1.id,
      discId: driverId,
      throwType: 'Backhand',
      shotShape: 'Flat',
      result: 'OB',
      distanceFt: null,
    });

    // Fairway driver: 2x Fairway. avg = (3 + 3) / 2 = 3
    const fwdId = await createDisc({
      manufacturer: 'Innova',
      model: 'Teebird',
      color: '#6ab04c',
      category: 'FWD',
    });
    for (let i = 0; i < 2; i++) {
      await logThrow({
        sessionId,
        holeId: hole1.id,
        discId: fwdId,
        throwType: 'Backhand',
        shotShape: 'Flat',
        result: 'Fairway',
        distanceFt: 60,
      });
    }

    const ctx = await loadGamePlanContext(layoutId);
    const rec = ctx!.holes.find((h) => h.hole.id === hole1.id);
    expect(rec?.combo?.disc_id).toBe(fwdId);
  });
});

describe('stats', () => {
  test('loadStats aggregates collection, activity, and performance', async () => {
    const { layoutId, discId, sessionId, holes } = await seedBaseline();
    await logThrow({
      sessionId,
      holeId: holes[0].id,
      discId,
      throwType: 'Backhand',
      shotShape: 'Flat',
      result: 'Basket',
      distanceFt: null,
    });
    await logThrow({
      sessionId,
      holeId: holes[0].id,
      discId,
      throwType: 'Backhand',
      shotShape: 'Flat',
      result: 'OB',
      distanceFt: null,
    });
    await createSession({
      layoutId,
      sessionDate: '2026-04-24',
      mode: 'Tournament',
    });

    const stats = await loadStats();
    expect(stats.collection).toEqual({ total: 1, inBag: 1 });
    expect(stats.activity).toEqual({
      practiceSessions: 1,
      tournamentSessions: 1,
      throws: 2,
    });
    expect(stats.performance).toMatchObject({
      inCircle: 1,
      inCirclePct: 50,
      ob: 1,
      obPct: 50,
    });
    expect(stats.topDiscs).toHaveLength(1);
    expect(stats.topDiscs[0]).toMatchObject({
      id: discId,
      model: 'Destroyer',
      throws: 2,
    });
  });
});
