import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { countDiscs } from '../db/discs';
import {
  listPlayableLayouts,
  mostRecentlyPlayed,
  type PlayableLayout,
} from '../db/play';
import { FONT, MODE, SHELL } from '../theme/colors';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [resume, setResume] = useState<PlayableLayout | null>(null);
  const [discCount, setDiscCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [layouts, count] = await Promise.all([listPlayableLayouts(), countDiscs()]);
    setResume(mostRecentlyPlayed(layouts));
    setDiscCount(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openCourses = () => navigation.navigate('More', { screen: 'CoursesList' });
  const openPlay = () => navigation.navigate('More', { screen: 'PlayPicker' });
  const openBag = () => navigation.navigate('More', { screen: 'MyDiscs' });
  const openAbout = () => navigation.getParent()?.navigate('About');
  const resumeRound = () =>
    resume &&
    navigation.navigate('More', {
      screen: 'PlayLayout',
      params: { layoutId: resume.layoutId },
    });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>SHOTCALLER</Text>
          <Text style={styles.tagline}>You call the shots.</Text>
        </View>
        <Pressable onPress={openAbout} hitSlop={8}>
          <Text style={styles.about}>About</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {resume && (
          <Pressable style={styles.resume} onPress={resumeRound}>
            <Text style={styles.resumeLabel}>RESUME ROUND</Text>
            <Text style={styles.resumeTitle} numberOfLines={1}>
              {resume.courseName} · {resume.layoutName}
            </Text>
            <View style={styles.resumeRow}>
              <Text style={styles.resumeMeta}>
                On hole {resume.lastHole} of {resume.holeCount}
              </Text>
              <View style={styles.resumeBtn}>
                <Text style={styles.resumeBtnLabel}>PLAY ›</Text>
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
            <Text style={styles.tileLabel}>PLAN</Text>
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
            <Text style={styles.tileLabel}>PLAY</Text>
            <View>
              <Text style={styles.tileDesc}>Read your plan on the tee. One glance, one throw.</Text>
              <Text style={styles.tileLink}>Pick a layout ›</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.bagCard} onPress={openBag}>
          <Text style={styles.bagLabel}>My Bag</Text>
          <Text style={styles.bagMeta}>
            {discCount === null ? '' : `${discCount} ${discCount === 1 ? 'disc' : 'discs'} ›`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHELL.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  wordmark: { fontFamily: FONT.bc800, fontSize: 30, letterSpacing: 0.5, color: SHELL.text },
  tagline: { fontFamily: FONT.b500, fontSize: 14, color: SHELL.textMuted, marginTop: -2 },
  about: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textSecondary },
  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  resume: {
    backgroundColor: MODE.play,
    borderRadius: 16,
    padding: 16,
    gap: 2,
  },
  resumeLabel: { fontFamily: FONT.bc700, fontSize: 12, letterSpacing: 1.2, color: 'rgba(255,255,255,0.85)' },
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
  tileLink: { fontFamily: FONT.bc700, fontSize: 15, letterSpacing: 0.5, color: '#fff', marginTop: 8 },
  bagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  bagLabel: { fontFamily: FONT.bc700, fontSize: 17, color: SHELL.text },
  bagMeta: { fontFamily: FONT.b600, fontSize: 14, color: SHELL.textMuted },
});
