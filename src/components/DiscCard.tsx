import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { UI } from '../theme/colors';
import type { DiscWithTags } from '../db/discs';
import { InBagButton } from './InBagButton';

type Props = {
  disc: DiscWithTags;
  onToggleInBag: () => void;
  onDelete: () => void;
  onOpen: (methods: SwipeableMethods) => void;
};

export function DiscCard({ disc, onToggleInBag, onDelete, onOpen }: Props) {
  const ref = useRef<SwipeableMethods>(null);

  const renderRightActions = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        ref.current?.close();
        onDelete();
      }}
      accessibilityLabel={`Delete ${disc.manufacturer} ${disc.model}`}
    >
      <Text style={styles.deleteLabel}>Delete</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (ref.current) onOpen(ref.current);
      }}
    >
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: disc.color }]} />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.model} numberOfLines={1}>
              {disc.model}
            </Text>
            <Text style={styles.category}>{disc.category}</Text>
          </View>
          <Text style={styles.manufacturer} numberOfLines={1}>
            {disc.manufacturer}
          </Text>
          {disc.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {disc.tags.map((t) => (
                <View key={t.id} style={styles.tagChip}>
                  <Text style={styles.tagText}>{t.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <InBagButton inBag={disc.in_bag} onToggle={onToggleInBag} />
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    gap: 12,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
  },
  body: { flex: 1, minWidth: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  model: { fontSize: 16, fontWeight: '600', color: UI.text, flexShrink: 1 },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
  },
  manufacturer: { fontSize: 13, color: UI.textMuted, marginTop: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: UI.surface,
  },
  tagText: { fontSize: 11, color: UI.textMuted },
  deleteAction: {
    backgroundColor: UI.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  deleteLabel: {
    color: UI.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
