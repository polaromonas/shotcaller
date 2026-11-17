import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { THROW_TYPES, type ThrowType } from '../db/types';
import {
  getLayout,
  listHoles,
  updateHole,
  type Hole,
  type Layout,
} from '../db/courses';
import {
  createDisc,
  discDisplayName,
  listDiscs,
  type DiscWithTags,
  type NewDiscInput,
} from '../db/discs';
import { getHolePlan, saveHolePlan, setHolePlanReview } from '../db/plans';
import { listShapes, createShape, deleteShape, type Shape } from '../db/shapes';
import { getActiveBagId, listBags, setActiveBag, type Bag } from '../db/bags';
import { DiscPickerSheet } from '../components/DiscPickerSheet';
import { AddDiscSheet } from '../components/AddDiscSheet';
import { confirmAction } from '../util/confirm';
import { FONT, MODE, REVIEW_AMBER, SHELL } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlanHole'>;
type Rt = RouteProp<RootStackParamList, 'PlanHole'>;

const PARS = [2, 3, 4, 5];

// The editable fields of one hole, as loaded and as on screen. Leaving a hole
// saves only when these differ, so paging past a hole doesn't bump its
// updated_at (which drives the "last edited" highlight on the holes grid).
type Draft = {
  discId: number | null;
  throwType: ThrowType | null;
  shotShape: string | null;
  aim: string;
  par: number;
  distanceFt: number;
};

function parseDistance(text: string): number {
  const parsed = Number(text.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.discId === b.discId &&
    a.throwType === b.throwType &&
    a.shotShape === b.shotShape &&
    a.aim.trim() === b.aim.trim() &&
    a.par === b.par &&
    a.distanceFt === b.distanceFt
  );
}

