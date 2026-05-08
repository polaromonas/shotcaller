import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { confirmAction, notify } from '../util/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  discDisplayName,
  listDiscs,
  type DiscWithTags,
} from '../db/discs';
import {
  loadGamePlanContext,
  saveGamePlan,
  type ComboBreakdown,
  type GamePlanContext,
  type HoleRec,
  type HolePlanInput,
} from '../db/gamePlan';
import { updateHole, type Hole } from '../db/courses';
import {
  OVERHAND_SHOT_SHAPES,
  SHOT_SHAPES,
  THROW_TYPES,
  type DiscCategory,
  type ShotShape,
  type ThrowType,
} from '../db/types';
import { CONFIDENCE, MODE, MODE_TINT, UI } from '../theme/colors';
import {
  downloadTextFile,
  gamePlanFilename,
  gamePlanToText,
  isExportSupported,
} from '../util/export';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GamePlanReview'>;
type Rt = RouteProp<RootStackParamList, 'GamePlanReview'>;

type HoleDraft = {
  discId: number | null;
  throwType: ThrowType | null;
  shotShape: ShotShape | null;
  notes: string;
};

type Confidence = 'high' | 'low' | 'none';

function confidenceFromTotal(total: number): Confidence {
  if (total >= 4) return 'high';
  if (total >= 2) return 'low';
  return 'none';
}

function categoryForDistance(distanceFt: number): DiscCategory | null {
  if (distanceFt <= 0) return null;
  if (distanceFt >= 300) return 'DD';
  if (distanceFt >= 200) return 'FWD';
  if (distanceFt >= 100) return 'MID';
  return 'P&A';
}

function fallbackDiscId(
  distanceFt: number,
  discs: DiscWithTags[]
): number | null {
  const inBag = discs.filter((d) => d.in_bag);
  const pool = inBag.length > 0 ? inBag : discs;
  if (pool.length === 0) return null;
  const wanted = categoryForDistance(distanceFt);
  if (wanted) {
    const match = pool.find((d) => d.category === wanted);
    if (match) return match.id;
  }
  return pool[0].id;
}

function draftFromRec(rec: HoleRec, discs: DiscWithTags[]): HoleDraft {
  if (rec.savedPlan) {
    return {
      discId: rec.savedPlan.disc_id,
      throwType: rec.savedPlan.throw_type,
      shotShape: rec.savedPlan.shot_shape,
      notes: rec.savedPlan.notes ?? '',
    };
  }
  // No saved plan and no app-recommended combo by design — the player picks
  // from the disc list. The distance-bucket fallback is just a UI default
  // (something to start on rather than an empty picker), not a suggestion.
  return {
    discId: fallbackDiscId(rec.hole.distance_ft, discs),
    throwType: 'Backhand',
    shotShape: 'Flat',
    notes: '',
  };
}

