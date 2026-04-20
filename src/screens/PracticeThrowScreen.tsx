import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listDiscs, type DiscWithTags } from '../db/discs';
import { getLayout, listHoles, type Hole, type Layout } from '../db/courses';
import { getDb } from '../db';
import {
  deleteThrow,
  listThrowsForHole,
  logThrow,
  type ThrowWithDisc,
} from '../db/throws';
import {
  OVERHAND_SHOT_SHAPES,
  RESULTS,
  SHOT_SHAPES,
  THROW_TYPES,
  type ResultKind,
  type ShotShape,
  type ThrowType,
} from '../db/types';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PracticeThrow'>;
type Rt = RouteProp<RootStackParamList, 'PracticeThrow'>;

const DISTANCE_HIDDEN_RESULTS: readonly ResultKind[] = ['Basket', 'OB'];

export function PracticeThrowScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { sessionId, layoutId } = route.params;

  const [layout, setLayout] = useState<Layout | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [holes, setHoles] = useState<Hole[] | null>(null);
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [discId, setDiscId] = useState<number | null>(null);
  const [throwType, setThrowType] = useState<ThrowType | null>(null);
  const [shotShape, setShotShape] = useState<ShotShape | null>(null);
  const [result, setResult] = useState<ResultKind | null>(null);
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');

  const [throwsForHole, setThrowsForHole] = useState<ThrowWithDisc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentHole = holes && holes.length > 0 ? holes[currentIdx] : null;

  // Initial load: layout + course name + holes + discs.
  useEffect(() => {
    (async () => {
      const [l, hs, ds] = await Promise.all([
        getLayout(layoutId),
        listHoles(layoutId),
        listDiscs(),
      ]);
      setLayout(l);
      setHoles(hs);
      setDiscs(ds);

      if (l) {
        const db = await getDb();
        const row = await db.getFirstAsync<{ name: string }>(
          'SELECT c.name FROM course c JOIN layout l ON l.course_id = c.id WHERE l.id = $id',
          { $id: layoutId }
        );
        setCourseName(row?.name ?? '');
      }
    })();
  }, [layoutId]);

  // Default selected disc to the first in-bag disc once discs load.
  useEffect(() => {
    if (!discs || discId !== null) return;
    const firstInBag = discs.find((d) => d.in_bag);
    if (firstInBag) setDiscId(firstInBag.id);
  }, [discs, discId]);

  // Thumber/Tomahawk forces throw_type = Overhand.
  useEffect(() => {
    if (shotShape && OVERHAND_SHOT_SHAPES.includes(shotShape)) {
      setThrowType('Overhand');
    }
  }, [shotShape]);

  const refreshThrowsForHole = useCallback(async () => {
    if (!currentHole) {
      setThrowsForHole([]);
      return;
    }
    const rows = await listThrowsForHole(sessionId, currentHole.id);
    setThrowsForHole(rows);
  }, [currentHole, sessionId]);

  useEffect(() => {
    void refreshThrowsForHole();
  }, [refreshThrowsForHole]);

  const resetAttempt = () => {
    setResult(null);
    setDistance('');
    setNotes('');
    setError(null);
  };

  const handleHoleChange = (nextIdx: number) => {
    if (!holes) return;
    if (nextIdx < 0 || nextIdx >= holes.length) return;
    setCurrentIdx(nextIdx);
    resetAttempt();
  };

  const distanceApplies = useMemo(() => {
    if (result === null) return false;
    return !DISTANCE_HIDDEN_RESULTS.includes(result);
  }, [result]);

  const parsedDistance = useMemo(() => {
    const trimmed = distance.trim();
    if (trimmed.length === 0) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }, [distance]);

  const canLog =
    !submitting &&
    discId !== null &&
    throwType !== null &&
    shotShape !== null &&
    result !== null;

  const handleLog = async () => {
    if (!canLog || !currentHole || discId === null || throwType === null || shotShape === null || result === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await logThrow({
        sessionId,
        holeId: currentHole.id,
        discId,
        throwType,
        shotShape,
        result,
        distanceFt: distanceApplies ? parsedDistance : null,
        notes,
      });
      resetAttempt();
      await refreshThrowsForHole();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log throw');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteThrow = (t: ThrowWithDisc) => {
    Alert.alert(
      'Delete throw?',
      `${t.disc_model} · ${t.shot_shape} · ${t.result}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteThrow(t.id);
            await refreshThrowsForHole();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    navigation.popToTop();
  };

  if (!layout || !holes || !discs) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (holes.length === 0) {
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={10} style={styles.closeBtn}>
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeLabel}>Practice</Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {courseName} · {layout.name}
          </Text>
        </View>
      </View>

      <HoleNav
        hole={currentHole!}
        index={currentIdx}
        total={holes.length}
        onPrev={() => handleHoleChange(currentIdx - 1)}
        onNext={() => handleHoleChange(currentIdx + 1)}
      />

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
          <Section title="Disc">
            <DiscPicker
              discs={discs}
              selectedId={discId}
              onSelect={setDiscId}
            />
          </Section>

          <Section title="Throw type">
            <ThrowTypePicker
              value={throwType}
              onChange={setThrowType}
              disabled={
                shotShape !== null && OVERHAND_SHOT_SHAPES.includes(shotShape)
              }
            />
          </Section>

          <Section title="Shot shape">
            <ShotShapePicker value={shotShape} onChange={setShotShape} />
          </Section>

          <Section title="Result">
            <ResultPicker value={result} onChange={setResult} />
          </Section>

          {distanceApplies && (
            <Section title="Distance from basket (optional)">
              <View style={styles.distRow}>
                <TextInput
                  style={styles.distInput}
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="number-pad"
                  placeholder="0"
                  returnKeyType="done"
                />
                <Text style={styles.distSuffix}>ft</Text>
              </View>
            </Section>
          )}

          <Section title="Notes (optional)">
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="How it felt, wind, tree hit, etc."
            />
          </Section>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.logBtn, !canLog && styles.logBtnDisabled]}
            disabled={!canLog}
            onPress={handleLog}
          >
            <Text style={styles.logBtnLabel}>
              {submitting ? 'Logging…' : 'Log throw'}
            </Text>
          </Pressable>

          {throwsForHole.length > 0 && (
            <View style={styles.throwsList}>
              <Text style={styles.throwsTitle}>
                This hole · {throwsForHole.length}{' '}
                {throwsForHole.length === 1 ? 'throw' : 'throws'}
              </Text>
              {throwsForHole.map((t) => (
                <ThrowRow
                  key={t.id}
                  throwRow={t}
                  onDelete={() => handleDeleteThrow(t)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type HoleNavProps = {
  hole: Hole;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

function HoleNav({ hole, index, total, onPrev, onNext }: HoleNavProps) {
  const atStart = index === 0;
  const atEnd = index === total - 1;
  return (
    <View style={styles.holeNav}>
      <Pressable
        onPress={onPrev}
        disabled={atStart}
        style={[styles.holeNavBtn, atStart && styles.holeNavBtnDisabled]}
        hitSlop={8}
      >
        <Text style={styles.holeNavLabel}>‹</Text>
      </Pressable>
      <View style={styles.holeInfo}>
        <Text style={styles.holeTitle}>
          Hole {hole.hole_number} · Par {hole.par}
        </Text>
        <Text style={styles.holeMeta}>
          {hole.distance_ft > 0 ? `${hole.distance_ft} ft` : 'Distance not set'}{' '}
          · {index + 1} of {total}
        </Text>
      </View>
      <Pressable
        onPress={onNext}
        disabled={atEnd}
        style={[styles.holeNavBtn, atEnd && styles.holeNavBtnDisabled]}
        hitSlop={8}
      >
        <Text style={styles.holeNavLabel}>›</Text>
      </Pressable>
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

type DiscPickerProps = {
  discs: DiscWithTags[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

function DiscPicker({ discs, selectedId, onSelect }: DiscPickerProps) {
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
            style={[
              styles.discPill,
              on && styles.discPillOn,
              d.in_bag && styles.discPillInBag,
            ]}
          >
            <View style={[styles.discSwatch, { backgroundColor: d.color }]} />
            <View style={styles.discTextWrap}>
              <Text
                style={[styles.discModel, on && styles.discModelOn]}
                numberOfLines={1}
              >
                {d.model}
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

type ThrowTypePickerProps = {
  value: ThrowType | null;
  onChange: (v: ThrowType) => void;
  disabled: boolean;
};

function ThrowTypePicker({ value, onChange, disabled }: ThrowTypePickerProps) {
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
              style={[
                styles.segmentLabel,
                on && styles.segmentLabelOn,
                disabled && styles.segmentLabelDisabled,
              ]}
            >
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ShotShapePickerProps = {
  value: ShotShape | null;
  onChange: (v: ShotShape) => void;
};

function ShotShapePicker({ value, onChange }: ShotShapePickerProps) {
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

type ResultPickerProps = {
  value: ResultKind | null;
  onChange: (v: ResultKind) => void;
};

function ResultPicker({ value, onChange }: ResultPickerProps) {
  return (
    <View style={styles.chipWrap}>
      {RESULTS.map((r) => {
        const on = value === r;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
              {r}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ThrowRow({
  throwRow,
  onDelete,
}: {
  throwRow: ThrowWithDisc;
  onDelete: () => void;
}) {
  return (
    <Pressable onLongPress={onDelete} style={styles.throwRow}>
      <View
        style={[styles.throwSwatch, { backgroundColor: throwRow.disc_color }]}
      />
      <View style={styles.throwText}>
        <Text style={styles.throwTitle} numberOfLines={1}>
          {throwRow.disc_model} · {throwRow.shot_shape}
        </Text>
        <Text style={styles.throwMeta} numberOfLines={1}>
          {throwRow.throw_type} · {throwRow.result}
          {throwRow.distance_from_basket_ft !== null
            ? ` · ${throwRow.distance_from_basket_ft} ft`
            : ''}
        </Text>
        {throwRow.notes && (
          <Text style={styles.throwNotes} numberOfLines={2}>
            {throwRow.notes}
          </Text>
        )}
      </View>
    </Pressable>
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
    backgroundColor: MODE.practice,
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
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

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
  discPillInBag: { borderColor: UI.border },
  discPillOn: { backgroundColor: '#eef3ff', borderColor: MODE.practice },
  discSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: UI.border,
  },
  discTextWrap: { minWidth: 0 },
  discModel: { fontSize: 14, fontWeight: '600', color: UI.text },
  discModelOn: { color: MODE.practice },
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
  segmentOn: { backgroundColor: MODE.practice },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: UI.textMuted },
  segmentLabelOn: { color: UI.textInverse },
  segmentLabelDisabled: {},

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  chipOn: { backgroundColor: MODE.practice, borderColor: MODE.practice },
  chipLabel: { fontSize: 13, color: UI.textMuted, fontWeight: '600' },
  chipLabelOn: { color: UI.textInverse },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distInput: {
    flex: 1,
    backgroundColor: UI.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  distSuffix: { fontSize: 14, color: UI.textMuted, width: 24 },

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
  logBtn: {
    backgroundColor: MODE.practice,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  logBtnDisabled: { opacity: 0.4 },
  logBtnLabel: { color: UI.textInverse, fontSize: 16, fontWeight: '700' },

  throwsList: {
    marginTop: 12,
    gap: 8,
  },
  throwsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  throwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  throwSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  throwText: { flex: 1, minWidth: 0 },
  throwTitle: { fontSize: 14, fontWeight: '600', color: UI.text },
  throwMeta: { fontSize: 12, color: UI.textMuted, marginTop: 2 },
  throwNotes: {
    fontSize: 12,
    color: UI.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },

  emptyTitle: { fontSize: 18, fontWeight: '600', color: UI.text },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: UI.text,
    borderRadius: 12,
  },
  emptyBtnLabel: { fontSize: 15, fontWeight: '600', color: UI.textInverse },
});
