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
  type CourseWithLayouts,
  type Layout,
} from '../db/courses';
import { INBAG_GREEN, UI } from '../theme/colors';
import type { YouStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<YouStackParamList, 'CourseAdd'>;

const DEFAULT_HOLE_COUNT = 18;

// Same wizard pattern as PracticeStart / GamePlanStart so the player gets
// one consistent flow for adding a course no matter which entry point they
// came from. Typing surfaces existing courses as suggestions; picking one
// locks the location and offers its existing layouts. Skips the duplicate
// problem that the manual-add sheet had.
export function CourseAddScreen() {
  const navigation = useNavigation<Nav>();

  const [courses, setCourses] = useState<CourseWithLayouts[] | null>(null);

  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [matchedCourseId, setMatchedCourseId] = useState<number | null>(null);

  const [layoutName, setLayoutName] = useState('');
  const [matchedLayoutId, setMatchedLayoutId] = useState<number | null>(null);

  const [holeCount, setHoleCount] = useState<number>(DEFAULT_HOLE_COUNT);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCourses(await listCoursesWithLayouts());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    setLayoutName('');
    setMatchedLayoutId(null);
  };

  const handleCourseNameChange = (text: string) => {
    setCourseName(text);
    if (matchedCourseId !== null) {
      const m = courses?.find((c) => c.id === matchedCourseId);
      if (!m || m.name !== text) {
        setMatchedCourseId(null);
        setMatchedLayoutId(null);
      }
    }
  };

  const handlePickLayout = (l: Layout) => {
    setLayoutName(l.name);
    setMatchedLayoutId(l.id);
  };

  const handleLayoutNameChange = (text: string) => {
    setLayoutName(text);
    if (matchedLayoutId !== null) {
      const m = matchedCourse?.layouts.find((l) => l.id === matchedLayoutId);
      if (!m || m.name !== text) setMatchedLayoutId(null);
    }
  };

  const courseValid =
    courseName.trim().length > 0 && courseLocation.trim().length > 0;
  const layoutValid = layoutName.trim().length > 0;
  const holeCountValid =
    matchedLayoutId !== null || (Number.isInteger(holeCount) && holeCount >= 1);
  const canSave = !submitting && courseValid && layoutValid && holeCountValid;

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      const courseId =
        matchedCourseId ??
        (await findOrCreateCourse({
          name: courseName,
          location: courseLocation,
        }));
      if (matchedLayoutId === null) {
        await findOrCreateLayout({
          courseId,
          name: layoutName,
          holeCount,
        });
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save course');
      setSubmitting(false);
    }
  };

  if (courses === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Type a course you've played and pick from suggestions, or add a new
          one. Each course holds its own layouts.
        </Text>

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
                  <Text style={styles.suggestPrimary} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.suggestSecondary} numberOfLines={1}>
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
            <Text style={styles.hint}>
              Locked because you picked an existing course.
            </Text>
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
                  onPress={() => handlePickLayout(l)}
                >
                  <Text style={styles.suggestPrimary} numberOfLines={1}>
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

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          disabled={!canSave}
          onPress={handleSave}
        >
          <Text style={styles.saveLabel}>
            {submitting ? 'Saving…' : 'Save'}
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
  intro: {
    fontSize: 13,
    color: UI.textMuted,
    lineHeight: 18,
    marginBottom: -4,
  },
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
  suggestPrimary: { fontSize: 14, fontWeight: '600', color: UI.text },
  suggestSecondary: { fontSize: 12, color: UI.textMuted, marginTop: 1 },
  error: { color: UI.danger, fontSize: 14 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  saveBtn: {
    backgroundColor: INBAG_GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveLabel: { color: UI.textInverse, fontSize: 16, fontWeight: '700' },
});