export function GamePlanReviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { layoutId } = route.params;

  const [ctx, setCtx] = useState<GamePlanContext | null>(null);
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, HoleDraft>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether the player has touched any draft since the screen opened.
  // Drives the close-confirm so a clean close (no edits) doesn't nag.
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const [loaded, ds] = await Promise.all([
        loadGamePlanContext(layoutId),
        listDiscs(),
      ]);
      setCtx(loaded);
      setDiscs(ds);
      if (loaded) {
        const seeded: Record<number, HoleDraft> = {};
        for (const rec of loaded.holes) {
          seeded[rec.hole.id] = draftFromRec(rec, ds);
        }
        setDrafts(seeded);
      }
    })();
  }, [layoutId]);

  const currentRec = useMemo(
    () => (ctx && ctx.holes.length > 0 ? ctx.holes[currentIdx] : null),
    [ctx, currentIdx]
  );

  const currentDraft = currentRec ? drafts[currentRec.hole.id] : null;

  const updateDraft = useCallback(
    (holeId: number, changes: Partial<HoleDraft>) => {
      setDrafts((prev) => {
        const existing = prev[holeId];
        if (!existing) return prev;
        return { ...prev, [holeId]: { ...existing, ...changes } };
      });
      setDirty(true);
    },
    []
  );

  const handlePatchHole = useCallback(
    async (patch: Partial<Pick<Hole, 'par' | 'distance_ft'>>) => {
      const cur = currentRec?.hole;
      if (!cur) return;
      const next: Hole = { ...cur, ...patch };
      await updateHole({
        id: next.id,
        par: next.par,
        distance_ft: next.distance_ft,
      });
      setCtx((prev) =>
        prev
          ? {
              ...prev,
              holes: prev.holes.map((h) =>
                h.hole.id === next.id ? { ...h, hole: next } : h
              ),
            }
          : prev
      );
    },
    [currentRec]
  );

  // Thumber/Tomahawk → force Overhand.
  useEffect(() => {
    if (!currentRec || !currentDraft) return;
    if (
      currentDraft.shotShape &&
      OVERHAND_SHOT_SHAPES.includes(currentDraft.shotShape) &&
      currentDraft.throwType !== 'Overhand'
    ) {
      updateDraft(currentRec.hole.id, { throwType: 'Overhand' });
    }
  }, [currentRec, currentDraft, updateDraft]);

  const incompleteHoles = useMemo(() => {
    if (!ctx) return [];
    return ctx.holes.filter((rec) => {
      const d = drafts[rec.hole.id];
      return !d || d.discId === null || d.throwType === null || d.shotShape === null;
    });
  }, [ctx, drafts]);

  const handleClose = () => {
    if (dirty) {
      confirmAction({
        title: 'Discard game plan edits?',
        message: 'Your changes on this session will not be saved.',
        confirmLabel: 'Discard',
        destructive: true,
        onConfirm: () => navigation.popToTop(),
      });
    } else {
      navigation.popToTop();
    }
  };

  const savedHoleCount = useMemo(
    () => (ctx ? ctx.holes.filter((h) => h.savedPlan !== null).length : 0),
    [ctx]
  );

  const handleExport = () => {
    if (!ctx || !discs) return;
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

  const handleLockIn = async () => {
    if (!ctx) return;
    if (incompleteHoles.length > 0) {
      const first = incompleteHoles[0];
      notify({
        title: 'Missing plan for some holes',
        message: `Hole ${first.hole.hole_number} has no disc or shape selected. Fill it in before locking the plan.`,
      });
      const idx = ctx.holes.findIndex(
        (r) => r.hole.id === first.hole.id
      );
      if (idx >= 0) setCurrentIdx(idx);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const plans: HolePlanInput[] = ctx.holes.map((rec) => {
        const d = drafts[rec.hole.id];
        return {
          holeId: rec.hole.id,
          discId: d.discId as number,
          throwType: d.throwType as ThrowType,
          shotShape: d.shotShape as ShotShape,
          notes: d.notes,
          // Plan rows are always the player's intentional pick now (no
          // engine to override). The schema column is kept for legacy
          // compatibility; we just always mark true.
          isManualOverride: true,
        };
      });
      await saveGamePlan(layoutId, plans);
      navigation.popToTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to lock in plan');
      setSubmitting(false);
    }
  };

  if (!ctx || !discs) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (ctx.holes.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>This layout has no holes</Text>
          <Pressable style={styles.emptyBtn} onPress={handleClose}>
            <Text style={styles.emptyBtnLabel}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const rec = currentRec!;
  const draft = currentDraft!;
  const confidence = confidenceFromTotal(rec.stats.total);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={10} style={styles.closeBtn}>
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeLabel}>Game plan</Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {ctx.courseName} · {ctx.layoutName}
          </Text>
        </View>
        {isExportSupported && savedHoleCount > 0 && (
          <Pressable
            onPress={handleExport}
            hitSlop={10}
            style={styles.exportBtn}
            accessibilityLabel="Export game plan as text file"
          >
            <Text style={styles.exportLabel}>Export</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.holeNav}>
        <Pressable
          onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          style={[styles.holeNavBtn, currentIdx === 0 && styles.holeNavBtnDisabled]}
          hitSlop={8}
        >
          <Text style={styles.holeNavLabel}>‹</Text>
        </Pressable>
        <EditableHoleHeader
          hole={rec.hole}
          index={currentIdx}
          total={ctx.holes.length}
          onChangePar={(par) => void handlePatchHole({ par })}
          onChangeDistance={(distance_ft) =>
            void handlePatchHole({ distance_ft })
          }
        />
        <Pressable
          onPress={() =>
            setCurrentIdx((i) => Math.min(ctx.holes.length - 1, i + 1))
          }
          disabled={currentIdx === ctx.holes.length - 1}
          style={[
            styles.holeNavBtn,
            currentIdx === ctx.holes.length - 1 && styles.holeNavBtnDisabled,
          ]}
          hitSlop={8}
        >
          <Text style={styles.holeNavLabel}>›</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ConfidenceBar confidence={confidence} total={rec.stats.total} />

          {rec.stats.total <= 1 && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                No practice data for this hole. Recommendation is a best guess
                based on hole distance and par.
              </Text>
            </View>
          )}

          {rec.combos.length > 0 && (
            <Section title="Throws on this hole">
              <CombosTable combos={rec.combos} />
            </Section>
          )}

          <Section title="Practice stats">
            <View style={styles.statsGrid}>
              <StatCell label="Throws" value={String(rec.stats.total)} />
              <StatCell
                label="Fairway %"
                value={rec.stats.total > 0 ? `${rec.stats.fairway_pct}%` : '—'}
              />
              <StatCell label="Best" value={rec.stats.best ?? '—'} />
            </View>
            {rec.stats.notes.length > 0 && (
              <View style={styles.notesList}>
                {rec.stats.notes.map((note, i) => (
                  <Text key={i} style={styles.noteItem}>
                    · {note}
                  </Text>
                ))}
              </View>
            )}
          </Section>

          <Section title="Disc">
            <DiscPicker
              discs={discs}
              selectedId={draft.discId}
              onSelect={(id) => updateDraft(rec.hole.id, { discId: id })}
            />
          </Section>

          <Section title="Throw type">
            <ThrowTypePicker
              value={draft.throwType}
              disabled={
                draft.shotShape !== null &&
                OVERHAND_SHOT_SHAPES.includes(draft.shotShape)
              }
              onChange={(v) => updateDraft(rec.hole.id, { throwType: v })}
            />
          </Section>

          <Section title="Shot shape">
            <ShotShapePicker
              value={draft.shotShape}
              onChange={(v) => updateDraft(rec.hole.id, { shotShape: v })}
            />
          </Section>

          <Section title="Plan notes (optional)">
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={draft.notes}
              onChangeText={(v) => updateDraft(rec.hole.id, { notes: v })}
              multiline
              placeholder="Wind direction, pin position, strategy, etc."
            />
          </Section>

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerMeta}>
            {incompleteHoles.length > 0
              ? `${incompleteHoles.length} ${incompleteHoles.length === 1 ? 'hole' : 'holes'} need a pick`
              : `${ctx.holes.length} holes planned`}
          </Text>
          <Pressable
            style={[
              styles.lockBtn,
              (submitting || incompleteHoles.length > 0) && styles.lockBtnDisabled,
            ]}
            disabled={submitting || incompleteHoles.length > 0}
            onPress={handleLockIn}
          >
            <Text style={styles.lockLabel}>
              {submitting ? 'Locking…' : 'Lock in game plan'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ConfidenceBar({
  confidence,
  total,
}: {
  confidence: Confidence;
  total: number;
}) {
  const color =
    confidence === 'high'
      ? CONFIDENCE.high
      : confidence === 'low'
        ? CONFIDENCE.low
        : CONFIDENCE.none;
  const filled =
    confidence === 'high' ? 4 : confidence === 'low' ? 2 : 0;
  const label =
    confidence === 'high'
      ? 'High confidence'
      : confidence === 'low'
        ? 'Low confidence'
        : 'No data';
  return (
    <View style={styles.confidenceRow}>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: color },
              i < filled && { backgroundColor: color },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.confidenceLabel, { color }]}>
        {label} · {total} {total === 1 ? 'throw' : 'throws'}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const PAR_OPTIONS = [2, 3, 4, 5] as const;

