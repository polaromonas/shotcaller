import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  listPlayableLayouts,
  mostRecentlyPlayed,
  type PlayableLayout,
} from '../db/play';
import { FONT, MODE, SHELL } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlayPicker'>;

export function PlayPickerScreen() {
  const navigation = useNavigation<Nav>();
  const [layouts, setLayouts] = useState<PlayableLayout[] | null>(null);

  const load = useCallback(async () => {
    setLayouts(await listPlayableLayouts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const goHome = () => navigation.goBack();
  const play = (layoutId: number) => navigation.navigate('PlayLayout', { layoutId });
  const plan = (layoutId: number) => navigation.navigate('LayoutDetail', { layoutId });

  const resume = layouts ? mostRecentlyPlayed(layouts) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goHome} hitSlop={10}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>PLAY</Text>
        </View>
      </View>

      {layouts === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={MODE.play} />
        </View>
      ) : layouts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No layouts yet</Text>
          <Text style={styles.emptyBody}>Add a course and a layout to play.</Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('CoursesList')}
          >
            <Text style={styles.emptyBtnLabel}>Go to Courses</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>PICK A LAYOUT</Text>

          {resume && (
            <Pressable style={styles.resume} onPress={() => play(resume.layoutId)}>
              <Text style={styles.resumeLabel}>
                RESUME — YOU WERE ON HOLE {resume.lastHole}
              </Text>
              <Text style={styles.resumeTitle} numberOfLines={1}>
                {resume.courseName} · {resume.layoutName}
              </Text>
              <View style={styles.resumeRow}>
                <Text style={styles.resumeMeta}>
                  {resume.plannedCount}/{resume.holeCount} planned
                </Text>
                <View style={styles.resumeBtn}>
                  <Text style={styles.resumeBtnLabel}>RESUME ›</Text>
                </View>
              </View>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>ALL LAYOUTS — MOST PLANNED FIRST</Text>

          {layouts.map((l) => {
            const planned = l.plannedCount > 0;
            const pct = l.holeCount > 0 ? l.plannedCount / l.holeCount : 0;
            return (
              <View key={l.layoutId} style={[styles.row, !planned && styles.rowEmpty]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {l.layoutName}
                  </Text>
                  <Text style={styles.rowCourse} numberOfLines={1}>
                    {l.courseName}
                  </Text>
                  {planned ? (
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
                      </View>
                      <Text style={styles.progressLabel}>
                        {l.plannedCount}/{l.holeCount}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noPlan}>No plan yet</Text>
                  )}
                </View>
                {planned ? (
                  <Pressable style={styles.playBtn} onPress={() => play(l.layoutId)}>
                    <Text style={styles.playLabel}>PLAY ›</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.planBtn} onPress={() => plan(l.layoutId)}>
                    <Text style={styles.planLabel}>PLAN IT ›</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHELL.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  back: { fontFamily: FONT.b600, fontSize: 16, color: SHELL.textSecondary },
  badge: {
    backgroundColor: MODE.play,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeLabel: { fontFamily: FONT.bc700, fontSize: 13, letterSpacing: 1.5, color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontFamily: FONT.bc800, fontSize: 24, color: SHELL.text },
  emptyBody: { fontFamily: FONT.b500, fontSize: 14, color: SHELL.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: MODE.plan,
  },
  emptyBtnLabel: { fontFamily: FONT.bc700, fontSize: 14, color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  title: { fontFamily: FONT.bc800, fontSize: 30, color: SHELL.text, marginBottom: 4 },
  resume: {
    backgroundColor: MODE.play,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  resumeLabel: { fontFamily: FONT.bc700, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.85)' },
  resumeTitle: { fontFamily: FONT.bc800, fontSize: 22, color: '#fff' },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  resumeMeta: { fontFamily: FONT.b600, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  resumeBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  resumeBtnLabel: { fontFamily: FONT.bc800, fontSize: 14, color: MODE.play },
  sectionLabel: {
    fontFamily: FONT.bc700,
    fontSize: 12,
    letterSpacing: 1.4,
    color: SHELL.textMuted,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  rowEmpty: {
    backgroundColor: 'transparent',
    borderColor: SHELL.dashed,
    borderStyle: 'dashed',
  },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontFamily: FONT.bc700, fontSize: 18, color: SHELL.text },
  rowCourse: { fontFamily: FONT.b500, fontSize: 13, color: SHELL.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: SHELL.border,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: MODE.play },
  progressLabel: { fontFamily: FONT.bc700, fontSize: 13, color: SHELL.textSecondary },
  noPlan: { fontFamily: FONT.b500, fontSize: 13, color: SHELL.textFaint, marginTop: 2 },
  playBtn: { backgroundColor: MODE.play, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  playLabel: { fontFamily: FONT.bc800, fontSize: 15, color: '#fff' },
  planBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MODE.plan,
  },
  planLabel: { fontFamily: FONT.bc700, fontSize: 14, color: MODE.plan },
});
