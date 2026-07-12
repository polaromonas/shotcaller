import { DISC_CATEGORIES, DISC_SORTS } from './types';

const quote = (values: readonly string[]) =>
  values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');

const DISC_CATEGORY_CHECK = `category IN (${quote(DISC_CATEGORIES)})`;
const DISC_SORT_CHECK = `disc_sort IN (${quote(DISC_SORTS)})`;

// V2 schema. Practice logging, throws, stats, and the old game_plan_shot were
// removed in the V2 strip; the hole plan table lands in the next step. This is
// the disc/course/layout/hole foundation the V2 Plan/Play modes build on.
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS disc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT NOT NULL CHECK (${DISC_CATEGORY_CHECK}),
  in_bag INTEGER NOT NULL DEFAULT 0 CHECK (in_bag IN (0, 1)),
  speed REAL,
  glide REAL,
  turn REAL,
  fade REAL,
  plastic TEXT,
  nickname TEXT
);

CREATE TABLE IF NOT EXISTS tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS disc_tag (
  disc_id INTEGER NOT NULL REFERENCES disc(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tag(id)  ON DELETE CASCADE,
  PRIMARY KEY (disc_id, tag_id)
);

CREATE TABLE IF NOT EXISTS course (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS layout (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_layout_course ON layout(course_id);

CREATE TABLE IF NOT EXISTS hole (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id INTEGER NOT NULL REFERENCES layout(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL CHECK (par BETWEEN 2 AND 5),
  distance_ft INTEGER NOT NULL,
  UNIQUE (layout_id, hole_number)
);
CREATE INDEX IF NOT EXISTS idx_hole_layout ON hole(layout_id);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  disc_sort TEXT NOT NULL DEFAULT 'bag-order' CHECK (${DISC_SORT_CHECK})
);
INSERT OR IGNORE INTO app_settings (id, disc_sort) VALUES (1, 'bag-order');
`;