export function PlanHoleScreen() {
  const navigation = useNavigation<Nav>();
  const { layoutId, holeId } = useRoute<Rt>().params;

  const [layout, setLayout] = useState<Layout | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [discs, setDiscs] = useState<DiscWithTags[]>([]);
  const [loading, setLoading] = useState(true);

  const [discId, setDiscId] = useState<number | null>(null);
  const [throwType, setThrowType] = useState<ThrowType | null>(null);
  const [shotShape, setShotShape] = useState<string | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [activeBagId, setActiveBagId] = useState<number | null>(null);
  const [bagMenuOpen, setBagMenuOpen] = useState(false);
  const [aim, setAim] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [par, setPar] = useState(3);
  const [distance, setDistance] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addDiscOpen, setAddDiscOpen] = useState(false);
  const [addShapeOpen, setAddShapeOpen] = useState(false);
  const [newShapeName, setNewShapeName] = useState('');
  const loadedRef = useRef<Draft | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Paging between holes swaps params in place (no push/replace animation), so
  // only the first load shows the spinner.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [l, hs, ds, plan, sh, bs, activeId] = await Promise.all([
        getLayout(layoutId),
        listHoles(layoutId),
        listDiscs(),
        getHolePlan(holeId),
        listShapes(),
        listBags(),
        getActiveBagId(),
      ]);
      if (!alive) return;
      setLayout(l);
      setHoles([...hs].sort((a, b) => a.hole_number - b.hole_number));
      setDiscs(ds);
      setBags(bs);
      setActiveBagId(activeId);
      setShapes(sh);
      const hole = hs.find((h) => h.id === holeId);
      setPar(hole?.par ?? 3);
      setDistance(hole && hole.distance_ft > 0 ? String(hole.distance_ft) : '');
      setDiscId(plan?.disc_id ?? null);
      setThrowType(plan?.throw_type ?? null);
      setShotShape(plan?.shot_shape ?? null);
      setAim(plan?.aim_note ?? '');
      setNeedsReview(plan?.needs_review ?? false);
      setReviewNote(plan?.review_note ?? null);
      setReviewExpanded(false);
      loadedRef.current = {
        discId: plan?.disc_id ?? null,
        throwType: plan?.throw_type ?? null,
        shotShape: plan?.shot_shape ?? null,
        aim: plan?.aim_note ?? '',
        par: hole?.par ?? 3,
        distanceFt: hole?.distance_ft ?? 0,
      };
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [layoutId, holeId]);

  const hole = useMemo(() => holes.find((h) => h.id === holeId) ?? null, [holes, holeId]);
  // in_bag = in the ACTIVE bag. Switching bags here changes the active bag
  // app-wide (it's the bag you're carrying), not just for this hole.
  const bagDiscs = useMemo(() => discs.filter((d) => d.in_bag), [discs]);
  const activeBag = useMemo(
    () => bags.find((b) => b.id === activeBagId) ?? null,
    [bags, activeBagId]
  );
  const switchBag = useCallback(async (bagId: number) => {
    setBagMenuOpen(false);
    await setActiveBag(bagId);
    const [ds, bs] = await Promise.all([listDiscs(), listBags()]);
    setDiscs(ds);
    setBags(bs);
    setActiveBagId(bagId);
  }, []);
  const selectedDisc = useMemo(
    () => discs.find((d) => d.id === discId) ?? null,
    [discs, discId]
  );

  // Quick-pick chips: the bag, with the currently-selected disc guaranteed to
  // appear even if it's shelved. The dashed "All discs" chip opens the picker.
  const quickChips = useMemo(() => {
    const chips = bagDiscs.slice(0, 6);
    if (selectedDisc && !chips.some((d) => d.id === selectedDisc.id)) {
      return [selectedDisc, ...chips];
    }
    return chips;
  }, [bagDiscs, selectedDisc]);

  // Shape chips come from the DB (built-ins + user shapes). Keep the current
  // shape visible even if it was deleted from the list, like disc quick-chips.
  const shapeChips = useMemo<Shape[]>(() => {
    if (shotShape && !shapes.some((s) => s.name === shotShape)) {
      return [{ id: -1, name: shotShape, is_overhand: false, is_builtin: false }, ...shapes];
    }
    return shapes;
  }, [shapes, shotShape]);

  const overhandLocked =
    shapes.find((s) => s.name === shotShape)?.is_overhand ?? false;

  const pickShape = (shape: Shape) => {
    if (shotShape === shape.name) {
      setShotShape(null);
      return;
    }
    setShotShape(shape.name);
    if (shape.is_overhand) setThrowType('Overhand');
  };

  const reloadShapes = async () => setShapes(await listShapes());

  const handleAddShape = async () => {
    const name = newShapeName.trim();
    if (!name) return;
    await createShape(name);
    await reloadShapes();
    setShotShape(name); // select the shape you just added
    setNewShapeName('');
    setAddShapeOpen(false);
  };

  const handleDeleteShape = (shape: Shape) => {
    if (shape.is_builtin || shape.id < 0) return;
    confirmAction({
      title: `Delete "${shape.name}"?`,
      message: 'Removes this shape from the list. Plans already using it keep it.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteShape(shape.id);
        if (shotShape === shape.name) setShotShape(null);
        await reloadShapes();
      },
    });
  };

  // Add a disc without leaving the plan flow, then auto-select it for this hole
  // (you added it because you want to throw it here).
  const handleAddDisc = async (input: NewDiscInput) => {
    const newId = await createDisc(input);
    setDiscs(await listDiscs());
    setDiscId(newId);
  };

  const nextHole = useMemo(() => {
    if (!hole) return null;
    return holes.find((h) => h.hole_number > hole.hole_number) ?? null;
  }, [holes, hole]);

  const prevHole = useMemo(() => {
    if (!hole) return null;
    return [...holes].reverse().find((h) => h.hole_number < hole.hole_number) ?? null;
  }, [holes, hole]);

  // Write this hole if anything changed since it loaded. Every way off the
  // hole goes through here — the save button, the ‹ › arrows, and back (button,
  // swipe, or Android back) — so leaving never drops edits.
  const persist = useCallback(async () => {
    const loaded = loadedRef.current;
    if (!loaded) return;
    const draft: Draft = {
      discId,
      throwType: overhandLocked ? 'Overhand' : throwType,
      shotShape,
      aim,
      par,
      distanceFt: parseDistance(distance),
    };
    if (sameDraft(draft, loaded)) return;
    await saveHolePlan(layoutId, holeId, {
      disc_id: draft.discId,
      throw_type: draft.throwType,
      shot_shape: draft.shotShape,
      aim_note: draft.aim,
    });
    if (draft.par !== loaded.par || draft.distanceFt !== loaded.distanceFt) {
      await updateHole({ id: holeId, par: draft.par, distance_ft: draft.distanceFt });
      setHoles((prev) =>
        prev.map((h) =>
          h.id === holeId ? { ...h, par: draft.par, distance_ft: draft.distanceFt } : h
        )
      );
    }
    loadedRef.current = draft;
  }, [layoutId, holeId, discId, throwType, overhandLocked, shotShape, aim, par, distance]);

  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        e.preventDefault();
        void persistRef.current().finally(() => navigation.dispatch(e.data.action));
      }),
    [navigation]
  );

  const goToHole = useCallback(
    async (target: Hole) => {
      await persist();
      navigation.setParams({ holeId: target.id });
    },
    [persist, navigation]
  );

  const handleSave = useCallback(async () => {
    if (nextHole) {
      await goToHole(nextHole);
    } else {
      navigation.goBack(); // beforeRemove saves
    }
  }, [nextHole, goToHole, navigation]);

  // Clear the revise flag once you've addressed it. Manual only — opening a
  // plan to look at it shouldn't dismiss the reminder.
  const handleResolveReview = useCallback(async () => {
    setNeedsReview(false);
    setReviewNote(null);
    await setHolePlanReview(holeId, false);
  }, [holeId]);

  if (loading || !layout || !hole) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MODE.plan} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ {layout.name}</Text>
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Plan</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.holeRow}>
            <Text style={styles.holeNumeral}>
              Hole {hole.hole_number}
              <Text style={styles.holeOf}> of {holes.length}</Text>
            </Text>
            <View style={styles.holeNav}>
              <HoleArrow
                icon="chevron-back"
                target={prevHole}
                label="Previous hole"
                onPress={goToHole}
              />
              <HoleArrow
                icon="chevron-forward"
                target={nextHole}
                label="Next hole"
                onPress={goToHole}
              />
            </View>
          </View>

          <View style={styles.factsCard}>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Par</Text>
              <View style={[styles.segmented, styles.factControl]}>
                {PARS.map((p) => {
                  const on = par === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPar(p)}
                      style={[styles.segment, on && styles.segmentOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`Par ${p}`}
                    >
                      <Text style={[styles.segmentLabel, on && styles.segmentLabelOn]}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Distance</Text>
              <View style={[styles.distRow, styles.factControl]}>
                <TextInput
                  style={styles.distInput}
                  value={distance}
                  onChangeText={(t) => setDistance(t.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="—"
                  placeholderTextColor={SHELL.textFaint}
                  returnKeyType="done"
                  accessibilityLabel="Distance in feet"
                />
                <Text style={styles.distSuffix}>ft</Text>
              </View>
            </View>
          </View>

          <Section
            label={`Disc — from ${activeBag?.name ?? 'your bag'}`}
            accessory={
              bags.length > 1 ? (
                <Pressable
                  onPress={() => setBagMenuOpen(true)}
                  hitSlop={10}
                  style={styles.switchBag}
                  accessibilityRole="button"
                  accessibilityLabel="Switch bag"
                >
                  <Text style={styles.switchBagLabel}>Switch bag</Text>
                  <Ionicons name="chevron-down" size={14} color={SHELL.textSecondary} />
                </Pressable>
              ) : null
            }
          >
            <View style={styles.chipWrap}>
              {quickChips.map((d) => {
                const on = d.id === discId;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setDiscId(on ? null : d.id)}
                    style={[styles.discChip, on && styles.discChipOn]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: d.color }]} />
                    <Text style={[styles.discChipLabel, on && styles.discChipLabelOn]}>
                      {discDisplayName(d)}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.allDiscsChip}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.allDiscsLabel}>
                  All {bagDiscs.length} discs…
                </Text>
              </Pressable>
              <Pressable
                style={styles.addDiscChip}
                onPress={() => setAddDiscOpen(true)}
              >
                <Text style={styles.addDiscLabel}>+ Add</Text>
              </Pressable>
            </View>
          </Section>

          <Section label="Throw">
            <View style={styles.segmented}>
              {THROW_TYPES.map((t) => {
                const on = throwType === t;
                const disabled = overhandLocked && t !== 'Overhand';
                return (
                  <Pressable
                    key={t}
                    disabled={disabled}
                    onPress={() => {
                      // Overhand is mandatory for an overhand shape — no deselect.
                      if (overhandLocked) return;
                      setThrowType(on ? null : t);
                    }}
                    style={[
                      styles.segment,
                      on && styles.segmentOn,
                      disabled && styles.segmentDisabled,
                    ]}
                  >
                    <Text style={[styles.segmentLabel, on && styles.segmentLabelOn]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {overhandLocked && (
              <Text style={styles.lockHint}>
                {shotShape} is an overhand shot — throw is locked to Overhand.
              </Text>
            )}
          </Section>

          <Section label="Shape">
            <View style={styles.chipWrap}>
              {shapeChips.map((shape) => {
                const on = shotShape === shape.name;
                return (
                  <Pressable
                    key={shape.name}
                    onPress={() => pickShape(shape)}
                    onLongPress={() => handleDeleteShape(shape)}
                    delayLongPress={350}
                    style={[styles.shapeChip, on && styles.shapeChipOn]}
                  >
                    <Text style={[styles.shapeLabel, on && styles.shapeLabelOn]}>
                      {shape.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.addDiscChip}
                onPress={() => {
                  setNewShapeName('');
                  setAddShapeOpen(true);
                }}
              >
                <Text style={styles.addDiscLabel}>+ Add</Text>
              </Pressable>
            </View>
            <Text style={styles.shapeHint}>Long-press a shape you added to remove it.</Text>
          </Section>

          <Section label="Note">
            <TextInput
              style={styles.aimInput}
              value={aim}
              onChangeText={setAim}
              multiline
              placeholder="Your note for this hole — where to aim, hazards, anything to remember…"
              placeholderTextColor={SHELL.textFaint}
              textAlignVertical="top"
            />
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          {/* The revise flag lives in the footer, not the scroll, so the note
              stays readable while you edit (it sits just above the keyboard
              when typing the aim note) and Resolve is in thumb reach. */}
          {needsReview && (
            <View style={styles.reviewBanner}>
              <Ionicons name="flag" size={16} color={REVIEW_AMBER} />
              <Pressable
                style={styles.reviewBannerBody}
                onPress={() => setReviewExpanded((v) => !v)}
                disabled={!reviewNote}
                accessibilityHint={reviewNote ? 'Shows the whole note' : undefined}
              >
                <Text style={styles.reviewBannerText}>Flagged to revise.</Text>
                {reviewNote && (
                  <Text
                    style={styles.reviewBannerNote}
                    numberOfLines={reviewExpanded ? undefined : 2}
                  >
                    “{reviewNote}”
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => void handleResolveReview()}
                hitSlop={8}
                style={styles.resolveBtn}
              >
                <Text style={styles.resolveLabel}>Resolve</Text>
              </Pressable>
            </View>
          )}
          <Pressable style={styles.saveBtn} onPress={() => void handleSave()}>
            <Text style={styles.saveLabel}>
              {nextHole ? 'Save · next hole ›' : 'Save · done ›'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <DiscPickerSheet
        visible={pickerOpen}
        discs={discs}
        selectedId={discId}
        onPick={(id) => {
          setDiscId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
        bagName={activeBag?.name}
        onAddDisc={() => {
          setPickerOpen(false);
          setAddDiscOpen(true);
        }}
      />

      <AddDiscSheet
        visible={addDiscOpen}
        onClose={() => setAddDiscOpen(false)}
        onSubmit={handleAddDisc}
        bagName={activeBag?.name}
      />

      <Modal
        visible={bagMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBagMenuOpen(false)}
      >
        <Pressable style={styles.modalWrap} onPress={() => setBagMenuOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Which bag are you carrying?</Text>
            {bags.map((b) => {
              const on = b.id === activeBagId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => void switchBag(b.id)}
                  style={({ pressed }) => [styles.bagOption, pressed && styles.bagOptionPressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View
                    style={[
                      styles.bagOptionDot,
                      b.color ? { backgroundColor: b.color, borderColor: b.color } : null,
                    ]}
                  />
                  <Text style={styles.bagOptionName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.bagOptionCount}>{b.disc_count}</Text>
                  <View style={styles.bagOptionCheck}>
                    {on && <Ionicons name="checkmark" size={20} color={SHELL.text} />}
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={addShapeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddShapeOpen(false)}
      >
        <View style={styles.modalWrap}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAddShapeOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New shape</Text>
            <TextInput
              style={styles.modalInput}
              value={newShapeName}
              onChangeText={setNewShapeName}
              placeholder="e.g. Hyzer flip"
              placeholderTextColor={SHELL.textFaint}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => void handleAddShape()}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setAddShapeOpen(false)} hitSlop={8}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalAdd, !newShapeName.trim() && styles.modalAddDisabled]}
                disabled={!newShapeName.trim()}
                onPress={() => void handleAddShape()}
              >
                <Text style={styles.modalAddLabel}>Add shape</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HoleArrow({
  icon,
  target,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  target: Hole | null;
  label: string;
  onPress: (hole: Hole) => void;
}) {
  return (
    <Pressable
      onPress={() => target && onPress(target)}
      disabled={!target}
      style={({ pressed }) => [styles.holeArrow, pressed && styles.holeArrowPressed]}
      accessibilityRole="button"
      accessibilityLabel={target ? `${label}: hole ${target.hole_number}` : label}
      accessibilityState={{ disabled: !target }}
    >
      <Ionicons
        name={icon}
        size={28}
        color={target ? SHELL.text : SHELL.textFaint}
      />
    </Pressable>
  );
}

function Section({
  label,
  accessory,
  children,
}: {
  label: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel} numberOfLines={1}>
          {label}
        </Text>
        {accessory}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHELL.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SHELL.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  back: { fontFamily: FONT.b600, fontSize: 16, color: SHELL.textSecondary },
  badge: {
    backgroundColor: MODE.plan,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeLabel: { fontFamily: FONT.bc700, fontSize: 13, color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 22 },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(224,147,43,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(224,147,43,0.45)',
  },
  reviewBannerBody: { flex: 1, gap: 4 },
  reviewBannerText: { fontFamily: FONT.b600, fontSize: 14, color: SHELL.text },
  reviewBannerNote: { fontFamily: FONT.b500, fontSize: 14, lineHeight: 19, color: SHELL.textSecondary },
  resolveBtn: {
    backgroundColor: REVIEW_AMBER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resolveLabel: { fontFamily: FONT.bc700, fontSize: 14, color: '#1a1200' },
  holeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -12,
  },
  holeNumeral: { fontFamily: FONT.bc800, fontSize: 44, color: SHELL.text },
  holeOf: { fontFamily: FONT.bc700, fontSize: 20, color: SHELL.textMuted },
  holeNav: { flexDirection: 'row', gap: 8, marginRight: -8 },
  holeArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeArrowPressed: { backgroundColor: SHELL.card },
  factsCard: {
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  factRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  factLabel: { width: 72, fontFamily: FONT.bc700, fontSize: 16, color: SHELL.textSecondary },
  factControl: { flex: 1 },
  factDivider: { height: 1, backgroundColor: SHELL.border },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distInput: {
    width: 96,
    backgroundColor: SHELL.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONT.b600,
    fontSize: 16,
    color: SHELL.text,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  distSuffix: { fontFamily: FONT.b500, fontSize: 14, color: SHELL.textMuted },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchBag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  switchBagLabel: { fontFamily: FONT.b600, fontSize: 13, color: SHELL.textSecondary },
  bagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  bagOptionPressed: { backgroundColor: SHELL.bg },
  bagOptionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: SHELL.textMuted,
  },
  bagOptionName: { flex: 1, fontFamily: FONT.b600, fontSize: 16, color: SHELL.text },
  bagOptionCount: { fontFamily: FONT.b600, fontSize: 14, color: SHELL.textMuted },
  bagOptionCheck: { width: 22, alignItems: 'center' },
  sectionLabel: {
    flexShrink: 1,
    fontFamily: FONT.bc700,
    fontSize: 12,
    color: SHELL.textMuted,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  discChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  discChipOn: { backgroundColor: MODE.plan, borderColor: MODE.plan },
  chipDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  discChipLabel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.text },
  discChipLabelOn: { color: '#fff' },
  allDiscsChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SHELL.dashed,
    borderStyle: 'dashed',
  },
  allDiscsLabel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textSecondary },
  addDiscChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MODE.plan,
  },
  addDiscLabel: { fontFamily: FONT.b700, fontSize: 15, color: MODE.plan },
  segmented: {
    flexDirection: 'row',
    backgroundColor: SHELL.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: SHELL.border,
    gap: 4,
  },
  segment: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9 },
  segmentOn: { backgroundColor: MODE.plan },
  segmentDisabled: { opacity: 0.35 },
  segmentLabel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textSecondary },
  segmentLabelOn: { color: '#fff' },
  lockHint: { fontFamily: FONT.b500, fontSize: 13, color: SHELL.textMuted },
  shapeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  shapeChipOn: { backgroundColor: MODE.plan, borderColor: MODE.plan },
  shapeLabel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textSecondary },
  shapeLabelOn: { color: '#fff' },
  shapeHint: { fontFamily: FONT.b500, fontSize: 12, color: SHELL.textFaint, marginTop: 2 },
  modalWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    width: '100%',
    backgroundColor: SHELL.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: SHELL.border,
    gap: 14,
  },
  modalTitle: { fontFamily: FONT.bc700, fontSize: 14, color: SHELL.textMuted },
  modalInput: {
    backgroundColor: SHELL.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT.b600,
    fontSize: 17,
    color: SHELL.text,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 18 },
  modalCancel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textMuted },
  modalAdd: {
    backgroundColor: MODE.plan,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  modalAddDisabled: { opacity: 0.4 },
  modalAddLabel: { fontFamily: FONT.bc700, fontSize: 15, color: '#fff' },
  aimInput: {
    minHeight: 96,
    backgroundColor: SHELL.card,
    borderRadius: 14,
    padding: 14,
    fontFamily: FONT.b500,
    fontSize: 16,
    lineHeight: 22,
    color: SHELL.text,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SHELL.border,
    backgroundColor: SHELL.bg,
  },
  saveBtn: {
    backgroundColor: MODE.plan,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveLabel: { fontFamily: FONT.bc800, fontSize: 18, color: '#fff' },
});
