import { getDb } from './index';

export type Course = {
  id: number;
  name: string;
  location: string;
};

export type Layout = {
  id: number;
  course_id: number;
  name: string;
};

export type Hole = {
  id: number;
  layout_id: number;
  hole_number: number;
  par: number;
  distance_ft: number;
};

export type CourseWithLayouts = Course & { layouts: Layout[] };

export async function listCoursesWithLayouts(
  search?: string
): Promise<CourseWithLayouts[]> {
  const db = await getDb();
  const term = search?.trim() ?? '';
  const courses = await (term.length > 0
    ? db.getAllAsync<Course>(
        `SELECT * FROM course
          WHERE name LIKE $q OR location LIKE $q
          ORDER BY name ASC`,
        { $q: `%${term}%` }
      )
    : db.getAllAsync<Course>('SELECT * FROM course ORDER BY name ASC'));

  if (courses.length === 0) return [];

  const layouts = await db.getAllAsync<Layout>(
    'SELECT * FROM layout ORDER BY name ASC'
  );
  const byCourse = new Map<number, Layout[]>();
  for (const l of layouts) {
    const list = byCourse.get(l.course_id) ?? [];
    list.push(l);
    byCourse.set(l.course_id, list);
  }
  return courses.map((c) => ({ ...c, layouts: byCourse.get(c.id) ?? [] }));
}

export async function createCourse(input: {
  name: string;
  location: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO course (name, location) VALUES ($name, $location)',
    {
      $name: input.name.trim(),
      $location: input.location.trim(),
    }
  );
  return result.lastInsertRowId;
}

export async function findOrCreateCourse(input: {
  name: string;
  location: string;
}): Promise<number> {
  const db = await getDb();
  const trimmedName = input.name.trim();
  const trimmedLocation = input.location.trim();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM course
      WHERE LOWER(name) = LOWER($name) AND LOWER(location) = LOWER($location)
      LIMIT 1`,
    { $name: trimmedName, $location: trimmedLocation }
  );
  if (existing) return existing.id;
  const result = await db.runAsync(
    'INSERT INTO course (name, location) VALUES ($name, $location)',
    { $name: trimmedName, $location: trimmedLocation }
  );
  return result.lastInsertRowId;
}

export async function findOrCreateLayout(input: {
  courseId: number;
  name: string;
  holeCount: number;
}): Promise<number> {
  const db = await getDb();
  const trimmedName = input.name.trim();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM layout
      WHERE course_id = $course_id AND LOWER(name) = LOWER($name)
      LIMIT 1`,
    { $course_id: input.courseId, $name: trimmedName }
  );
  if (existing) return existing.id;
  return createLayoutWithHoles({
    courseId: input.courseId,
    name: trimmedName,
    holeCount: input.holeCount,
  });
}

export type DeleteImpact = {
  sessions: number;
  throws: number;
  plannedHoles: number;
};

// Sessions, throws, and plan rows that would disappear if this layout were
// hard-deleted. Used to surface a clear confirmation before destroying data.
export async function getLayoutImpact(
  layoutId: number
): Promise<DeleteImpact> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    sessions: number;
    throws: number;
    planned_holes: number;
  }>(
    `SELECT
        (SELECT COUNT(*) FROM practice_session ps WHERE ps.layout_id = $id) AS sessions,
        (SELECT COUNT(*) FROM throw t
           JOIN hole h ON h.id = t.hole_id
          WHERE h.layout_id = $id) AS throws,
        (SELECT COUNT(*) FROM game_plan_shot g WHERE g.layout_id = $id) AS planned_holes
    `,
    { $id: layoutId }
  );
  return {
    sessions: row?.sessions ?? 0,
    throws: row?.throws ?? 0,
    plannedHoles: row?.planned_holes ?? 0,
  };
}

