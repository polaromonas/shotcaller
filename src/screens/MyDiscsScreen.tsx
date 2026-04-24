import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { UI } from '../theme/colors';
import { confirmAction } from '../util/confirm';

export function MyDiscsScreen() {
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<DiscWithTags | null>(null);
  const openRow = useRef<SwipeableMethods | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listDiscs();
    setDiscs(rows);
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
    </SafeAreaView>
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
});
