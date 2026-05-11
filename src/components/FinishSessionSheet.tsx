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
import { MODE, UI } from '../theme/colors';
import type { SessionMode } from '../db/types';

type Props = {
  visible: boolean;
  mode: SessionMode;
  // Whatever name the session already has — so reopening Finish doesn't
  // wipe a name set earlier (or via SessionDetail in the future).
  initialName?: string | null;
  onCancel: () => void;
  onFinish: (name: string) => Promise<void>;
};

export function FinishSessionSheet({
  visible,
  mode,
  initialName,
  onCancel,
  onFinish,
}: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName ?? '');
      setError(null);
    }
  }, [visible, initialName]);

  const isTournament = mode === 'Tournament';
  const accent = isTournament ? MODE.tournament : MODE.practice;

  const handleClose = () => {
    if (submitting) return;
    onCancel();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onFinish(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to finish round');
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
            Finish {isTournament ? 'tournament' : 'practice'} round
          </Text>
          <Pressable onPress={handleSubmit} disabled={submitting} hitSlop={10}>
            <Text
              style={[
                styles.headerAction,
                { color: accent, fontWeight: '700' },
                submitting && styles.headerActionDisabled,
              ]}
            >
              {submitting ? 'Saving…' : 'Finish'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Give this round a name so it's easy to find later. Optional —
            skip and just hit Finish to mark it done.
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={
                isTournament
                  ? 'e.g. Spring Open – Round 1'
                  : 'e.g. Pre-tournament tune-up'
              }
              autoCapitalize="sentences"
              maxLength={80}
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
  headerActionDisabled: { opacity: 0.4 },
  content: { padding: 16, gap: 18 },
  intro: { fontSize: 13, color: UI.textMuted, lineHeight: 18 },
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
