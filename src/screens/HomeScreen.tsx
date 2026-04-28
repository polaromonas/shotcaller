import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MODE, UI } from '../theme/colors';
import {
  getMostRecentSession,
  listOngoingSessions,
  type PracticeSessionWithContext,
} from '../db/sessions';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [lastSession, setLastSession] =
    useState<PracticeSessionWithContext | null>(null);
  const [ongoing, setOngoing] = useState<PracticeSessionWithContext[]>([]);

  const load = useCallback(async () => {
    const [last, active] = await Promise.all([
      getMostRecentSession(),
      listOngoingSessions(),
    ]);
    setLastSession(last);
    setOngoing(active);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>ShotCaller</Text>
          <Text style={styles.subtitle}>You call the shots.</Text>
        </View>

        {ongoing.map((s) => {
          const isTournament = s.mode === 'Tournament';
          const tint = isTournament ? MODE.tournament : MODE.practice;
          const bg = isTournament ? '#fff0f4' : '#eef3ff';
          return (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.resumeCard,
                { backgroundColor: bg, borderColor: tint },
                pressed && styles.pressed,
              ]}
              onPress={() =>
                navigation.navigate(
                  isTournament ? 'TournamentThrow' : 'PracticeThrow',
                  { sessionId: s.id, layoutId: s.layout_id }
                )
              }
            >
              <Text style={[styles.resumeLabel, { color: tint }]}>
                Resume {isTournament ? 'tournament' : 'practice'} round
              </Text>
              <Text style={styles.resumeTitle} numberOfLines={1}>
                {s.course_name} · {s.layout_name}
              </Text>
              <Text style={styles.resumeMeta}>
                {s.session_date} · {s.throw_count}{' '}
                {s.throw_count === 1 ? 'throw' : 'throws'} so far
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.modes}>
          <ModeCard
            label="Practice round"
            description="Log throws and build data"
            color={MODE.practice}
            onPress={() => navigation.navigate('PracticeStart')}
          />
          <ModeCard
            label="Game plan"
            description="Review recommendations, lock in"
            color={MODE.gamePlan}
            onPress={() => navigation.navigate('GamePlanStart')}
          />
          <ModeCard
            label="Tournament round"
            description="Execute the plan"
            color={MODE.tournament}
            onPress={() => navigation.navigate('TournamentStart')}
          />
        </View>

        {lastSession && (
          <View style={styles.lastSession}>
            <Text style={styles.lastSessionLabel}>
              Last {lastSession.mode === 'Tournament' ? 'tournament' : 'practice'}
            </Text>
            <Text style={styles.lastSessionTitle}>
              {lastSession.course_name} · {lastSession.layout_name}
            </Text>
            <Text style={styles.lastSessionMeta}>
              {lastSession.session_date} · {lastSession.throw_count}{' '}
              {lastSession.throw_count === 1 ? 'throw' : 'throws'} logged
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ModeCardProps = {
  label: string;
  description: string;
  color: string;
  onPress: () => void;
};

function ModeCard({ label, description, color, onPress }: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        { backgroundColor: color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.modeLabel}>{label}</Text>
      <Text style={styles.modeDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  content: { padding: 20, paddingTop: 24, gap: 24 },
  hero: { gap: 4 },
  title: { fontSize: 34, fontWeight: '700', color: UI.text },
  subtitle: { fontSize: 16, color: UI.textMuted },
  modes: { gap: 12 },
  modeCard: {
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  pressed: { opacity: 0.85 },
  modeLabel: { fontSize: 20, fontWeight: '700', color: UI.textInverse },
  modeDescription: { fontSize: 14, color: UI.textInverse, opacity: 0.9 },
  lastSession: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 2,
  },
  lastSessionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  lastSessionTitle: { fontSize: 16, fontWeight: '600', color: UI.text },
  lastSessionMeta: { fontSize: 13, color: UI.textMuted },
  resumeCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  resumeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resumeTitle: { fontSize: 18, fontWeight: '700', color: UI.text },
  resumeMeta: { fontSize: 13, color: UI.textMuted },
});
