import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { FONT, SHELL, UI } from '../theme/colors';
import {
  discDisplayName,
  discFlightText,
  discSubline,
  type DiscWithTags,
} from '../db/discs';
import { InBagButton } from './InBagButton';

type Props = {
  disc: DiscWithTags;
  onPress: () => void;
  onToggleInBag: () => void;
  onDelete: () => void;
  onOpen: (methods: SwipeableMethods) => void;
  bagColor?: string | null;
};

export function DiscCard({
  disc,
  onPress,
  onToggleInBag,
  onDelete,
  onOpen,
  bagColor,
}: Props) {
  const ref = useRef<SwipeableMethods>(null);
  const name = discDisplayName(disc);
  // The category section header above this card already names the category, so
  // the subline carries plastic (+ model when nicknamed) and nothing else.
  const subline = discSubline(disc, { withCategory: false });
  const flight = discFlightText(disc);

  const renderRightActions = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        ref.current?.close();
        onDelete();
      }}
      accessibilityLabel={`Delete ${name}`}
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
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          !disc.in_bag && styles.cardShelved,
          pressed && styles.cardPressed,
        ]}
        accessibilityLabel={`Edit ${name}`}
      >
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: disc.color }]} />

          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>

            {(subline.length > 0 || flight !== null) && (
              <View style={styles.metaRow}>
                <Text style={styles.subline} numberOfLines={1}>
                  {subline}
                </Text>
                {flight !== null && (
                  <Text style={styles.flight}>{flight}</Text>
                )}
              </View>
            )}

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

          {/* Centered against the whole text block, so the card has one
              right-hand anchor however many lines the left column runs to. */}
          <View style={styles.action}>
            <InBagButton
              inBag={disc.in_bag}
              onToggle={onToggleInBag}
              bagColor={bagColor}
            />
          </View>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const DOT = 22;

const styles = StyleSheet.create({
  card: {
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  cardPressed: { backgroundColor: SHELL.selectedFill },
  // Shelved discs stay visible but recede — they're out of the pickers.
  cardShelved: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 3,
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontFamily: FONT.bc700, fontSize: 20, color: SHELL.text },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  subline: {
    flexShrink: 1,
    fontFamily: FONT.b500,
    fontSize: 13,
    color: SHELL.textSecondary,
  },
  flight: {
    flexShrink: 0,
    fontFamily: FONT.bc700,
    fontSize: 14,
    color: SHELL.textMuted,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: SHELL.bg,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  tagText: { fontFamily: FONT.b500, fontSize: 11, color: SHELL.textMuted },
  action: { alignSelf: 'center' },
  deleteAction: {
    backgroundColor: UI.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginRight: 16,
    marginBottom: 8,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteLabel: {
    fontFamily: FONT.b600,
    color: UI.textInverse,
    fontSize: 15,
  },
});
