import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  findOrCreateCourse,
  findOrCreateLayout,
  listCoursesWithLayouts,
  listHoles,
  type CourseWithLayouts,
  type Layout,
} from '../db/courses';
import { listDiscs } from '../db/discs';
import {
  createSession,
  findActiveSession,
  todayIso,
} from '../db/sessions';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PracticeStart'>;

const DEFAULT_HOLE_COUNT = 18;

export function PracticeStartScreen() {
  const navigation = useNavigation<Nav>();

  const [courses, setCourses] = useState<CourseWithLayouts[] | null>(null);
  const [discCount, setDiscCount] = useState<number | null>(null);

  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [matchedCourseId, setMatchedCourseId] = useState<number | null>(null);

  const [layoutName, setLayoutName] = useState('');
  const [matchedLayoutId, setMatchedLayoutId] = useState<number | null>(null);
  const [matchedLayoutHoleCount, setMatchedLayoutHoleCount] = useState<number | null>(
    null
  );

  const [holeCount, setHoleCount] = useState<number>(DEFAULT_HOLE_COUNT);
  const [startHole, setStartHole] = useState<string>('1');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rows, discs] = await Promise.all([
      listCoursesWithLayouts(),
      listDiscs(),
    ]);
    setCourses(rows);
    setDiscCount(discs.length);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Course suggestions filtered by typed name OR location.
  const courseSuggestions = useMemo(() => {
    if (courses === null) return [];
    const q = courseName.trim().toLowerCase();
    const qLoc = courseLocation.trim().toLowerCase();
    if (q.length === 0 && qLoc.length === 0) return [];
    return courses
      .filter((c) => {
        if (matchedCourseId !== null && c.id === matchedCourseId) return false;
        const nameHit = q.length > 0 && c.name.toLowerCase().includes(q);
        const locHit = qLoc.length > 0 && c.location.toLowerCase().includes(qLoc);
        return q.length === 0 ? locHit : nameHit;
      })
      .slice(0, 6);
  }, [courses, courseName, courseLocation, matchedCourseId]);

  const matchedCourse = useMemo(
    () =>
      matchedCourseId !== null
        ? courses?.find((c) => c.id === matchedCourseId) ?? null
        : null,
    [courses, matchedCourseId]
  );

  // Layout suggestions only show after a course is matched.
  const layoutSuggestions = useMemo(() => {
    if (!matchedCourse) return [];
    const q = layoutName.trim().toLowerCase();
    if (q.length === 0) {
      return matchedCourse.layouts.filter((l) => l.id !== matchedLayoutId);
    }
    return matchedCourse.layouts
      .filter((l) => l.id !== matchedLayoutId)
      .filter((l) => l.name.toLowerCase().includes(q));
  }, [matchedCourse, layoutName, matchedLayoutId]);

  const handlePickCourse = (c: CourseWithLayouts) => {
    setCourseName(c.name);
    setCourseLocation(c.location);
    setMatchedCourseId(c.id);
    // Reset layout when switching course.
    setLayoutName('');
    setMatchedLayoutId(null);
    setMatchedLayoutHoleCount(null);
  };

  const handleCourseNameChange = (text: string) => {
    setCourseName(text);
    if (matchedCourseId !== null) {
      // User edited away from the matched course; back to "creating new".
      const m = courses?.find((c) => c.id === matchedCourseId);
      if (!m || m.name !== text) {
        setMatchedCourseId(null);
        setMatchedLayoutId(null);
        setMatchedLayoutHoleCount(null);
      }
    }
  };

  const handlePickLayout = async (l: Layout) => {
    setLayoutName(l.name);
    setMatchedLayoutId(l.id);
    const holes = await listHoles(l.id);
    setMatchedLayoutHoleCount(holes.length);
  };

  const handleLayoutNameChange = (text: string) => {
    setLayoutName(text);
    if (matchedLayoutId !== null) {
      const m = matchedCourse?.layouts.find((l) => l.id === matchedLayoutId);
      if (!m || m.name !== text) {
        setMatchedLayoutId(null);
        setMatchedLayoutHoleCount(null);
      }
    }
  };

  const effectiveHoleCount = matchedLayoutHoleCount ?? holeCount;

  const courseValid =
    courseName.trim().length > 0 && courseLocation.trim().length > 0;
  const layoutValid = layoutName.trim().length > 0;
  const startNum = Number(startHole);
  const startValid =
    Number.isInteger(startNum) &&
    startNum >= 1 &&
    startNum <= effectiveHoleCount;

  const canStart =
    !submitting &&
    discCount !== null &&
    discCount > 0 &&
    courseValid &&
    layoutValid &&
    startValid;

  const handleStart = async () => {
    if (!canStart) return;
    setSubmitting(true);
    setError(null);
    try {
      const courseId =
        matchedCourseId ??
        (await findOrCreateCourse({
          name: courseName,
          location: courseLocation,
        }));
      const layoutId =
        matchedLayoutId ??
        (await findOrCreateLayout({
          courseId,
          name: layoutName,
          holeCount,
        }));
      const today = todayIso();
      const existing = await findActiveSession({
        layoutId,
        sessionDate: today,
        mode: 'Practice',
      });
      const sessionId =
        existing ??
        (await createSession({
          layoutId,
          sessionDate: today,
          mode: 'Practice',
        }));
      navigation.replace('PracticeThrow', {
        sessionId,
        layoutId,
        initialHoleIdx: startNum - 1,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start round');
      setSubmitting(false);
    }
  };

  if (courses === null || discCount === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const noDiscs = discCount === 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {noDiscs && (
          <View style={styles.empty}>
            <Text style={styles.emptyBody}>
              Add at least one disc in the My discs tab before starting a
              practice round.
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Course</Text>
          <TextInput
            style={styles.input}
            value={courseName}
            onChangeText={handleCourseNameChange}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {courseSuggestions.length > 0 && (
            <View style={styles.suggestList}>
              {courseSuggestions.map((c) => (
                <Pressable
                  key={c.id}
                  style={({ pressed }) => [
                    styles.suggestRow,
                    pressed && styles.suggestRowPressed,
                  ]}
                  onPress={() => handlePickCourse(c)}
                >
                  <Text style={styles.suggestModel} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.suggestMeta} numberOfLines={1}>
                    {c.location}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={[styles.input, matchedCourseId !== null && styles.inputLocked]}
            value={courseLocation}
            onChangeText={setCourseLocation}
            editable={matchedCourseId === null}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {matchedCourseId !== null && (
            <Text style={styles.hint}>Locked because you picked an existing course.</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Layout</Text>
          <TextInput
            style={styles.input}
            value={layoutName}
            onChangeText={handleLayoutNameChange}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {layoutSuggestions.length > 0 && (
            <View style={styles.suggestList}>
              {layoutSuggestions.map((l) => (
                <Pressable
                  key={l.id}
                  style={({ pressed }) => [
                    styles.suggestRow,
                    pressed && styles.suggestRowPressed,
                  ]}
                  onPress={() => void handlePickLayout(l)}
                >
                  <Text style={styles.suggestModel} numberOfLines={1}>
                    {l.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {matchedLayoutId === null && (
          <View style={styles.field}>
            <Text style={styles.label}>Number of holes</Text>
            <TextInput
              style={[styles.input, styles.numericInput]}
              value={holeCount === 0 ? '' : String(holeCount)}
              onChangeText={(v) => {
                if (v === '') {
                  setHoleCount(0);
                  return;
                }
                const n = Number(v);
                if (Number.isInteger(n) && n >= 1 && n <= 27) setHoleCount(n);
              }}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="18"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Start at hole</Text>
          <TextInput
            style={[styles.input, styles.numericInput]}
            value={startHole}
            onChangeText={setStartHole}
            keyboardType="number-pad"
            maxLength={2}
          />
          {!startValid && startHole.trim().length > 0 && (
            <Text style={styles.hint}>
              Pick a hole between 1 and {effectiveHoleCount}.
            </Text>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          disabled={!canStart}
          onPress={handleStart}
        >
          <Text style={styles.startLabel}>
            {submitting ? 'Starting…' : 'Start practice round'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 18, paddingBottom: 40 },
  empty: {
    padding: 16,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  emptyBody: { fontSize: 14, color: UI.textMuted, lineHeight: 20 },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: UI.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  inputLocked: { opacity: 0.55 },
  numericInput: { width: 80, textAlign: 'center' },
  hint: { fontSize: 12, color: UI.textMuted },
  suggestList: {
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  suggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  suggestRowPressed: { backgroundColor: UI.bg },
  suggestModel: { fontSize: 14, fontWeight: '600', color: UI.text },
  suggestMeta: { fontSize: 12, color: UI.textMuted, marginTop: 1 },
  error: { color: UI.danger, fontSize: 14 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    backgroundColor: UI.bg,
  },
  startBtn: {
    backgroundColor: MODE.practice,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.4 },
  startLabel: { color: UI.textInverse, fontSize: 16, fontWeight: '700' },
});
