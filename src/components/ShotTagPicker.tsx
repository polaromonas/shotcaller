import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createShotTag, listShotTags, type ShotTag } from '../db/shotTags';
import { UI } from '../theme/colors';

type Props = {
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  // The accent color matches the throw screen's mode (practice blue or
  // tournament pink) so the chip's selected-state reads consistently.
  accent: string;
};

export function ShotTagPicker({ selectedIds, onToggle, accent }: Props) {
  const [tags, setTags] = useState<ShotTag[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setTags(await listShotTags());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = async () => {
    const name = draft.trim();
    if (name.length === 0) return;
    try {
      const tag = await createShotTag(name);
      setTags((prev) =>
        prev.some((t) => t.id === tag.id)
          ? prev
          : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
      );
      // Auto-select the just-created tag — matches the disc-tag UX.
      if (!selectedIds.has(tag.id)) onToggle(tag.id);
      setDraft('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add shot tag');
    }
  };

  return (
    <View style={styles.root}>
      {tags.length > 0 && (
        <View style={styles.chipWrap}>
          {tags.map((t) => {
            const on = selectedIds.has(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => onToggle(t.id)}
                style={[
                  styles.chip,
                  on && { backgroundColor: accent, borderColor: accent },
                ]}
              >
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
                  {t.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a shot tag"
          autoCapitalize="words"
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.addBtn,
            draft.trim().length === 0 && styles.addBtnDisabled,
          ]}
          onPress={handleAdd}
          disabled={draft.trim().length === 0}
        >
          <Text style={styles.addBtnLabel}>Add</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  chipLabel: { fontSize: 13, color: UI.textMuted, fontWeight: '600' },
  chipLabelOn: { color: UI.textInverse },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: UI.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  addBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnLabel: { fontSize: 14, fontWeight: '600', color: UI.text },
  error: { color: UI.danger, fontSize: 13 },
});
