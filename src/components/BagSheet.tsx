import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Bag } from '../db/bags';
import { DISC_SWATCHES, FONT, SHELL, UI } from '../theme/colors';

type Props = {
  visible: boolean;
  /** The bag being edited; null = creating a new one. */
  bag: Bag | null;
  /** Hide Delete when this is the only bag (the app always keeps one). */
  canDelete: boolean;
  onSave: (input: { name: string; color: string | null }) => void;
  onDelete: () => void;
  onClose: () => void;
};

// Create or edit a bag: name + bag color (the real-life bag's color — it rides
// on the bag's dot and fills the "In Bag" pills). Neutral surface: white
// selection, never a mode color.
export function BagSheet({ visible, bag, canDelete, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(bag?.name ?? '');
    setColor(bag?.color ?? null);
  }, [visible, bag]);

  const canSave = name.trim().length > 0;
  const save = () => {
    if (canSave) onSave({ name: name.trim(), color });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{bag ? 'Edit bag' : 'New bag'}</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Glow bag, Winter bag, Travel bag…"
            placeholderTextColor={SHELL.textFaint}
            autoFocus={!bag}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Bag name"
          />

          <Text style={styles.label}>Bag color</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatches}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => setColor(null)}
              style={[styles.swatchNone, color === null && styles.swatchSel]}
              accessibilityLabel="No bag color"
            >
              <Text style={styles.swatchNoneLabel}>None</Text>
            </Pressable>
            {DISC_SWATCHES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => setColor(hex)}
                style={[styles.swatch, { backgroundColor: hex }, color === hex && styles.swatchSel]}
                accessibilityLabel={`Bag color ${hex}`}
              />
            ))}
          </ScrollView>

          <View style={styles.actions}>
            {bag && canDelete && (
              <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
                <Text style={styles.deleteLabel}>Delete bag</Text>
              </Pressable>
            )}
            <View style={styles.spacer} />
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={!canSave}
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveLabel}>{bag ? 'Save' : 'Create bag'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: SHELL.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: SHELL.border,
    gap: 14,
  },
  title: { fontFamily: FONT.bc800, fontSize: 22, color: SHELL.text },
  input: {
    backgroundColor: SHELL.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT.b600,
    fontSize: 17,
    color: SHELL.text,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  label: { fontFamily: FONT.bc700, fontSize: 14, color: SHELL.textMuted, marginBottom: -6 },
  swatches: { gap: 8, alignItems: 'center', paddingVertical: 4, paddingRight: 8 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchNone: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
  },
  swatchNoneLabel: { fontFamily: FONT.b600, fontSize: 12, color: SHELL.textMuted },
  swatchSel: { borderWidth: 3, borderColor: UI.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  spacer: { flex: 1 },
  deleteBtn: { paddingVertical: 8 },
  deleteLabel: { fontFamily: FONT.b600, fontSize: 15, color: UI.danger },
  cancel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textMuted },
  saveBtn: {
    backgroundColor: SHELL.text,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveLabel: { fontFamily: FONT.bc700, fontSize: 16, color: SHELL.bg },
});
