import catalogData from './disc-catalog.json';
import type { DiscCategory } from '../db/types';

export type CatalogDisc = {
  model: string;
  manufacturer: string;
  category: DiscCategory;
  speed: number;
  glide: number;
  turn: number;
  fade: number;
};

// Cast once at the boundary; the JSON is shaped to match this type by
// scripts/fetch-disc-catalog.mjs.
export const DISC_CATALOG: readonly CatalogDisc[] = catalogData as CatalogDisc[];

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Returns up to `limit` catalog matches where the model contains the query
 * (case- and whitespace-insensitive). Manufacturer is also matched so users
 * who type "Innova D" find Innova Destroyer, etc. Empty query returns nothing.
 */
export function searchCatalog(query: string, limit = 6): CatalogDisc[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const startsWith: CatalogDisc[] = [];
  const contains: CatalogDisc[] = [];
  for (const d of DISC_CATALOG) {
    const model = normalize(d.model);
    const mfr = normalize(d.manufacturer);
    if (model.startsWith(q) || mfr.startsWith(q)) {
      startsWith.push(d);
    } else if (model.includes(q) || mfr.includes(q)) {
      contains.push(d);
    }
    if (startsWith.length >= limit) break;
  }
  return [...startsWith, ...contains].slice(0, limit);
}
