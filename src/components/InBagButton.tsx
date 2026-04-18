import { Pressable, StyleSheet, Text } from 'react-native';
import { INBAG_GREEN, UI } from '../theme/colors';

type Props = {
  inBag: boolean;
  onToggle: () => void;
};

export function InBagButton({ inBag, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={6}
      style={[styles.btn, inBag ? styles.on : styles.off]}
      accessibilityRole="switch"
      accessibilityState={{ checked: inBag }}
      accessibilityLabel={inBag ? 'Remove from bag' : 'Add to bag'}
    >
      <Text style={[styles.label, inBag ? styles.labelOn : styles.labelOff]}>
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
  on: { backgroundColor: INBAG_GREEN },
  off: { backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.border },
  label: { fontSize: 13, fontWeight: '600' },
  labelOn: { color: UI.textInverse },
  labelOff: { color: UI.textMuted },
});
