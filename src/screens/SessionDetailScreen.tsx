import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getSession,
  type PracticeSessionWithContext,
} from '../db/sessions';
import { listHoles, type Hole } from '../db/courses';
import {
  listThrowsForSession,
  type ThrowWithDisc,
} from '../db/throws';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SessionDetail'>;
type Rt = RouteProp<RootStackParamList, 'SessionDetail'>;

const IN_CIRCLE = new Set(['Basket', 'C1', 'C2']);

export function SessionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { sessionId } = route.params;

  const [session, setSession] = useState<PracticeSessionWithContext | null>(
    null
  );
  const [holes, setHoles] = useState<Hole[]>([]);
  const [throws, setThrows] = useState<ThrowWithDisc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getSession(sessionId);
    if (!s) {
      setSession(null);
      setLoading(false);
      return;
    }
    const [hs, ts] = await Promise.all([
      listHoles(s.layout_id),
      listThrowsForSession(sessionId),
    ]);
    setSession(s);
    setHoles(hs);
    setThrows(ts);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResume = () => {
    if (!session) return;
    navigation.replace(
      session.mode === 'Tournament' ? 'TournamentThrow' : 'PracticeThrow',
      { sessionId: session.id, layoutId: session.layout_id }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isTournament = session.mode === 'Tournament';
  const tint = isTournament ? MODE.tournament : MODE.practice;
  const isOngoing = session.completed_at === null;

  const inCircle = throws.filter((t) => IN_CIRCLE.has(t.result)).length;
  const ob = throws.filter((t) => t.result === 'OB').length;
  const inCirclePct =
    throws.length > 0 ? Math.round((inCircle / throws.length) * 100) : 0;

  const throwsByHole = new Map<number, ThrowWithDisc[]>();
  for (const t of throws) {
    const list = throwsByHole.get(t.hole_id) ?? [];
    list.push(t);
    throwsByHole.set(t.hole_id, list);
  }
  const holesWithThrows = holes.filter((h) => throwsByHole.has(h.id));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <View style={[styles.modeBadge, { backgroundColor: tint }]}>
          <Text style={styles.modeBadgeLabel}>
            {isTournament ? 'Tournament' : 'Practice'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title} numberOfLines={2}>
            {session.name ?? `${session.course_name} · ${session.layout_name}`}
          </Text>
          {session.name && (
            <Text style={styles.subtitle}>
              {session.course_name} · {session.layout_name}
            </Text>
          )}
          <Text style={styles.subtitle}>
            {session.session_date} ·{' '}
            {isOngoing ? 'Ongoing' : 'Finished'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat value={String(throws.length)} label="throws" />
          <Stat
            value={throws.length > 0 ? `${inCirclePct}%` : '—'}
            label="in-circle"
          />
          <Stat value={String(ob)} label="OB" />
          <Stat value={String(holesWithThrows.length)} label="holes" />
        </View>

        {isOngoing && (
          <Pressable
            style={[styles.continueBtn, { backgroundColor: tint }]}
            onPress={handleResume}
          >
            <Text style={styles.continueLabel}>
              Continue this round
            </Text>
          </Pressable>
        )}

        {holesWithThrows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No throws yet</Text>
            <Text style={styles.emptyBody}>
              {isOngoing
                ? 'Continue this round to start logging throws.'
                : 'This session was finished without any throws logged.'}
            </Text>
          </View>
        ) : (
          holesWithThrows.map((h) => {
            const ts = throwsByHole.get(h.id) ?? [];
            return (
              <View key={h.id} style={styles.holeCard}>
                <View style={styles.holeHeader}>
                  <Text style={styles.holeTitle}>
                    Hole {h.hole_number} · Par {h.par}
                  </Text>
                  <Text style={styles.holeMeta}>
                    {h.distance_ft > 0 ? `${h.distance_ft} ft` : '—'} ·{' '}
                    {ts.length} {ts.length === 1 ? 'throw' : 'throws'}
                  </Text>
                </View>
                {ts.map((t) => (
                  <View key={t.id} style={styles.throwRow}>
                    <View
                      style={[
                        styles.discSwatch,
                        { backgroundColor: t.disc_color },
                      ]}
                    />
                    <View style={styles.throwText}>
                      <Text style={styles.throwTitle} numberOfLines={1}>
                        {t.disc_nickname || t.disc_model} · {t.shot_shape}
                      </Text>
                      <Text style={styles.throwMeta} numberOfLines={1}>
                        {t.throw_type} · {t.result}
                        {t.distance_from_basket_ft !== null
                          ? ` · ${t.distance_from_basket_ft} ft`
                          : ''}
                      </Text>
                      {t.tags.length > 0 && (
                        <View style={styles.throwTagsRow}>
                          {t.tags.map((tag) => (
                            <View key={tag.id} style={styles.throwTagChip}>
                              <Text style={styles.throwTagLabel}>
                                {tag.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {t.notes && (
                        <Text style={styles.throwNotes} numberOfLines={3}>
                          {t.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  back: { fontSize: 16, color: UI.textMuted },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modeBadgeLabel: {
    color: UI.textInverse,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', color: UI.text },
  subtitle: { fontSize: 13, color: UI.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: UI.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: UI.text },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  continueBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueLabel: {
    color: UI.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 4,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: UI.text },
  emptyBody: { fontSize: 13, color: UI.textMuted, textAlign: 'center' },
  holeCard: {
    backgroundColor: UI.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
    gap: 8,
  },
  holeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  holeTitle: { fontSize: 15, fontWeight: '700', color: UI.text },
  holeMeta: { fontSize: 12, color: UI.textMuted },
  throwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  discSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: UI.border,
  },
  throwText: { flex: 1, minWidth: 0 },
  throwTitle: { fontSize: 14, fontWeight: '600', color: UI.text },
  throwMeta: { fontSize: 12, color: UI.textMuted, marginTop: 2 },
  throwTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  throwTagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: UI.bg,
    borderWidth: 1,
    borderColor: UI.border,
  },
  throwTagLabel: { fontSize: 10, fontWeight: '600', color: UI.textMuted },
  throwNotes: {
    fontSize: 12,
    color: UI.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
