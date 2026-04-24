import { getDb } from './index';
import type { DiscCategory, ResultKind } from './types';

export type CollectionStats = {
  total: number;
  inBag: number;
};

export type ActivityStats = {
  practiceSessions: number;
  tournamentSessions: number;
  throws: number;
};

export type PerformanceStats = {
  inCircle: number;
  inCirclePct: number;
  fairway: number;
  fairwayPct: number;
  rough: number;
  roughPct: number;
  ob: number;
  obPct: number;
};

export type TopDisc = {
  id: number;
  manufacturer: string;
  model: string;
  color: string;
  category: DiscCategory;
  throws: number;
};

export type Stats = {
  collection: CollectionStats;
  activity: ActivityStats;
  performance: PerformanceStats | null;
  topDiscs: TopDisc[];
};

const IN_CIRCLE_RESULTS: readonly ResultKind[] = ['Basket', 'C1', 'C2'];

export async function loadStats(): Promise<Stats> {
  const db = await getDb();

  const collectionRow = await db.getFirstAsync<{ total: number; in_bag: number }>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(in_bag), 0) AS in_bag FROM disc"
  );

  const sessionRows = await db.getAllAsync<{ mode: string; count: number }>(
    "SELECT mode, COUNT(*) AS count FROM practice_session GROUP BY mode"
  );
  const sessionCounts = new Map(sessionRows.map((r) => [r.mode, r.count]));

  const throwTotalRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM throw"
  );
  const throws = throwTotalRow?.count ?? 0;

  const resultRows = await db.getAllAsync<{ result: ResultKind; count: number }>(
    "SELECT result, COUNT(*) AS count FROM throw GROUP BY result"
  );

  let performance: PerformanceStats | null = null;
  if (throws > 0) {
    const byResult = new Map(resultRows.map((r) => [r.result, r.count]));
    const inCircle =
      IN_CIRCLE_RESULTS.reduce((sum, r) => sum + (byResult.get(r) ?? 0), 0);
    const fairway = byResult.get('Fairway') ?? 0;
    const rough = byResult.get('Rough') ?? 0;
    const ob = byResult.get('OB') ?? 0;
    const pct = (n: number) => Math.round((n / throws) * 100);
    performance = {
      inCircle,
      inCirclePct: pct(inCircle),
      fairway,
      fairwayPct: pct(fairway),
      rough,
      roughPct: pct(rough),
      ob,
      obPct: pct(ob),
    };
  }

  const topDiscs = await db.getAllAsync<TopDisc>(
    `SELECT d.id, d.manufacturer, d.model, d.color, d.category,
            COUNT(*) AS throws
       FROM throw t
       JOIN disc d ON d.id = t.disc_id
      GROUP BY d.id
      ORDER BY throws DESC, d.model ASC
      LIMIT 5`
  );

  return {
    collection: {
      total: collectionRow?.total ?? 0,
      inBag: collectionRow?.in_bag ?? 0,
    },
    activity: {
      practiceSessions: sessionCounts.get('Practice') ?? 0,
      tournamentSessions: sessionCounts.get('Tournament') ?? 0,
      throws,
    },
    performance,
    topDiscs,
  };
}
