import {
  DISC_CATEGORIES,
  DISC_WEIGHT_MAX_G,
  DISC_WEIGHT_MIN_G,
  DISC_SORTS,
  OVERHAND_SHOT_SHAPES,
  SHOT_SHAPES,
  THROW_TYPES,
} from './types';

const quote = (values: readonly string[]) =>
  values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');

const DISC_CATEGORY_CHECK = `category IN (${quote(DISC_CATEGORIES)})`;
const DISC_SORT_CHECK = `disc_sort IN (${quote(DISC_SORTS)})`;
// Exported so migrate() adds the column with the same constraint.
export const DISC_WEIGHT_CHECK = `weight_g IS NULL OR weight_g BETWEEN ${DISC_WEIGHT_MIN_G} AND ${DISC_WEIGHT_MAX_G}`;
// hole_plan enums are nullable (progressive authoring). A SQL CHECK passes on
// NULL — `NULL IN (...)` is NULL, not false — so these constants work as-is for
// the nullable columns.
const THROW_TYPE_CHECK = `throw_type IN (${quote(THROW_TYPES)})`;

// The built-in shot shapes seed the extensible `shape` table. Shapes are NOT a
// fixed enum any more — users add their own — so hole_plan.shot_shape is free
// TEXT (throw_type and disc category stay fixed enums). is_overhand drives the
// Thumber/Tomahawk → Overhand lock; is_builtin protects the 9 from deletion.
const SHAPE_SEED = SHOT_SHAPES.map(
  (name, i) =>
    `('${name.replace(/'/g, "''")}', ${
      OVERHAND_SHOT_SHAPES.includes(name) ? 1 : 0
    }, 1, ${i + 1})`
).join(', ');

// The full schema: discs and tags, courses → layouts → holes, the per-hole plan,
// per-layout play position, user shot shapes, and app settings.
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
  nickname TEXT,
  weight_g INTEGER CHECK (${DISC_WEIGHT_CHECK})
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

-- One plan per hole (UNIQUE hole_id). Every plan field is nullable so a player
-- can jot part of a plan (e.g. an aim note) before committing a disc — a hole
-- counts as "planned" if a row exists. disc_id is ON DELETE SET NULL so
-- deleting a disc clears it from any plans while the rest of each plan stays.
CREATE TABLE IF NOT EXISTS hole_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id  INTEGER NOT NULL REFERENCES layout(id) ON DELETE CASCADE,
  hole_id    INTEGER NOT NULL REFERENCES hole(id)   ON DELETE CASCADE,
  disc_id    INTEGER REFERENCES disc(id) ON DELETE SET NULL,
  throw_type TEXT CHECK (${THROW_TYPE_CHECK}),
  shot_shape TEXT,
  aim_note   TEXT,
  needs_review INTEGER NOT NULL DEFAULT 0 CHECK (needs_review IN (0, 1)),
  review_note  TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (hole_id)
);
CREATE INDEX IF NOT EXISTS idx_hole_plan_layout ON hole_plan(layout_id);

-- Play-mode resume: the hole a player last viewed on a layout, so Play reopens
-- exactly where they left off after bouncing back from their scorekeeping app.
-- One row per layout. updated_at also drives "most recently played" for Home.
CREATE TABLE IF NOT EXISTS play_state (
  layout_id   INTEGER PRIMARY KEY REFERENCES layout(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Shot shapes shown in the Plan-a-hole chip row. Seeded with the 9 built-ins;
-- users add their own (is_builtin = 0), which persist and can be deleted.
CREATE TABLE IF NOT EXISTS shape (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_overhand INTEGER NOT NULL DEFAULT 0 CHECK (is_overhand IN (0, 1)),
  is_builtin  INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 100
);
INSERT OR IGNORE INTO shape (name, is_overhand, is_builtin, sort_order) VALUES ${SHAPE_SEED};

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  disc_sort TEXT NOT NULL DEFAULT 'bag-order' CHECK (${DISC_SORT_CHECK}),
  bag_color TEXT
);
INSERT OR IGNORE INTO app_settings (id, disc_sort) VALUES (1, 'bag-order');
`;
