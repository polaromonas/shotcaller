import { Pressable, StyleSheet, Text } from 'react-native';
import { contrastText, INBAG_GREEN, UI } from '../theme/colors';

type Props = {
  inBag: boolean;
  onToggle: () => void;
  /** The user's bag color; the "In bag" pill takes it (falling back to the
   * default green when unset) so the color reads as their bag identity. */
  bagColor?: string | null;
};

export function InBagButton({ inBag, onToggle, bagColor }: Props) {
  const fill = bagColor ?? INBAG_GREEN;
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={6}
      style={[styles.btn, inBag ? { backgroundColor: fill } : styles.off]}
      accessibilityRole="switch"
      accessibilityState={{ checked: inBag }}
      accessibilityLabel={inBag ? 'Remove from bag' : 'Add to bag'}
    >
      <Text
        style={[
          styles.label,
          inBag ? { color: contrastText(fill) } : styles.labelOff,
        ]}
      >
        {inBag ? 'In bag' : 'Add to bag'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 92,
    alignItems: 'center',
  },
  off: { backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.border },
  label: { fontSize: 13, fontWeight: '600' },
  labelOff: { color: UI.textMuted },
});
