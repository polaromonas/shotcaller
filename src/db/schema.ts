import {
  DISC_CATEGORIES,
  RESULTS,
  SHOT_SHAPES,
  THROW_TYPES,
} from './types';

const quote = (values: readonly string[]) =>
  values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');

const DISC_CATEGORY_CHECK = `category IN (${quote(DISC_CATEGORIES)})`;
const THROW_TYPE_CHECK = `throw_type IN (${quote(THROW_TYPES)})`;
const SHOT_SHAPE_CHECK = `shot_shape IN (${quote(SHOT_SHAPES)})`;
const RESULT_CHECK = `result IN (${quote(RESULTS)})`;

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
  fade REAL
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

CREATE TABLE IF NOT EXISTS practice_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id INTEGER NOT NULL REFERENCES layout(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_practice_session_layout ON practice_session(layout_id);

CREATE TABLE IF NOT EXISTS throw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES practice_session(id) ON DELETE CASCADE,
  hole_id    INTEGER NOT NULL REFERENCES hole(id)             ON DELETE RESTRICT,
  disc_id    INTEGER NOT NULL REFERENCES disc(id)             ON DELETE RESTRICT,
  throw_type TEXT NOT NULL CHECK (${THROW_TYPE_CHECK}),
  shot_shape TEXT NOT NULL CHECK (${SHOT_SHAPE_CHECK}),
  result     TEXT NOT NULL CHECK (${RESULT_CHECK}),
  distance_from_basket_ft INTEGER,
  notes TEXT,
  CHECK (
    (result IN ('OB', 'Basket') AND distance_from_basket_ft IS NULL)
    OR (result NOT IN ('OB', 'Basket'))
  )
);
CREATE INDEX IF NOT EXISTS idx_throw_session ON throw(session_id);
CREATE INDEX IF NOT EXISTS idx_throw_hole ON throw(hole_id);
CREATE INDEX IF NOT EXISTS idx_throw_disc ON throw(disc_id);

CREATE TABLE IF NOT EXISTS game_plan_shot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id  INTEGER NOT NULL REFERENCES layout(id) ON DELETE CASCADE,
  hole_id    INTEGER NOT NULL REFERENCES hole(id)   ON DELETE RESTRICT,
  disc_id    INTEGER NOT NULL REFERENCES disc(id)   ON DELETE RESTRICT,
  throw_type TEXT NOT NULL CHECK (${THROW_TYPE_CHECK}),
  shot_shape TEXT NOT NULL CHECK (${SHOT_SHAPE_CHECK}),
  notes TEXT,
  is_manual_override INTEGER NOT NULL DEFAULT 0 CHECK (is_manual_override IN (0, 1)),
  UNIQUE (layout_id, hole_id)
);
CREATE INDEX IF NOT EXISTS idx_game_plan_shot_layout ON game_plan_shot(layout_id);
`;