export async function getCourseImpact(
  courseId: number
): Promise<DeleteImpact & { layouts: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    layouts: number;
    sessions: number;
    throws: number;
    planned_holes: number;
  }>(
    `SELECT
        (SELECT COUNT(*) FROM layout l WHERE l.course_id = $id) AS layouts,
        (SELECT COUNT(*) FROM practice_session ps
           JOIN layout l ON l.id = ps.layout_id
          WHERE l.course_id = $id) AS sessions,
        (SELECT COUNT(*) FROM throw t
           JOIN hole h ON h.id = t.hole_id
           JOIN layout l ON l.id = h.layout_id
          WHERE l.course_id = $id) AS throws,
        (SELECT COUNT(*) FROM game_plan_shot g
           JOIN layout l ON l.id = g.layout_id
          WHERE l.course_id = $id) AS planned_holes
    `,
    { $id: courseId }
  );
  return {
    layouts: row?.layouts ?? 0,
    sessions: row?.sessions ?? 0,
    throws: row?.throws ?? 0,
    plannedHoles: row?.planned_holes ?? 0,
  };
}

// Hard delete: tear down sessions (and their throws via CASCADE), the saved
// game plan, holes, and the layout itself. The schema's RESTRICTs on
// throw.hole_id and practice_session.layout_id make a naive DELETE FROM
// layout fail; we sequence the wipe explicitly inside one transaction.
export async function deleteLayout(layoutId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await deleteLayoutInTxn(db, layoutId);
  });
}

async function deleteLayoutInTxn(
  db: Awaited<ReturnType<typeof getDb>>,
  layoutId: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM practice_session WHERE layout_id = $id',
    { $id: layoutId }
  );
  await db.runAsync(
    'DELETE FROM game_plan_shot WHERE layout_id = $id',
    { $id: layoutId }
  );
  await db.runAsync('DELETE FROM hole WHERE layout_id = $id', { $id: layoutId });
  await db.runAsync('DELETE FROM layout WHERE id = $id', { $id: layoutId });
}

export async function deleteCourse(courseId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const layouts = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM layout WHERE course_id = $id',
      { $id: courseId }
    );
    for (const l of layouts) {
      await deleteLayoutInTxn(db, l.id);
    }
    await db.runAsync('DELETE FROM course WHERE id = $id', { $id: courseId });
  });
}

export async function createLayoutWithHoles(input: {
  courseId: number;
  name: string;
  holeCount: number;
}): Promise<number> {
  const db = await getDb();
  const count = input.holeCount;
  if (!Number.isInteger(count) || count < 1 || count > 27) {
    throw new Error(`Invalid hole count: ${count}`);
  }

  let layoutId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO layout (course_id, name) VALUES ($course_id, $name)',
      {
        $course_id: input.courseId,
        $name: input.name.trim(),
      }
    );
    layoutId = result.lastInsertRowId;

    const stmt = await db.prepareAsync(
      `INSERT INTO hole (layout_id, hole_number, par, distance_ft)
       VALUES ($layout_id, $hole_number, $par, $distance_ft)`
    );
    try {
      for (let n = 1; n <= count; n++) {
        await stmt.executeAsync({
          $layout_id: layoutId,
          $hole_number: n,
          $par: 3,
          $distance_ft: 0,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
  return layoutId;
}

export async function getLayout(layoutId: number): Promise<Layout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Layout>(
    'SELECT * FROM layout WHERE id = $id',
    { $id: layoutId }
  );
  return row ?? null;
}

export async function listHoles(layoutId: number): Promise<Hole[]> {
  const db = await getDb();
  return db.getAllAsync<Hole>(
    'SELECT * FROM hole WHERE layout_id = $id ORDER BY hole_number ASC',
    { $id: layoutId }
  );
}

export async function updateHole(input: {
  id: number;
  par: number;
  distance_ft: number;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE hole SET par = $par, distance_ft = $distance_ft WHERE id = $id',
    {
      $par: input.par,
      $distance_ft: input.distance_ft,
      $id: input.id,
    }
  );
}

export async function renameLayout(
  layoutId: number,
  name: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE layout SET name = $name WHERE id = $id', {
    $name: name.trim(),
    $id: layoutId,
  });
}
