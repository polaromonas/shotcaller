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
  onClose: () => void;
  onSubmit: (input: { name: string; location: string }) => Promise<void>;
};

export function AddCourseSheet({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting && name.trim().length > 0 && location.trim().length > 0;

  const reset = () => {
    setName('');
    setLocation('');
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
      await onSubmit({ name: name.trim(), location: location.trim() });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save course');
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
          <Text style={styles.headerTitle}>New course</Text>
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
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
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
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: UI.text },
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
  error: { color: UI.danger, fontSize: 14 },
});
