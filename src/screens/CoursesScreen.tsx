import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  createCourse,
  createLayoutWithHoles,
  listCoursesWithLayouts,
  type CourseWithLayouts,
  type Layout,
} from '../db/courses';
import { AddCourseSheet } from '../components/AddCourseSheet';
import { AddLayoutSheet } from '../components/AddLayoutSheet';
import { UI } from '../theme/colors';
import type { YouStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<YouStackParamList, 'CoursesList'>;

export function CoursesScreen() {
  const navigation = useNavigation<Nav>();
  const [courses, setCourses] = useState<CourseWithLayouts[] | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [courseSheetOpen, setCourseSheetOpen] = useState(false);
  const [layoutSheetFor, setLayoutSheetFor] = useState<CourseWithLayouts | null>(
    null
  );

  const refresh = useCallback(async () => {
    const rows = await listCoursesWithLayouts(search);
    setCourses(rows);
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isSearching = useMemo(() => search.trim().length > 0, [search]);

  const handleAddCourse = useCallback(
    async (input: { name: string; location: string }) => {
      await createCourse(input);
      await refresh();
    },
    [refresh]
  );

  const handleAddLayout = useCallback(
    async (course: CourseWithLayouts, input: { name: string; holeCount: number }) => {
      await createLayoutWithHoles({ courseId: course.id, ...input });
      await refresh();
      setExpandedId(course.id);
    },
    [refresh]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Courses</Text>
        <Pressable
          onPress={() => setCourseSheetOpen(true)}
          style={styles.addBtn}
          hitSlop={8}
          accessibilityLabel="Add course"
        >
          <Text style={styles.addBtnLabel}>+ Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search courses"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {courses === null ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {isSearching ? 'No matches' : 'No courses yet'}
          </Text>
          {!isSearching && (
            <>
              <Text style={styles.emptyBody}>
                Add the courses you practice on. Each course can have multiple
                layouts (Short, Long, Tournament).
              </Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => setCourseSheetOpen(true)}
              >
                <Text style={styles.emptyBtnLabel}>Add your first course</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <CourseRow
              course={item}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === item.id ? null : item.id))
              }
              onPickLayout={(layout) =>
                navigation.navigate('LayoutDetail', { layoutId: layout.id })
              }
              onAddLayout={() => setLayoutSheetFor(item)}
            />
          )}
        />
      )}

      <AddCourseSheet
        visible={courseSheetOpen}
        onClose={() => setCourseSheetOpen(false)}
        onSubmit={handleAddCourse}
      />
      <AddLayoutSheet
        visible={layoutSheetFor !== null}
        courseName={layoutSheetFor?.name ?? ''}
        onClose={() => setLayoutSheetFor(null)}
        onSubmit={(input) =>
          layoutSheetFor
            ? handleAddLayout(layoutSheetFor, input)
            : Promise.resolve()
        }
      />
    </SafeAreaView>
  );
}

type CourseRowProps = {
  course: CourseWithLayouts;
  expanded: boolean;
  onToggle: () => void;
  onPickLayout: (layout: Layout) => void;
  onAddLayout: () => void;
};

function CourseRow({
  course,
  expanded,
  onToggle,
  onPickLayout,
  onAddLayout,
}: CourseRowProps) {
  return (
    <View style={styles.courseWrap}>
      <Pressable onPress={onToggle} style={styles.courseHeader}>
        <View style={styles.courseText}>
          <Text style={styles.courseName} numberOfLines={1}>
            {course.name}
          </Text>
          <Text style={styles.courseMeta} numberOfLines={1}>
            {course.location} · {course.layouts.length}{' '}
            {course.layouts.length === 1 ? 'layout' : 'layouts'}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.layoutList}>
          {course.layouts.map((l) => (
            <Pressable
              key={l.id}
              style={styles.layoutRow}
              onPress={() => onPickLayout(l)}
            >
              <Text style={styles.layoutName}>{l.name}</Text>
              <Text style={styles.layoutChevron}>›</Text>
            </Pressable>
          ))}
          <Pressable style={styles.addLayoutBtn} onPress={onAddLayout}>
            <Text style={styles.addLayoutLabel}>+ Add layout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: UI.text },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  addBtnLabel: { fontSize: 14, fontWeight: '600', color: UI.text },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  searchInput: {
    backgroundColor: UI.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: UI.text },
  emptyBody: {
    fontSize: 14,
    color: UI.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: UI.text,
    borderRadius: 12,
  },
  emptyBtnLabel: { color: UI.textInverse, fontSize: 15, fontWeight: '600' },
  courseWrap: { borderBottomWidth: 1, borderBottomColor: UI.border },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  courseText: { flex: 1, minWidth: 0 },
  courseName: { fontSize: 16, fontWeight: '600', color: UI.text },
  courseMeta: { fontSize: 13, color: UI.textMuted, marginTop: 2 },
  chevron: { fontSize: 14, color: UI.textMuted, width: 16, textAlign: 'center' },
  layoutList: {
    backgroundColor: UI.surface,
    paddingBottom: 6,
  },
  layoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  layoutName: { fontSize: 15, color: UI.text },
  layoutChevron: { fontSize: 18, color: UI.textMuted },
  addLayoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  addLayoutLabel: { fontSize: 14, fontWeight: '600', color: UI.textMuted },
});
