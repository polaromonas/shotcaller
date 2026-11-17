import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AddDiscSheet } from '../components/AddDiscSheet';
import { DeleteDiscSheet } from '../components/DeleteDiscSheet';
import { BagSheet } from '../components/BagSheet';
import { DiscCard } from '../components/DiscCard';
import { countPlansUsingDisc } from '../db/plans';
import {
  createDisc,
  deleteDisc,
  isShelved,
  listDiscs,
  setInBag,
  updateDisc,
  type DiscWithTags,
  type NewDiscInput,
} from '../db/discs';
import { getDiscSort, setDiscSort } from '../db/settings';
import {
  createBag,
  deleteBag,
  getActiveBagId,
  listBags,
  setActiveBag,
  shelveDisc,
  updateBag,
  type Bag,
} from '../db/bags';
import { confirmAction } from '../util/confirm';
import {
  CATEGORY_GROUP_LABELS,
  DEFAULT_DISC_SORT,
  DISC_CATEGORIES,
  type DiscSort,
} from '../db/types';
import { FONT, SHELL, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MyDiscs'>;

const SORT_OPTIONS: { value: DiscSort; label: string; hint: string }[] = [
  {
    value: 'bag-order',
    label: 'Bag order',
    hint: 'Drivers → fairways → mids → putters; fastest first within each',
  },
  {
    value: 'alphabetical',
    label: 'Alphabetical',
    hint: 'By disc model name',
  },
  {
    value: 'speed-fast',
    label: 'Speed (fast → slow)',
    hint: 'Highest speed first',
  },
  {
    value: 'speed-slow',
    label: 'Speed (slow → fast)',
    hint: 'Lowest speed first',
  },
];

const labelFor = (s: DiscSort): string =>
  SORT_OPTIONS.find((o) => o.value === s)?.label ?? s;

type DiscSection = { key: string; title: string; data: DiscWithTags[] };

// The active bag's discs grouped by category in bag order (drivers → fairways
// → mids → putters), then discs that are only in other bags, then shelved
// discs (in no bag). The active sort orders discs *within* each group.
function buildSections(rows: DiscWithTags[]): DiscSection[] {
  const sections: DiscSection[] = [];
  for (const cat of DISC_CATEGORIES) {
    const data = rows.filter((d) => d.in_bag && d.category === cat);
    if (data.length > 0) {
      sections.push({ key: cat, title: CATEGORY_GROUP_LABELS[cat], data });
    }
  }
  const elsewhere = rows.filter((d) => !d.in_bag && !isShelved(d));
  if (elsewhere.length > 0) {
    sections.push({ key: 'elsewhere', title: 'In other bags', data: elsewhere });
  }
  const shelved = rows.filter((d) => isShelved(d));
  if (shelved.length > 0) {
    sections.push({ key: 'shelved', title: 'Shelved', data: shelved });
  }
  return sections;
}

export function MyDiscsScreen() {
  const navigation = useNavigation<Nav>();
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [sortValue, setSortValue] = useState<DiscSort>(DEFAULT_DISC_SORT);
  const [bags, setBags] = useState<Bag[]>([]);
  const [activeBagId, setActiveBagId] = useState<number | null>(null);
  // undefined = closed; null = creating; a Bag = editing it.
  const [bagSheet, setBagSheet] = useState<Bag | null | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<DiscWithTags | null>(null);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const openRow = useRef<SwipeableMethods | null>(null);

  const refresh = useCallback(async () => {
    const [rows, sort, allBags, activeId] = await Promise.all([
      listDiscs(),
      getDiscSort(),
      listBags(),
      getActiveBagId(),
    ]);
    setDiscs(rows);
    setSortValue(sort);
    setBags(allBags);
    setActiveBagId(activeId);
  }, []);

  const activeBag = useMemo(
    () => bags.find((b) => b.id === activeBagId) ?? null,
    [bags, activeBagId]
  );
  const bagColor = activeBag?.color ?? null;

  const sections = useMemo(() => buildSections(discs ?? []), [discs]);
  const caption = useMemo(() => {
    if (discs === null) return '';
    const inBag = discs.filter((d) => d.in_bag).length;
    const shelved = discs.filter((d) => isShelved(d)).length;
    const bag = `${inBag} ${inBag === 1 ? 'disc' : 'discs'}`;
    return shelved > 0 ? `${bag} · ${shelved} shelved` : bag;
  }, [discs]);

  const switchBag = useCallback(
    async (bagId: number) => {
      if (bagId === activeBagId) return;
      openRow.current?.close();
      openRow.current = null;
      await setActiveBag(bagId);
      await refresh();
    },
    [activeBagId, refresh]
  );

  const saveBag = useCallback(
    async (input: { name: string; color: string | null }) => {
      const editing = bagSheet;
      setBagSheet(undefined);
      if (editing) {
        await updateBag(editing.id, input);
      } else {
        // A new bag becomes the one you're looking at, ready to fill.
        await setActiveBag(await createBag(input));
      }
      await refresh();
    },
    [bagSheet, refresh]
  );

  const confirmDeleteBag = useCallback(() => {
    const bag = bagSheet;
    if (!bag) return;
    setBagSheet(undefined);
    const discs = bag.disc_count === 1 ? '1 disc' : `${bag.disc_count} discs`;
    confirmAction({
      title: `Delete ${bag.name}?`,
      message:
        bag.disc_count > 0
          ? `Its ${discs} stay in your collection and in any other bags. Only the bag is removed.`
          : 'This bag is empty. Only the bag is removed.',
      confirmLabel: 'Delete bag',
      destructive: true,
      onConfirm: async () => {
        await deleteBag(bag.id);
        await refresh();
      },
    });
  }, [bagSheet, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRowOpen = useCallback((methods: SwipeableMethods) => {
    if (openRow.current && openRow.current !== methods) {
      openRow.current.close();
    }
    openRow.current = methods;
  }, []);

  const handleSubmit = useCallback(
    async (input: NewDiscInput) => {
      if (editingDisc) {
        await updateDisc(editingDisc.id, input);
      } else {
        await createDisc(input);
      }
      await refresh();
    },
    [editingDisc, refresh]
  );

  const openAddSheet = useCallback(() => {
    setEditingDisc(null);
    setSheetOpen(true);
  }, []);

  const openEditSheet = useCallback((disc: DiscWithTags) => {
    if (openRow.current) {
      openRow.current.close();
      openRow.current = null;
    }
    setEditingDisc(disc);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingDisc(null);
  }, []);

  const handleToggleInBag = useCallback(
    async (disc: DiscWithTags) => {
      await setInBag(disc.id, !disc.in_bag);
      await refresh();
    },
    [refresh]
  );

  const handlePickSort = useCallback(
    async (value: DiscSort) => {
      setSortPickerOpen(false);
      await setDiscSort(value);
      await refresh();
    },
    [refresh]
  );

  // Delete opens the 8b sheet; shelving is offered first as the safe option.
  const [pendingDelete, setPendingDelete] = useState<{
    disc: DiscWithTags;
    planCount: number;
  } | null>(null);

  const handleDelete = useCallback(async (disc: DiscWithTags) => {
    setPendingDelete({ disc, planCount: await countPlansUsingDisc(disc.id) });
  }, []);

  const finishDelete = useCallback(
    async (action: 'shelve' | 'delete') => {
      if (!pendingDelete) return;
      const { disc } = pendingDelete;
      setPendingDelete(null);
      if (action === 'shelve') await shelveDisc(disc.id);
      else await deleteDisc(disc.id);
      openRow.current?.close();
      openRow.current = null;
      await refresh();
    },
    [pendingDelete, refresh]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Pressable
            onPress={() => activeBag && setBagSheet(activeBag)}
            style={styles.titleBtn}
            accessibilityRole="button"
            accessibilityLabel={`Edit bag ${activeBag?.name ?? ''}`}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {activeBag?.name ?? 'My Bag'}
              </Text>
              <Ionicons name="pencil" size={16} color={SHELL.textMuted} />
            </View>
            {caption.length > 0 && (
              <Text style={styles.caption}>{caption}</Text>
            )}
          </Pressable>
        </View>
        <Pressable
          onPress={openAddSheet}
          style={styles.addBtn}
          hitSlop={8}
          accessibilityLabel="Add disc"
        >
          <Text style={styles.addBtnLabel}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bagRow}
        contentContainerStyle={styles.bagStrip}
      >
        {bags.map((b) => {
          const on = b.id === activeBagId;
          return (
            <Pressable
              key={b.id}
              onPress={() => void switchBag(b.id)}
              style={[styles.bagChip, on && styles.bagChipOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${b.name}, ${b.disc_count} discs`}
            >
              <View
                style={[
                  styles.bagDot,
                  b.color ? { backgroundColor: b.color, borderColor: b.color } : null,
                ]}
              />
              <Text style={[styles.bagChipLabel, on && styles.bagChipLabelOn]} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.bagChipCount, on && styles.bagChipCountOn]}>
                {b.disc_count}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setBagSheet(null)}
          style={styles.newBagChip}
          accessibilityRole="button"
        >
          <Text style={styles.newBagLabel}>+ New bag</Text>
        </Pressable>
      </ScrollView>

      {discs !== null && discs.length > 0 && (
        <View style={styles.sortBar}>
          <Text style={styles.sortLabel}>Sorted by</Text>
          <Pressable
            onPress={() => setSortPickerOpen(true)}
            hitSlop={6}
            style={styles.sortPill}
          >
            <Text style={styles.sortPillLabel}>{labelFor(sortValue)}</Text>
            <Text style={styles.sortPillCaret}>▾</Text>
          </Pressable>
        </View>
      )}

      {discs === null ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : discs.length === 0 ? (
        <EmptyState onAdd={openAddSheet} />
      ) : (
        <SectionList
          sections={sections}
          extraData={bagColor}
          keyExtractor={(d) => String(d.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionLabel}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <DiscCard
              disc={item}
              onPress={() => openEditSheet(item)}
              onToggleInBag={() => handleToggleInBag(item)}
              onDelete={() => handleDelete(item)}
              onOpen={handleRowOpen}
              bagColor={bagColor}
            />
          )}
        />
      )}

      <AddDiscSheet
        visible={sheetOpen}
        disc={editingDisc}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        bagName={activeBag?.name}
      />

      <DeleteDiscSheet
        disc={pendingDelete?.disc ?? null}
        planCount={pendingDelete?.planCount ?? 0}
        onShelve={() => void finishDelete('shelve')}
        onDelete={() => void finishDelete('delete')}
        onClose={() => setPendingDelete(null)}
      />

      <BagSheet
        visible={bagSheet !== undefined}
        bag={bagSheet ?? null}
        canDelete={bags.length > 1}
        onSave={(input) => void saveBag(input)}
        onDelete={confirmDeleteBag}
        onClose={() => setBagSheet(undefined)}
      />

      <SortPicker
        visible={sortPickerOpen}
        current={sortValue}
        onPick={handlePickSort}
        onClose={() => setSortPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function SortPicker({
  visible,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  current: DiscSort;
  onPick: (value: DiscSort) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <Text style={styles.modalTitle}>Sort discs</Text>
          {SORT_OPTIONS.map((opt) => {
            const on = opt.value === current;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onPick(opt.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && styles.optionRowPressed,
                ]}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>
                {on && <Text style={styles.optionCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>No discs yet</Text>
      <Text style={styles.emptyBody}>
        Add the discs you own, then put them in bags — a disc can be in more than one.
      </Text>
      <Pressable style={styles.emptyBtn} onPress={onAdd}>
        <Text style={styles.emptyBtnLabel}>Add your first disc</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 12 },
  titleBtn: { flexShrink: 1, paddingVertical: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { fontSize: 28, color: UI.textMuted, lineHeight: 30 },
  title: { flexShrink: 1, fontFamily: FONT.bc800, fontSize: 28, color: SHELL.text },
  caption: { fontFamily: FONT.b500, fontSize: 13, color: SHELL.textMuted, marginTop: -2 },
  listContent: { paddingTop: 4, paddingBottom: 24 },
  sectionLabel: {
    fontFamily: FONT.bc700,
    fontSize: 12,
    color: SHELL.textMuted,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  addBtnLabel: { fontFamily: FONT.b600, fontSize: 14, color: SHELL.text },
  bagRow: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  bagStrip: { gap: 8, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  bagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  // Neutral surface: white selection, never a mode color.
  bagChipOn: { backgroundColor: SHELL.text, borderColor: SHELL.text },
  bagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: SHELL.textMuted,
  },
  bagChipLabel: { flexShrink: 1, fontFamily: FONT.b600, fontSize: 14, color: SHELL.text },
  bagChipLabelOn: { color: SHELL.bg },
  bagChipCount: { fontFamily: FONT.b600, fontSize: 13, color: SHELL.textMuted },
  bagChipCountOn: { color: SHELL.bg, opacity: 0.6 },
  newBagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: SHELL.dashed,
  },
  newBagLabel: { fontFamily: FONT.b600, fontSize: 14, color: SHELL.textSecondary },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: UI.bg,
  },
  sortLabel: { fontFamily: FONT.b500, fontSize: 12, color: SHELL.textMuted },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  sortPillLabel: { fontFamily: FONT.b600, fontSize: 12, color: SHELL.text },
  sortPillCaret: { fontSize: 10, color: UI.textMuted },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontFamily: FONT.bc800, fontSize: 26, color: SHELL.text },
  emptyBody: {
    fontFamily: FONT.b500,
    fontSize: 15,
    color: SHELL.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: UI.text,
    borderRadius: 12,
  },
  emptyBtnLabel: { fontFamily: FONT.b600, color: UI.bg, fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  modalTitle: {
    fontFamily: FONT.bc700,
    fontSize: 13,
    color: SHELL.textMuted,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  optionRowPressed: { backgroundColor: UI.surface },
  optionText: { flex: 1, minWidth: 0, gap: 2 },
  optionLabel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.text },
  optionHint: { fontFamily: FONT.b400, fontSize: 12, color: SHELL.textMuted },
  optionCheck: { fontFamily: FONT.b700, fontSize: 18, color: SHELL.text },
});
