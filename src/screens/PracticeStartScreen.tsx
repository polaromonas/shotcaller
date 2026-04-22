import { useCallback, useEffect, useState } from 'react';
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
  listCoursesWithLayouts,
  type CourseWithLayouts,
  type Layout,
} from '../db/courses';
import {
  createSession,
  findActiveSession,
  listActiveSessionsByLayout,
  todayIso,
} from '../db/sessions';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PracticeStart'>;

export function PracticeStartScreen() {
  const navigation = useNavigation<Nav>();
  const [courses, setCourses] = useState<CourseWithLayouts[] | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [sessionDate] = useState<string>(todayIso());
  const [notes, setNotes] = useState('');
  const [activeByLayout, setActiveByLayout] = useState<Map<number, number>>(
    new Map()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rows, active] = await Promise.all([
      listCoursesWithLayouts(),
      listActiveSessionsByLayout({
        sessionDate: todayIso(),
        mode: 'Practice',
      }),
    ]);
    setCourses(rows);
    setActiveByLayout(active);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStart = async () => {
    if (selectedLayoutId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const existing = await findActiveSession({
        layoutId: selectedLayoutId,
        sessionDate,
        mode: 'Practice',
      });
      const sessionId =
        existing ??
        (await createSession({
          layoutId: selectedLayoutId,
          sessionDate,
          mode: 'Practice',
          notes,
        }));
      navigation.replace('PracticeThrow', {
        sessionId,
        layoutId: selectedLayoutId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
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

  const layoutsExist = courses.some((c) => c.layouts.length > 0);
  const isResuming =
    selectedLayoutId !== null && activeByLayout.has(selectedLayoutId);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dateRow}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Text style={styles.dateValue}>{sessionDate}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Layout</Text>
          {!layoutsExist ? (
            <View style={styles.empty}>
              <Text style={styles.emptyBody}>
                Add a course and a layout in the Courses tab before starting a
                practice round.
              </Text>
            </View>
          ) : (
            <View style={styles.layoutList}>
              {courses.flatMap((course) =>
                course.layouts.map((layout) => (
                  <LayoutRow
                    key={layout.id}
                    course={course}
                    layout={layout}
                    selected={selectedLayoutId === layout.id}
                    inProgress={activeByLayout.has(layout.id)}
                    onSelect={() => setSelectedLayoutId(layout.id)}
                  />
                ))
              )}
            </View>
          )}
        </View>

        {!isResuming && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it feel, wind, etc."
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.startBtn,
            (selectedLayoutId === null || submitting) && styles.startBtnDisabled,
          ]}
          disabled={selectedLayoutId === null || submitting}
          onPress={handleStart}
        >
          <Text style={styles.startBtnLabel}>
            {submitting
              ? 'Starting…'
              : isResuming
              ? "Resume today's round"
              : 'Start practice round'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

type LayoutRowProps = {
  course: CourseWithLayouts;
  layout: Layout;
  selected: boolean;
  inProgress: boolean;
  onSelect: () => void;
};

function LayoutRow({
  course,
  layout,
  selected,
  inProgress,
  onSelect,
}: LayoutRowProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.layoutRow, selected && styles.layoutRowOn]}
    >
      <View style={styles.layoutText}>
        <View style={styles.layoutNameRow}>
          <Text
            style={[styles.layoutName, selected && styles.layoutNameOn]}
            numberOfLines={1}
          >
            {layout.name}
          </Text>
          {inProgress && (
            <View style={styles.inProgressTag}>
              <Text style={styles.inProgressTagLabel}>Today</Text>
            </View>
          )}
        </View>
        <Text style={styles.layoutCourse} numberOfLines={1}>
          {course.name} · {course.location}
        </Text>
      </View>
      {selected && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 20, paddingBottom: 32 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  dateValue: { fontSize: 15, fontWeight: '600', color: UI.text },
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  empty: {
    padding: 16,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  emptyBody: { fontSize: 14, color: UI.textMuted, lineHeight: 20 },
  layoutList: { gap: 8 },
  layoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  layoutRowOn: {
    backgroundColor: '#eef3ff',
    borderColor: MODE.practice,
  },
  layoutText: { flex: 1, minWidth: 0, gap: 2 },
  layoutNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  layoutName: { fontSize: 16, fontWeight: '600', color: UI.text },
  layoutNameOn: { color: MODE.practice },
  layoutCourse: { fontSize: 12, color: UI.textMuted },
  inProgressTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: MODE.practice,
  },
  inProgressTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: UI.textInverse,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  check: { fontSize: 18, color: MODE.practice, fontWeight: '700' },
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
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
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
  startBtnLabel: { color: UI.textInverse, fontSize: 16, fontWeight: '700' },
});
