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
  deleteGamePlan,
  loadGamePlanContext,
  type GamePlanContext,
} from '../db/gamePlan';
import {
  discDisplayName,
  listDiscs,
  type DiscWithTags,
} from '../db/discs';
import { MODE, MODE_TINT, UI } from '../theme/colors';
import { confirmAction, notify } from '../util/confirm';
import {
  downloadTextFile,
  gamePlanFilename,
  gamePlanToText,
  isExportSupported,
} from '../util/export';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GamePlanSummary'>;
type Rt = RouteProp<RootStackParamList, 'GamePlanSummary'>;

export function GamePlanSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { layoutId } = route.params;

  const [ctx, setCtx] = useState<GamePlanContext | null>(null);
  const [discs, setDiscs] = useState<DiscWithTags[]>([]);

  const load = useCallback(async () => {
    const [c, ds] = await Promise.all([
      loadGamePlanContext(layoutId),
      listDiscs(),
    ]);
    setCtx(c);
    setDiscs(ds);
  }, [layoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEditHole = (idx: number) => {
    navigation.replace('GamePlanReview', { layoutId, startHoleIdx: idx });
  };

  const handleExport = () => {
    if (!ctx) return;
    const discsById = new Map(
      discs.map((d) => [
        d.id,
        {
          manufacturer: d.manufacturer,
          model: d.model,
          nickname: d.nickname,
          category: d.category,
        },
      ])
    );
    try {
      downloadTextFile(gamePlanFilename(ctx), gamePlanToText(ctx, discsById));
    } catch (e) {
      notify({
        title: 'Export failed',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handleDelete = () => {
    if (!ctx) return;
    const planned = ctx.holes.filter((h) => h.savedPlan !== null).length;
    if (planned === 0) {
      navigation.popToTop();
      return;
    }
    confirmAction({
      title: 'Delete this game plan?',
      message: `${ctx.courseName} · ${ctx.layoutName}. ${planned} ${
        planned === 1 ? 'hole' : 'holes'
      } will be cleared. Practice throws on this layout aren't affected.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteGamePlan(layoutId);
        navigation.popToTop();
      },
    });
  };

  if (!ctx) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const planned = ctx.holes.filter((h) => h.savedPlan !== null).length;
  const total = ctx.holes.length;
  const isComplete = planned === total && total > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.popToTop()} hitSlop={10}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <View style={styles.headerActions}>
          {isExportSupported && planned > 0 && (
            <Pressable
              onPress={handleExport}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityLabel="Export game plan as text file"
            >
              <Text style={styles.headerBtnLabel}>Export</Text>
            </Pressable>
          )}
          {planned > 0 && (
            <Pressable
              onPress={handleDelete}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityLabel="Delete this game plan"
            >
              <Text style={[styles.headerBtnLabel, { color: UI.danger }]}>
                Delete
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeLabel}>Game plan</Text>
          </View>
          <Text style={styles.title}>
            {ctx.courseName} · {ctx.layoutName}
          </Text>
          <Text style={styles.subtitle}>
            {planned} of {total} holes planned
            {isComplete ? ' · ready' : ''}
          </Text>
        </View>

        {ctx.holes.map((rec, idx) => {
          const plan = rec.savedPlan;
          const planDisc = plan
            ? discs.find((d) => d.id === plan.disc_id)
            : null;
          const planned = plan !== null;
          return (
            <Pressable
              key={rec.hole.id}
              onPress={() => handleEditHole(idx)}
              style={({ pressed }) => [
                styles.holeRow,
                planned ? styles.holeRowPlanned : styles.holeRowUnplanned,
                pressed && styles.holeRowPressed,
              ]}
            >
              <View style={styles.holeRowHeader}>
                <Text style={styles.holeNumber}>
                  Hole {rec.hole.hole_number}
                </Text>
                <Text style={styles.holeMeta}>
                  Par {rec.hole.par}
                  {rec.hole.distance_ft > 0
                    ? ` · ${rec.hole.distance_ft} ft`
                    : ''}
                </Text>
              </View>
              {plan && planDisc ? (
                <View style={styles.holeRowBody}>
                  <View
                    style={[
                      styles.discSwatch,
                      { backgroundColor: planDisc.color },
                    ]}
                  />
                  <View style={styles.holeRowText}>
                    <Text style={styles.discName} numberOfLines={1}>
                      {discDisplayName(planDisc)}
                    </Text>
                    <Text style={styles.shotMeta} numberOfLines={1}>
                      {plan.throw_type} · {plan.shot_shape}
                    </Text>
                    {plan.notes && plan.notes.trim().length > 0 && (
                      <Text style={styles.planNotes} numberOfLines={2}>
                        {plan.notes}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.chev}>›</Text>
                </View>
              ) : (
                <View style={styles.holeRowBody}>
                  <Text style={styles.unplannedHint}>Tap to plan this hole</Text>
                  <Text style={styles.chev}>›</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.doneBtn}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  headerBtnLabel: { fontSize: 13, fontWeight: '600', color: MODE.gamePlan },

  content: { padding: 16, gap: 12, paddingBottom: 24 },
  modeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: MODE.gamePlan,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  modeBadgeLabel: {
    color: UI.textInverse,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: { fontSize: 20, fontWeight: '700', color: UI.text },
  subtitle: { fontSize: 13, color: UI.textMuted, marginTop: 2 },

  holeRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  holeRowPlanned: {
    backgroundColor: MODE_TINT.gamePlan,
    borderColor: MODE.gamePlan,
  },
  holeRowUnplanned: {
    backgroundColor: UI.surface,
    borderColor: UI.border,
    borderStyle: 'dashed',
  },
  holeRowPressed: { opacity: 0.7 },
  holeRowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  holeNumber: { fontSize: 14, fontWeight: '700', color: UI.text },
  holeMeta: { fontSize: 12, color: UI.textMuted },
  holeRowBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  holeRowText: { flex: 1, minWidth: 0, gap: 1 },
  discSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  discName: { fontSize: 14, fontWeight: '600', color: UI.text },
  shotMeta: { fontSize: 12, color: UI.textMuted },
  planNotes: {
    fontSize: 12,
    color: UI.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  unplannedHint: { flex: 1, fontSize: 12, color: UI.textMuted },
  chev: { fontSize: 22, color: UI.textMuted },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  doneBtn: {
    backgroundColor: MODE.gamePlan,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneLabel: { color: UI.textInverse, fontSize: 16, fontWeight: '700' },
});
