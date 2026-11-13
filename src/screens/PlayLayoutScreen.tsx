import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getLayoutHeading } from '../db/courses';
import { discDisplayName, discSubline } from '../db/discs';
import {
  clearPlayState,
  getPlayHoleNumber,
  loadPlayDeck,
  setPlayHoleNumber,
  type PlayHole,
} from '../db/play';
import { setHolePlanReview } from '../db/plans';
import type { ThrowType } from '../db/types';
import { FONT, MODE, PLAY_LIGHT as P, REVIEW_AMBER } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlayLayout'>;
type Rt = RouteProp<RootStackParamList, 'PlayLayout'>;

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
  return phrase.length > 0 ? phrase : null;
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
      const idx = startIdx >= 0 ? startIdx : 0;
      setIndex(idx);
      setLoading(false);
      // Record the position as soon as the round opens, so reading hole 1 and
      // leaving still leaves a round to resume.
      const openHole = d[idx]?.hole.hole_number;
      if (openHole != null) void setPlayHoleNumber(layoutId, openHole);
    })();
    return () => {
      alive = false;
    };
  }, [layoutId]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const max = Math.max(deck.length - 1, 0);
        const next = Math.min(Math.max(i + delta, 0), max);
        const holeNumber = deck[next]?.hole.hole_number;
        if (holeNumber != null) void setPlayHoleNumber(layoutId, holeNumber);
        return next;
      });
    },
    [deck, layoutId]
  );

  // Flag the current hole's plan to revise, with an optional quick note on
  // what to change. The flag opens a small sheet; saving updates the in-memory
  // deck right away, then persists. Only holes that already have a plan can be
  // flagged (you're marking a plan to revise).
  const [noteOpen, setNoteOpen] = useState(false);
  const insets = useSafeAreaInsets();

  // Phone browsers scroll the page when the keyboard opens; while the note is
  // open, pin the card underneath so it doesn't drift as you type.
  useEffect(() => {
    if (Platform.OS !== 'web' || !noteOpen) return;
    const pin = () => window.scrollTo(0, 0);
    window.addEventListener('scroll', pin);
    return () => window.removeEventListener('scroll', pin);
  }, [noteOpen]);
  const [noteDraft, setNoteDraft] = useState('');

  const openNote = useCallback(() => {
    const cur = deck[index];
    if (!cur?.plan) return;
    setNoteDraft(cur.plan.review_note ?? '');
    setNoteOpen(true);
  }, [deck, index]);

  const saveReview = useCallback(
    (flagged: boolean) => {
      const cur = deck[index];
      setNoteOpen(false);
      if (!cur?.plan) return;
      const note = flagged && noteDraft.trim() ? noteDraft.trim() : null;
      setDeck((d) =>
        d.map((h, i) =>
          i === index && h.plan
            ? { ...h, plan: { ...h.plan, needs_review: flagged, review_note: note } }
            : h
        )
      );
      void setHolePlanReview(cur.hole.id, flagged, note);
    },
    [deck, index, noteDraft]
  );

  // The PanResponder is created once (useRef), so it would otherwise capture the
  // first-render `go` — when deck is still empty — and drive index to -1 on
  // swipe, blanking the card into a spinner. Route swipes through a ref that
  // always holds the latest `go`.
  const goRef = useRef(go);
  goRef.current = go;

  // Swipe anywhere: left → next hole, right → previous. Kept loose (35px) so a
  // one-handed flick while walking registers.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -35) goRef.current(1);
        else if (g.dx > 35) goRef.current(-1);
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
  const distanceLabel = hole.distance_ft > 0 ? `${hole.distance_ft} ft` : 'Distance —';
  const aim = plan?.aim_note?.trim() || null;
  const hasContent = !!(disc || phrase || aim);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Play</Text>
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          {heading.courseName} · {heading.layoutName}
        </Text>
        {plan && (
          <Pressable
            onPress={openNote}
            hitSlop={12}
            style={styles.flagBtn}
            accessibilityRole="button"
            accessibilityLabel={
              plan.needs_review
                ? 'Flagged to revise. Edit the note or unflag'
                : 'Flag this hole to revise later'
            }
          >
            <Ionicons
              name={plan.needs_review ? 'flag' : 'flag-outline'}
              size={22}
              color={plan.needs_review ? REVIEW_AMBER : P.secondary}
            />
          </Pressable>
        )}
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.exit}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.holeRow}>
        <Text style={styles.holeNumeral}>{hole.hole_number}</Text>
        <Text style={styles.holeFacts}>
          Par {hole.par} · {distanceLabel}
        </Text>
      </View>
      {plan?.needs_review && (
        <Pressable style={styles.reviewTag} onPress={openNote} hitSlop={8}>
          <Ionicons name="flag" size={13} color={REVIEW_AMBER} />
          <Text style={styles.reviewTagLabel}>To revise</Text>
          {plan.review_note && (
            <Text style={styles.reviewNote} numberOfLines={2}>
              {plan.review_note}
            </Text>
          )}
        </Pressable>
      )}

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
            <Text style={styles.nextLabel}>Hole {next.hole.hole_number} ›</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.nextBar}
            onPress={async () => {
              // Finished the round — stop offering it as a resume.
              await clearPlayState(layoutId);
              navigation.goBack();
            }}
          >
            <Text style={styles.nextLabel}>Done ✓</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={noteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteOpen(false)}
      >
        {/* Drops down from the top, under the flag: the keyboard rises from
            the bottom, so it never covers the box. (A bottom sheet hid behind
            the keyboard on phone browsers, and Safari scrolled the page
            underneath trying to reach it.) */}
        <View style={[styles.sheetWrap, { paddingTop: insets.top }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNoteOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetTitleRow}>
              <Ionicons name="flag" size={16} color={REVIEW_AMBER} />
              <Text style={styles.sheetTitle}>
                Hole {hole.hole_number} · what to change?
              </Text>
            </View>
            <TextInput
              style={styles.sheetInput}
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Optional — e.g. wind pushed it left"
              placeholderTextColor={P.muted}
              multiline
              autoFocus
              maxLength={200}
            />
            <View style={styles.sheetActions}>
              {plan?.needs_review && (
                <Pressable onPress={() => saveReview(false)} hitSlop={8} style={styles.unflag}>
                  <Text style={styles.unflagLabel}>Unflag</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setNoteOpen(false)} hitSlop={8}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.flagSave} onPress={() => saveReview(true)}>
                <Text style={styles.flagSaveLabel}>
                  {plan?.needs_review ? 'Save' : 'Flag'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  badgeLabel: { fontFamily: FONT.bc700, fontSize: 13, color: '#fff' },
  caption: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONT.bc700,
    fontSize: 12,
    color: P.muted,
    marginHorizontal: 8,
  },
  flagBtn: { paddingHorizontal: 4 },
  exit: { fontSize: 20, color: P.secondary },
  reviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  reviewTagLabel: {
    fontFamily: FONT.bc700,
    fontSize: 12,
    color: REVIEW_AMBER,
  },
  reviewNote: { flex: 1, fontFamily: FONT.b500, fontSize: 14, color: P.secondary },
  sheetWrap: { flex: 1, justifyContent: 'flex-start', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: P.card,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontFamily: FONT.bc700, fontSize: 18, color: P.ink },
  sheetInput: {
    minHeight: 76,
    borderWidth: 2,
    borderColor: P.border,
    borderRadius: 12,
    padding: 12,
    fontFamily: FONT.b500,
    fontSize: 17,
    color: P.ink,
    textAlignVertical: 'top',
  },
  sheetActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 20 },
  unflag: { marginRight: 'auto' },
  unflagLabel: { fontFamily: FONT.b600, fontSize: 16, color: P.secondary },
  cancelLabel: { fontFamily: FONT.b600, fontSize: 16, color: P.secondary },
  flagSave: { backgroundColor: P.ink, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  flagSaveLabel: { fontFamily: FONT.bc800, fontSize: 18, color: '#fff' },
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
  pillLabel: { fontFamily: FONT.bc700, fontSize: 26, color: '#fff' },
  aim: { fontFamily: FONT.b600, fontSize: 27, lineHeight: 35, color: P.ink },
  empty: { gap: 8 },
  emptyTitle: { fontFamily: FONT.bc800, fontSize: 34, color: P.ink },
  emptyBody: { fontFamily: FONT.b500, fontSize: 17, color: P.muted },
  nav: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
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
