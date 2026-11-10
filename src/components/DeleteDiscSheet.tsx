import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { discDisplayName, type DiscWithTags } from '../db/discs';
import { FONT, SHELL, UI } from '../theme/colors';

type Props = {
  /** The disc being deleted; null hides the sheet. */
  disc: DiscWithTags | null;
  /** How many hole plans use this disc (deleting clears it from them). */
  planCount: number;
  onShelve: () => void;
  onDelete: () => void;
  onClose: () => void;
};

// Confirm-delete for a disc (design 8b). Shelving is the safe way out and is
// listed first: it hides the disc from pickers but leaves every plan intact.
// Already-shelved discs only get Delete / Cancel.
export function DeleteDiscSheet({ disc, planCount, onShelve, onDelete, onClose }: Props) {
  const plans = planCount === 1 ? '1 hole plan' : `${planCount} hole plans`;
  return (
    <Modal visible={disc !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      {disc && (
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: disc.color }]} />
            <Text style={styles.title} numberOfLines={1}>
              Delete {discDisplayName(disc)}?
            </Text>
          </View>
          <Text style={styles.body}>
            {planCount > 0 ? (
              <>
                <Text style={styles.bodyStrong}>{plans}</Text>
                {planCount === 1 ? ' uses' : ' use'} this disc. Deleting clears the disc
                from {planCount === 1 ? 'that plan' : 'those plans'} — the rest of each
                plan stays.
              </>
            ) : (
              'This removes it from your collection and can’t be undone.'
            )}
          </Text>

          {disc.in_bag && (
            <Pressable style={[styles.btn, styles.shelveBtn]} onPress={onShelve}>
              <Text style={styles.shelveLabel}>
                {planCount > 0 ? 'Shelve instead — keep plans intact' : 'Shelve instead'}
              </Text>
            </Pressable>
          )}
          <Pressable style={[styles.btn, styles.deleteBtn]} onPress={onDelete}>
            <Text style={styles.deleteLabel}>
              {planCount > 0 ? `Delete from ${plans.replace(' hole', '')}` : 'Delete disc'}
            </Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SHELL.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: SHELL.dashed,
    marginBottom: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  title: { flex: 1, fontFamily: FONT.bc800, fontSize: 22, color: SHELL.text },
  body: { fontFamily: FONT.b500, fontSize: 15, lineHeight: 21, color: SHELL.textSecondary },
  bodyStrong: { fontFamily: FONT.b700, color: SHELL.text },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  shelveBtn: { borderWidth: 1, borderColor: SHELL.dashed, backgroundColor: SHELL.bg },
  shelveLabel: { fontFamily: FONT.bc700, fontSize: 17, color: SHELL.text, textAlign: 'center' },
  deleteBtn: { backgroundColor: UI.danger },
  deleteLabel: { fontFamily: FONT.bc700, fontSize: 17, color: '#fff' },
  cancelBtn: { borderWidth: 1, borderColor: SHELL.border },
  cancelLabel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textSecondary },
});
