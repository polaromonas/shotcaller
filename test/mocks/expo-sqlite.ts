// Jest-only shim that makes src/db/* work against better-sqlite3 in-memory.
// Maps the subset of the expo-sqlite API actually used by the app.

import Database from 'better-sqlite3';
import type { Database as BSDatabase, Statement } from 'better-sqlite3';

type BindParams = Record<string, unknown> | unknown[] | undefined;

const stripDollarKeys = (params: BindParams): BindParams => {
  if (!params) return undefined;
  if (Array.isArray(params)) return params;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const key = k.startsWith('$') ? k.slice(1) : k;
    // better-sqlite3 does not accept undefined; map to null.
    out[key] = v === undefined ? null : v;
  }
  return out;
};

// better-sqlite3 returns `number | bigint` for lastInsertRowid; normalize.
const asNumber = (n: number | bigint): number =>
  typeof n === 'bigint' ? Number(n) : n;

class ShimStatement {
  constructor(private stmt: Statement) {}

  async executeAsync(params?: BindParams): Promise<{ lastInsertRowId: number }> {
    const bind = stripDollarKeys(params);
    const result = bind === undefined ? this.stmt.run() : this.stmt.run(bind);
    return { lastInsertRowId: asNumber(result.lastInsertRowid) };
  }

  async finalizeAsync(): Promise<void> {
    // better-sqlite3 finalizes on GC; noop.
  }
}

class ShimDatabase {
  constructor(public raw: BSDatabase) {}

  async execAsync(sql: string): Promise<void> {
    this.raw.exec(sql);
  }

  async runAsync(
    sql: string,
    params?: BindParams
  ): Promise<{ lastInsertRowId: number }> {
    const stmt = this.raw.prepare(sql);
    const bind = stripDollarKeys(params);
    const result = bind === undefined ? stmt.run() : stmt.run(bind);
    return { lastInsertRowId: asNumber(result.lastInsertRowid) };
  }

  async getFirstAsync<T = unknown>(
    sql: string,
    params?: BindParams
  ): Promise<T | null> {
    const stmt = this.raw.prepare(sql);
    const bind = stripDollarKeys(params);
    const row = bind === undefined ? stmt.get() : stmt.get(bind);
    return (row as T) ?? null;
  }

  async getAllAsync<T = unknown>(
    sql: string,
    params?: BindParams
  ): Promise<T[]> {
    const stmt = this.raw.prepare(sql);
    const bind = stripDollarKeys(params);
    const rows = bind === undefined ? stmt.all() : stmt.all(bind);
    return rows as T[];
  }

  async prepareAsync(sql: string): Promise<ShimStatement> {
    return new ShimStatement(this.raw.prepare(sql));
  }

  async withTransactionAsync(cb: () => Promise<void>): Promise<void> {
    this.raw.exec('BEGIN');
    try {
      await cb();
      this.raw.exec('COMMIT');
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }
}

const dbs = new Map<string, ShimDatabase>();

export async function openDatabaseAsync(name: string): Promise<ShimDatabase> {
  const existing = dbs.get(name);
  if (existing) return existing;
  const shim = new ShimDatabase(new Database(':memory:'));
  dbs.set(name, shim);
  return shim;
}

export async function deleteDatabaseAsync(name: string): Promise<void> {
  const existing = dbs.get(name);
  if (existing) existing.raw.close();
  dbs.delete(name);
}

// Re-export the type under the name the app imports as a type.
export type SQLiteDatabase = ShimDatabase;

// Allow tests to wipe state between runs.
export function __resetAllDatabases(): void {
  for (const shim of dbs.values()) shim.raw.close();
  dbs.clear();
}
