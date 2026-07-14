import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getLayoutHeading } from '../db/courses';
import { discDisplayName, discSubline } from '../db/discs';
import {
  getPlayHoleNumber,
  loadPlayDeck,
  setPlayHoleNumber,
  type PlayHole,
} from '../db/play';
import type { ThrowType } from '../db/types';
import { FONT, MODE, PLAY_LIGHT as P } from '../theme/colors';
import type { YouStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<YouStackParamList, 'PlayLayout'>;
type Rt = RouteProp<YouStackParamList, 'PlayLayout'>;

const THROW_ABBREV: Record<ThrowType, string> = {
  Backhand: 'BH',
  Forehand: 'FH',
  Overhand: 'OH',
};

function shapePhrase(item: PlayHole): string | null {
  const p = item.plan;
  if (!p) return null;
  const phrase = [p.throw_type ? THROW_ABBREV[p.throw_type] : null, p.shot_shape]
    .filter(Boolean)
    .join(' ');
  return phrase.length > 0 ? phrase.toUpperCase() : null;
}

export function PlayLayoutScreen() {
  const navigation = useNavigation<Nav>();
  const { layoutId } = useRoute<Rt>().params;

  const [heading, setHeading] = useState<{ layoutName: string; courseName: string } | null>(null);
  const [deck, setDeck] = useState<PlayHole[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [head, d, savedHole] = await Promise.all([
        getLayoutHeading(layoutId),
        loadPlayDeck(layoutId),
        getPlayHoleNumber(layoutId),
      ]);
      if (!alive) return;
      setHeading(head);
      setDeck(d);
      const startIdx =
        savedHole != null ? d.findIndex((x) => x.hole.hole_number === savedHole) : -1;
      setIndex(startIdx >= 0 ? startIdx : 0);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [layoutId]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = Math.min(Math.max(i + delta, 0), deck.length - 1);
        const holeNumber = deck[next]?.hole.hole_number;
        if (holeNumber != null) void setPlayHoleNumber(layoutId, holeNumber);
        return next;
      });
    },
    [deck, layoutId]
  );

  // Swipe anywhere: left → next hole, right → previous. Kept loose (35px) so a
  // one-handed flick while walking registers.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -35) go(1);
        else if (g.dx > 35) go(-1);
      },
    })
  ).current;

  const item = deck[index] ?? null;
  const prev = index > 0 ? deck[index - 1] : null;
  const next = index < deck.length - 1 ? deck[index + 1] : null;

  const phrase = useMemo(() => (item ? shapePhrase(item) : null), [item]);

  if (loading || !heading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MODE.play} />
      </View>
    );
  }

  const { hole, plan, disc } = item;
  const distanceLabel = hole.distance_ft > 0 ? `${hole.distance_ft} FT` : 'DISTANCE —';
  const aim = plan?.aim_note?.trim() || null;
  const hasContent = !!(disc || phrase || aim);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>PLAY</Text>
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          {heading.courseName.toUpperCase()} · {heading.layoutName.toUpperCase()}
        </Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.exit}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.holeRow}>
        <Text style={styles.holeNumeral}>{hole.hole_number}</Text>
        <Text style={styles.holeFacts}>
          PAR {hole.par} · {distanceLabel}
        </Text>
      </View>

      <View style={styles.center2} {...pan.panHandlers}>
        {hasContent ? (
          <>
            {disc && (
              <>
                <Text style={styles.discName} numberOfLines={2} adjustsFontSizeToFit>
                  {discDisplayName(disc)}
                </Text>
                <View style={styles.subRow}>
                  <View style={[styles.dot, { backgroundColor: disc.color }]} />
                  <Text style={styles.subline}>{discSubline(disc)}</Text>
                </View>
              </>
            )}
            {phrase && (
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>{phrase}</Text>
              </View>
            )}
            {aim && <Text style={styles.aim}>{aim}</Text>}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No plan for this hole</Text>
            <Text style={styles.emptyBody}>You're calling this one live.</Text>
          </View>
        )}
      </View>

      <View style={styles.nav}>
        <Pressable
          style={[styles.prevBtn, !prev && styles.navDisabled]}
          disabled={!prev}
          onPress={() => go(-1)}
        >
          <Text style={styles.prevLabel}>‹ {prev ? prev.hole.hole_number : ''}</Text>
        </Pressable>
        {next ? (
          <Pressable style={styles.nextBar} onPress={() => go(1)}>
            <Text style={styles.nextLabel}>HOLE {next.hole.hole_number} ›</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.nextBar} onPress={() => navigation.goBack()}>
            <Text style={styles.nextLabel}>DONE ✓</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  badge: {
    backgroundColor: MODE.play,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeLabel: { fontFamily: FONT.bc700, fontSize: 13, letterSpacing: 1.6, color: '#fff' },
  caption: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONT.bc700,
    fontSize: 12,
    letterSpacing: 1.4,
    color: P.muted,
    marginHorizontal: 8,
  },
  exit: { fontSize: 20, color: P.secondary },
  holeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 4 },
  holeNumeral: { fontFamily: FONT.bc800, fontSize: 58, lineHeight: 58, color: P.ink },
  holeFacts: { fontFamily: FONT.b600, fontSize: 17, color: P.secondary, paddingBottom: 8 },
  center2: { flex: 1, justifyContent: 'center', gap: 18 },
  discName: { fontFamily: FONT.bc800, fontSize: 62, lineHeight: 62, color: P.ink },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -6 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  subline: { fontFamily: FONT.b600, fontSize: 16, color: P.secondary },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: MODE.play,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  pillLabel: { fontFamily: FONT.bc700, fontSize: 26, letterSpacing: 1.4, color: '#fff' },
  aim: { fontFamily: FONT.b600, fontSize: 27, lineHeight: 35, color: P.ink },
  empty: { gap: 8 },
  emptyTitle: { fontFamily: FONT.bc800, fontSize: 34, color: P.ink },
  emptyBody: { fontFamily: FONT.b500, fontSize: 17, color: P.muted },
  nav: { flexDirection: 'row', gap: 12, marginTop: 8 },
  prevBtn: {
    width: 84,
    height: 96,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: P.border,
  },
  navDisabled: { opacity: 0.35 },
  prevLabel: { fontFamily: FONT.bc800, fontSize: 28, color: P.secondary },
  nextBar: {
    flex: 1,
    height: 96,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.ink,
  },
  nextLabel: { fontFamily: FONT.bc800, fontSize: 30, color: '#fff' },
});
