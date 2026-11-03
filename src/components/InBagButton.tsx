import { Pressable, StyleSheet, Text } from 'react-native';
import {
  contrastText,
  FONT,
  INBAG_GREEN,
  readableOnDark,
  SHELL,
} from '../theme/colors';

type Props = {
  inBag: boolean;
  onToggle: () => void;
  /** The user's bag color. Carries BOTH states: a solid fill once bagged, and
   * the label color while unbagged — so "+ Bag" still reads as an action
   * rather than a disabled control. */
  bagColor?: string | null;
};

export function InBagButton({ inBag, onToggle, bagColor }: Props) {
  const fill = bagColor ?? INBAG_GREEN;
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={[
        styles.pill,
        inBag ? { backgroundColor: fill, borderColor: fill } : styles.off,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: inBag }}
      accessibilityLabel={inBag ? 'Remove from bag' : 'Add to bag'}
    >
      <Text
        style={[
          styles.label,
          { color: inBag ? contrastText(fill) : readableOnDark(fill, SHELL.text) },
        ]}
      >
        {inBag ? 'In Bag' : '+ Bag'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 68,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { backgroundColor: SHELL.bg, borderColor: SHELL.border },
  label: { fontFamily: FONT.b700, fontSize: 14 },
});
