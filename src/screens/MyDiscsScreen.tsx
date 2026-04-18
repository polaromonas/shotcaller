import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  createDisc,
  deleteDisc,
  listDiscs,
  setInBag,
  type DiscWithTags,
  type NewDiscInput,
} from '../db/discs';
import { UI } from '../theme/colors';

export function MyDiscsScreen() {
  const [discs, setDiscs] = useState<DiscWithTags[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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
      await createDisc(input);
      await refresh();
    },
    [refresh]
  );

  const handleToggleInBag = useCallback(
    async (disc: DiscWithTags) => {
      await setInBag(disc.id, !disc.in_bag);
      await refresh();
    },
    [refresh]
  );

  const handleDelete = useCallback(
    (disc: DiscWithTags) => {
      Alert.alert(
        `Delete ${disc.model}?`,
        `Remove ${disc.manufacturer} ${disc.model} from your collection. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteDisc(disc.id);
              openRow.current = null;
              await refresh();
            },
          },
        ]
      );
    },
    [refresh]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My discs</Text>
        <Pressable
          onPress={() => setSheetOpen(true)}
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
        <EmptyState onAdd={() => setSheetOpen(true)} />
      ) : (
        <FlatList
          data={discs}
          keyExtractor={(d) => String(d.id)}
          renderItem={({ item }) => (
            <DiscCard
              disc={item}
              onToggleInBag={() => handleToggleInBag(item)}
              onDelete={() => handleDelete(item)}
              onOpen={handleRowOpen}
            />
          )}
        />
      )}

      <AddDiscSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
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
