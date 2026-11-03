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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AddDiscSheet } from '../components/AddDiscSheet';
import { DiscCard } from '../components/DiscCard';
import { countPlansUsingDisc } from '../db/plans';
import {
  createDisc,
  deleteDisc,
  listDiscs,
  setInBag,
  updateDisc,
  type DiscWithTags,
  type NewDiscInput,
} from '../db/discs';
import { getDiscSort, setDiscSort, getBagColor, setBagColor } from '../db/settings';
import {
  CATEGORY_GROUP_LABELS,
  DEFAULT_DISC_SORT,
  DISC_CATEGORIES,
  type DiscSort,
} from '../db/types';
import { DISC_SWATCHES, FONT, SHELL, UI } from '../theme/colors';
import { confirmAction } from '../util/confirm';
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

// Grouped by category in bag order (drivers → fairways → mids → putters), with
// shelved discs in their own section at the bottom. The active sort still
// applies — it just orders discs *within* each group now.
function buildSections(rows: DiscWithTags[]): DiscSection[] {
  const sections: DiscSection[] = [];
  for (const cat of DISC_CATEGORIES) {
    const data = rows.filter((d) => d.in_bag && d.category === cat);
    if (data.length > 0) {
      sections.push({ key: cat, title: CATEGORY_GROUP_LABELS[cat], data });
    }
  }
  const shelved = rows.filter((d) => !d.in_bag);
  if (shelved.length > 0) {
    sections.push({ key: 'shelved', title: 'Shelved', data: shelved });
  }
  return sections;
}

export function MyDiscsScreen() {
  const navigation = useNavigation<Nav>();
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [sortValue, setSortValue] = useState<DiscSort>(DEFAULT_DISC_SORT);
  const [bagColor, setBagColorState] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<DiscWithTags | null>(null);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const openRow = useRef<SwipeableMethods | null>(null);

  const refresh = useCallback(async () => {
    const [rows, sort, color] = await Promise.all([
      listDiscs(),
      getDiscSort(),
      getBagColor(),
    ]);
    setDiscs(rows);
    setSortValue(sort);
    setBagColorState(color);
  }, []);

  const sections = useMemo(() => buildSections(discs ?? []), [discs]);
  const caption = useMemo(() => {
    if (discs === null) return '';
    const inBag = discs.filter((d) => d.in_bag).length;
    const shelved = discs.length - inBag;
    const bag = `${inBag} in bag`;
    return shelved > 0 ? `${bag} · ${shelved} shelved` : bag;
  }, [discs]);

  const pickBagColor = useCallback(async (color: string | null) => {
    setBagColorState(color);
    await setBagColor(color);
  }, []);

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

  const handleDelete = useCallback(
    async (disc: DiscWithTags) => {
      const plans = await countPlansUsingDisc(disc.id);
      const planNote =
        plans > 0
          ? ` ${plans} hole ${plans === 1 ? 'plan uses' : 'plans use'} this disc — deleting clears it from ${plans === 1 ? 'that plan' : 'those plans'}, but the rest of each plan stays.`
          : '';
      confirmAction({
        title: `Delete ${disc.nickname ?? disc.model}?`,
        message: `Remove ${disc.model} from your collection.${planNote} This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        onConfirm: async () => {
          await deleteDisc(disc.id);
          openRow.current = null;
          await refresh();
        },
      });
    },
    [refresh]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>My Bag</Text>
            {caption.length > 0 && (
              <Text style={styles.caption}>{caption}</Text>
            )}
          </View>
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

      <View style={styles.bagColorRow}>
        <Text style={styles.bagColorLabel}>Bag color</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchStrip}
        >
          <Pressable
            onPress={() => void pickBagColor(null)}
            style={[styles.swatchNone, bagColor === null && styles.swatchSel]}
            accessibilityLabel="Default bag color"
          >
            <Text style={styles.swatchNoneLabel}>None</Text>
          </Pressable>
          {DISC_SWATCHES.map((hex) => (
            <Pressable
              key={hex}
              onPress={() => void pickBagColor(hex)}
              style={[
                styles.swatch,
                { backgroundColor: hex },
                bagColor === hex && styles.swatchSel,
              ]}
              accessibilityLabel={`Bag color ${hex}`}
            />
          ))}
        </ScrollView>
      </View>

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
        Add the discs you throw. Mark favorites as in-bag for tournaments.
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { fontSize: 28, color: UI.textMuted, lineHeight: 30 },
  title: { fontFamily: FONT.bc800, fontSize: 28, color: SHELL.text },
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
  bagColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  bagColorLabel: { fontFamily: FONT.bc700, fontSize: 13, color: SHELL.textMuted },
  swatchStrip: { gap: 8, alignItems: 'center', paddingRight: 8 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchNone: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  swatchNoneLabel: { fontFamily: FONT.b600, fontSize: 12, color: SHELL.textMuted },
  swatchSel: { borderWidth: 3, borderColor: UI.text },
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