// Same control pattern as PracticeThrowScreen's hole header — par chips that
// save immediately, distance input that commits on blur. Lets a player
// drafting a plan for a fresh layout fill in hole metadata as they go,
// without first running practice rounds to populate it.
function EditableHoleHeader({
  hole,
  index,
  total,
  onChangePar,
  onChangeDistance,
}: {
  hole: Hole;
  index: number;
  total: number;
  onChangePar: (par: number) => void;
  onChangeDistance: (distanceFt: number) => void;
}) {
  const [distanceDraft, setDistanceDraft] = useState(
    hole.distance_ft > 0 ? String(hole.distance_ft) : ''
  );

  useEffect(() => {
    setDistanceDraft(hole.distance_ft > 0 ? String(hole.distance_ft) : '');
  }, [hole.id, hole.distance_ft]);

  const commitDistance = () => {
    const trimmed = distanceDraft.trim();
    if (trimmed.length === 0) {
      if (hole.distance_ft !== 0) onChangeDistance(0);
      return;
    }
    const n = Math.round(Number(trimmed));
    if (Number.isFinite(n) && n >= 0 && n !== hole.distance_ft) {
      onChangeDistance(n);
    }
  };

  return (
    <View style={styles.holeInfo}>
      <Text style={styles.holeTitle}>
        Hole {hole.hole_number} · {index + 1} of {total}
      </Text>
      <View style={styles.holeEditRow}>
        <View style={styles.parChips}>
          {PAR_OPTIONS.map((p) => {
            const on = p === hole.par;
            return (
              <Pressable
                key={p}
                onPress={() => !on && onChangePar(p)}
                style={[styles.parChip, on && styles.parChipOn]}
                hitSlop={4}
                accessibilityLabel={`Par ${p}`}
              >
                <Text
                  style={[styles.parChipLabel, on && styles.parChipLabelOn]}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.distEditWrap}>
          <TextInput
            style={styles.distEditInput}
            value={distanceDraft}
            onChangeText={setDistanceDraft}
            onBlur={commitDistance}
            onSubmitEditing={commitDistance}
            keyboardType="number-pad"
            placeholder="—"
            maxLength={4}
            returnKeyType="done"
          />
          <Text style={styles.distEditSuffix}>ft</Text>
        </View>
      </View>
    </View>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Compact short-codes for the result distribution: "3F · 1C2 · 1OB"
// Order matches the ResultKind priority so the line scans consistently.
const COMBO_RESULT_PARTS: { key: keyof ComboBreakdown; short: string }[] = [
  { key: 'basket', short: 'Basket' },
  { key: 'c1', short: 'C1' },
  { key: 'c2', short: 'C2' },
  { key: 'fairway', short: 'F' },
  { key: 'rough', short: 'Rough' },
  { key: 'ob', short: 'OB' },
];

function CombosTable({ combos }: { combos: ComboBreakdown[] }) {
  return (
    <View style={styles.combosCard}>
      {combos.map((c, i) => {
        const breakdown = COMBO_RESULT_PARTS.flatMap(({ key, short }) => {
          const n = c[key] as number;
          return n > 0 ? [`${n}${short}`] : [];
        }).join(' · ');
        const display = c.disc_nickname || c.disc_model;
        return (
          <View
            key={`${c.disc_id}-${c.throw_type}-${c.shot_shape}`}
            style={[
              styles.comboRow,
              i < combos.length - 1 && styles.comboRowDivider,
            ]}
          >
            <View
              style={[styles.discSwatch, { backgroundColor: c.disc_color }]}
            />
            <View style={styles.comboTextWrap}>
              <Text style={styles.comboTitle} numberOfLines={1}>
                {display} · {c.throw_type} · {c.shot_shape}
              </Text>
              <Text style={styles.comboBreakdown} numberOfLines={1}>
                {breakdown || '—'}
              </Text>
            </View>
            <View style={styles.comboNumbers}>
              <Text style={styles.comboTotal}>{c.total}</Text>
              <Text style={styles.comboAvg}>avg {c.avg_score.toFixed(1)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DiscPicker({
  discs,
  selectedId,
  onSelect,
}: {
  discs: DiscWithTags[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (discs.length === 0) {
    return (
      <Text style={styles.pickerEmpty}>
        Add discs in the My Discs tab first.
      </Text>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.discRow}
    >
      {discs.map((d) => {
        const on = selectedId === d.id;
        return (
          <Pressable
            key={d.id}
            onPress={() => onSelect(d.id)}
            style={[styles.discPill, on && styles.discPillOn]}
          >
            <View style={[styles.discSwatch, { backgroundColor: d.color }]} />
            <View style={styles.discTextWrap}>
              <Text
                style={[styles.discModel, on && styles.discModelOn]}
                numberOfLines={1}
              >
                {discDisplayName(d)}
              </Text>
              <Text style={styles.discMfr} numberOfLines={1}>
                {d.manufacturer} · {d.category}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ThrowTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: ThrowType | null;
  onChange: (v: ThrowType) => void;
  disabled: boolean;
}) {
  return (
    <View style={[styles.segmented, disabled && styles.segmentedDisabled]}>
      {THROW_TYPES.map((t) => {
        const on = value === t;
        return (
          <Pressable
            key={t}
            onPress={() => !disabled && onChange(t)}
            disabled={disabled}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text
              style={[styles.segmentLabel, on && styles.segmentLabelOn]}
            >
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ShotShapePicker({
  value,
  onChange,
}: {
  value: ShotShape | null;
  onChange: (v: ShotShape) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {SHOT_SHAPES.map((s) => {
        const on = value === s;
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
              {s}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: { fontSize: 18, color: UI.textMuted },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  modeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: MODE.gamePlan,
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
  headerSubtitle: { fontSize: 13, color: UI.textMuted },
  exportBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  exportLabel: { fontSize: 13, fontWeight: '600', color: MODE.gamePlan },

  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  holeInfo: { flex: 1, alignItems: 'center' },
  holeTitle: { fontSize: 16, fontWeight: '700', color: UI.text },
  holeMeta: { fontSize: 12, color: UI.textMuted, marginTop: 2 },
  holeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  parChips: { flexDirection: 'row', gap: 4 },
  parChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: UI.bg,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parChipOn: { backgroundColor: MODE.gamePlan, borderColor: MODE.gamePlan },
  parChipLabel: { fontSize: 13, fontWeight: '700', color: UI.textMuted },
  parChipLabelOn: { color: UI.textInverse },
  distEditWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: UI.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  distEditInput: {
    fontSize: 14,
    fontWeight: '600',
    color: UI.text,
    minWidth: 48,
    textAlign: 'center',
    paddingVertical: 4,
  },
  distEditSuffix: { fontSize: 12, color: UI.textMuted },
  holeNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
  },
  holeNavBtnDisabled: { opacity: 0.35 },
  holeNavLabel: { fontSize: 20, fontWeight: '700', color: UI.text },

  content: { padding: 16, gap: 20, paddingBottom: 40 },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  confidenceLabel: { fontSize: 13, fontWeight: '600' },

  warningBanner: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fcf4df',
    borderWidth: 1,
    borderColor: CONFIDENCE.low,
  },
  warningText: {
    fontSize: 13,
    color: '#7a6018',
    lineHeight: 18,
  },

  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  combosCard: {
    backgroundColor: UI.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
  },
  comboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comboRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  comboTextWrap: { flex: 1, minWidth: 0 },
  comboTitle: { fontSize: 14, fontWeight: '600', color: UI.text },
  comboBreakdown: { fontSize: 12, color: UI.textMuted, marginTop: 2 },
  comboNumbers: { alignItems: 'flex-end' },
  comboTotal: { fontSize: 16, fontWeight: '700', color: UI.text },
  comboAvg: { fontSize: 11, color: UI.textMuted },

  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    padding: 12,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: UI.text },
  statLabel: {
    fontSize: 11,
    color: UI.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  notesList: {
    marginTop: 10,
    padding: 12,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 4,
  },
  noteItem: { fontSize: 12, color: UI.textMuted, lineHeight: 16 },

  discRow: { gap: 8, paddingVertical: 2 },
  discPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: UI.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    maxWidth: 200,
  },
  discPillOn: { backgroundColor: MODE_TINT.gamePlan, borderColor: MODE.gamePlan },
  discSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: UI.border,
  },
  discTextWrap: { minWidth: 0 },
  discModel: { fontSize: 14, fontWeight: '600', color: UI.text },
  discModelOn: { color: MODE.gamePlan },
  discMfr: { fontSize: 11, color: UI.textMuted },
  pickerEmpty: { fontSize: 14, color: UI.textMuted },

  segmented: {
    flexDirection: 'row',
    backgroundColor: UI.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: UI.border,
  },
  segmentedDisabled: { opacity: 0.5 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentOn: { backgroundColor: MODE.gamePlan },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: UI.textMuted },
  segmentLabelOn: { color: UI.textInverse },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  chipOn: { backgroundColor: MODE.gamePlan, borderColor: MODE.gamePlan },
  chipLabel: { fontSize: 13, color: UI.textMuted, fontWeight: '600' },
  chipLabelOn: { color: UI.textInverse },

  input: {
    backgroundColor: UI.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  notesInput: { minHeight: 64, textAlignVertical: 'top' },

  error: { color: UI.danger, fontSize: 14 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    gap: 8,
    backgroundColor: UI.bg,
  },
  footerMeta: { fontSize: 12, color: UI.textMuted, textAlign: 'center' },
  lockBtn: {
    backgroundColor: MODE.gamePlan,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  lockBtnDisabled: { opacity: 0.4 },
  lockLabel: { color: UI.textInverse, fontSize: 16, fontWeight: '700' },

  emptyTitle: { fontSize: 18, fontWeight: '600', color: UI.text },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: UI.text,
    borderRadius: 12,
  },
  emptyBtnLabel: { fontSize: 15, fontWeight: '600', color: UI.textInverse },
});
