import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AddDiscSheet } from '../components/AddDiscSheet';
import { DiscCard } from '../components/DiscCard';
import {
  countDiscDependents,
  createDisc,
  deleteDisc,
  deleteDiscCascade,
  listDiscs,
  setInBag,
  updateDisc,
  type DiscWithTags,
  type NewDiscInput,
} from '../db/discs';
import { getDiscSort, setDiscSort } from '../db/settings';
import { DEFAULT_DISC_SORT, type DiscSort } from '../db/types';
import { UI } from '../theme/colors';
import { confirmAction } from '../util/confirm';

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

export function MyDiscsScreen() {
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [sortValue, setSortValue] = useState<DiscSort>(DEFAULT_DISC_SORT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<DiscWithTags | null>(null);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const openRow = useRef<SwipeableMethods | null>(null);

  const refresh = useCallback(async () => {
    const [rows, sort] = await Promise.all([listDiscs(), getDiscSort()]);
    setDiscs(rows);
    setSortValue(sort);
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
      const deps = await countDiscDependents(disc.id);
      if (deps.throws > 0 || deps.planShots > 0) {
        const parts: string[] = [];
        if (deps.throws > 0) {
          parts.push(`${deps.throws} ${deps.throws === 1 ? 'throw' : 'throws'}`);
        }
        if (deps.planShots > 0) {
          parts.push(
            `${deps.planShots} game plan ${deps.planShots === 1 ? 'shot' : 'shots'}`
          );
        }
        confirmAction({
          title: `Delete ${disc.model}?`,
          message: `${parts.join(' and ')} reference this disc and will be deleted with it. This cannot be undone.`,
          confirmLabel: 'Delete anyway',
          destructive: true,
          onConfirm: async () => {
            await deleteDiscCascade(disc.id);
            openRow.current = null;
            await refresh();
          },
        });
        return;
      }
      confirmAction({
        title: `Delete ${disc.model}?`,
        message: `Remove ${disc.manufacturer} ${disc.model} from your collection. This cannot be undone.`,
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
        <Text style={styles.title}>My discs</Text>
        <Pressable
          onPress={openAddSheet}
          style={styles.addBtn}
          hitSlop={8}
          accessibilityLabel="Add disc"
        >
          <Text style={styles.addBtnLabel}>+ Add</Text>
        </Pressable>
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
        <FlatList
          data={discs}
          keyExtractor={(d) => String(d.id)}
          renderItem={({ item }) => (
            <DiscCard
              disc={item}
              onPress={() => openEditSheet(item)}
              onToggleInBag={() => handleToggleInBag(item)}
              onDelete={() => handleDelete(item)}
              onOpen={handleRowOpen}
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
  title: { fontSize: 22, fontWeight: '700', color: UI.text },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  addBtnLabel: { fontSize: 14, fontWeight: '600', color: UI.text },
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
  sortLabel: { fontSize: 12, color: UI.textMuted },
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
  sortPillLabel: { fontSize: 12, fontWeight: '600', color: UI.text },
  sortPillCaret: { fontSize: 10, color: UI.textMuted },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: UI.text },
  emptyBody: {
    fontSize: 14,
    color: UI.textMuted,
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
  emptyBtnLabel: { color: UI.textInverse, fontSize: 15, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: UI.bg,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  modalTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  optionLabel: { fontSize: 15, fontWeight: '600', color: UI.text },
  optionHint: { fontSize: 12, color: UI.textMuted },
  optionCheck: { fontSize: 18, color: UI.text, fontWeight: '700' },
});
