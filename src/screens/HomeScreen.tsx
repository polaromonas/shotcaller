import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { countDiscs } from '../db/discs';
import {
  clearPlayState,
  listPlayableLayouts,
  mostRecentlyPlayed,
  type PlayableLayout,
} from '../db/play';
import { getBagColor } from '../db/settings';
import { confirmAction } from '../util/confirm';
import { FONT, MODE, SHELL } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [resume, setResume] = useState<PlayableLayout | null>(null);
  const [discCount, setDiscCount] = useState<number | null>(null);
  const [bagColor, setBagColor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [layouts, count, color] = await Promise.all([
      listPlayableLayouts(),
      countDiscs(),
      getBagColor(),
    ]);
    setResume(mostRecentlyPlayed(layouts));
    setDiscCount(count);
    setBagColor(color);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openCourses = () => navigation.navigate('CoursesList');
  const openPlay = () => navigation.navigate('PlayPicker');
  const openBag = () => navigation.navigate('MyDiscs');
  const openAbout = () => navigation.navigate('About');
  const resumeRound = () =>
    resume && navigation.navigate('PlayLayout', { layoutId: resume.layoutId });

  const endRound = (layoutId: number) =>
    confirmAction({
      title: 'End this round?',
      message: "You'll start fresh next time you play it. Your plan stays.",
      confirmLabel: 'End round',
      destructive: true,
      onConfirm: async () => {
        await clearPlayState(layoutId);
        await load();
      },
    });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.wordmark}>ShotCaller</Text>
          <Text style={styles.tagline}>You call the shots.</Text>
        </View>

        <Pressable
          style={styles.bagBtn}
          onPress={openBag}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            discCount === null ? 'My Bag' : `My Bag, ${discCount} discs`
          }
        >
          <View
            style={[
              styles.bagDot,
              bagColor ? { backgroundColor: bagColor, borderColor: bagColor } : null,
            ]}
          />
          <Text style={styles.bagBtnLabel}>My Bag</Text>
          {discCount !== null && <Text style={styles.bagBtnCount}>{discCount}</Text>}
        </Pressable>
      </View>

      <View style={styles.body}>
        {resume && (
          <Pressable style={styles.resume} onPress={resumeRound}>
            <View style={styles.resumeTop}>
              <Text style={styles.resumeLabel}>Resume round</Text>
              <Pressable
                onPress={() => endRound(resume.layoutId)}
                hitSlop={12}
                accessibilityLabel="End round"
              >
                <Text style={styles.resumeDismiss}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.resumeTitle} numberOfLines={1}>
              {resume.courseName} · {resume.layoutName}
            </Text>
            <View style={styles.resumeRow}>
              <Text style={styles.resumeMeta}>
                On hole {resume.lastHole} of {resume.holeCount}
              </Text>
              <View style={styles.resumeBtn}>
                <Text style={styles.resumeBtnLabel}>Play ›</Text>
              </View>
            </View>
          </Pressable>
        )}

        <Pressable style={styles.tileWrap} onPress={openCourses}>
          <LinearGradient
            colors={['#5B4FC7', '#4A3FA8']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.tile}
          >
            <Text style={styles.tileLabel}>Plan</Text>
            <View>
              <Text style={styles.tileDesc}>Build a hole-by-hole game plan at home.</Text>
              <Text style={styles.tileLink}>Open courses ›</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.tileWrap} onPress={openPlay}>
          <LinearGradient
            colors={['#0E8C8C', '#0A6E6E']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.tile}
          >
            <Text style={styles.tileLabel}>Play</Text>
            <View>
              <Text style={styles.tileDesc}>Read your plan on the tee. One glance, one throw.</Text>
              <Text style={styles.tileLink}>Pick a layout ›</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={openAbout} hitSlop={8} style={styles.aboutLink}>
          <Text style={styles.aboutLabel}>About ShotCaller</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHELL.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerText: { flexShrink: 1 },
  wordmark: { fontFamily: FONT.bc800, fontSize: 30, color: SHELL.text },
  tagline: { fontFamily: FONT.b500, fontSize: 14, color: SHELL.textMuted, marginTop: -2 },
  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  resume: {
    backgroundColor: MODE.play,
    borderRadius: 16,
    padding: 16,
    gap: 2,
  },
  resumeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumeLabel: { fontFamily: FONT.bc700, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  resumeDismiss: { fontSize: 16, color: 'rgba(255,255,255,0.75)' },
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
  tileWrap: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  tile: { flex: 1, padding: 22, justifyContent: 'space-between' },
  tileLabel: { fontFamily: FONT.bc800, fontSize: 40, color: '#fff' },
  tileDesc: { fontFamily: FONT.b500, fontSize: 15, color: 'rgba(255,255,255,0.92)' },
  tileLink: { fontFamily: FONT.bc700, fontSize: 15, color: '#fff', marginTop: 8 },
  // Neutral pill — the bag is not a mode surface, so it never takes a mode
  // color. The user's bag color rides on the dot only.
  bagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  bagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: SHELL.dashed,
  },
  bagBtnLabel: { fontFamily: FONT.bc700, fontSize: 15, color: SHELL.text },
  bagBtnCount: { fontFamily: FONT.b600, fontSize: 13, color: SHELL.textMuted },
  aboutLink: { alignSelf: 'center', paddingVertical: 4 },
  aboutLabel: { fontFamily: FONT.b500, fontSize: 13, color: SHELL.textFaint },
});
