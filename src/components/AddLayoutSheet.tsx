import { useState } from 'react';
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
import { INBAG_GREEN, UI } from '../theme/colors';

type Props = {
  visible: boolean;
  courseName: string;
  onClose: () => void;
  onSubmit: (input: { name: string; holeCount: number }) => Promise<void>;
};

const PRESETS = [9, 18];

export function AddLayoutSheet({
  visible,
  courseName,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState('');
  const [holeCount, setHoleCount] = useState<number>(18);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !submitting && name.trim().length > 0 && holeCount >= 1;

  const reset = () => {
    setName('');
    setHoleCount(18);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), holeCount });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save layout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Text style={styles.headerAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            New layout · {courseName}
          </Text>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={10}>
            <Text
              style={[
                styles.headerAction,
                styles.headerActionPrimary,
                !canSubmit && styles.headerActionDisabled,
              ]}
            >
              {submitting ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Tournament"
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Number of holes</Text>
            <View style={styles.segmented}>
              {PRESETS.map((n) => {
                const on = holeCount === n;
                return (
                  <Pressable
                    key={n}
                    style={[styles.segment, on && styles.segmentOn]}
                    onPress={() => setHoleCount(n)}
                  >
                    <Text
                      style={[styles.segmentLabel, on && styles.segmentLabelOn]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              Holes are created with par 3 and no distance. Fill in the details
              after saving.
            </Text>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI.text,
    flex: 1,
    textAlign: 'center',
  },
  headerAction: { fontSize: 16, color: UI.textMuted },
  headerActionPrimary: { color: INBAG_GREEN, fontWeight: '600' },
  headerActionDisabled: { opacity: 0.4 },
  content: { padding: 16, gap: 20 },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: UI.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: UI.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: UI.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentOn: { backgroundColor: UI.bg },
  segmentLabel: { fontSize: 14, color: UI.textMuted, fontWeight: '600' },
  segmentLabelOn: { color: UI.text },
  hint: { fontSize: 12, color: UI.textMuted, lineHeight: 16 },
  error: { color: UI.danger, fontSize: 14 },
});
