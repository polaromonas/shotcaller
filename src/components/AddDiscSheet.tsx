import { useEffect, useMemo, useState } from 'react';
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
import { DISC_CATEGORIES, type DiscCategory } from '../db/types';
import { DISC_SWATCHES, INBAG_GREEN, UI } from '../theme/colors';
import { createTag, listTags, type Tag } from '../db/tags';
import type { DiscWithTags, NewDiscInput } from '../db/discs';
import { searchCatalog, type CatalogDisc } from '../data/discCatalog';

type Props = {
  visible: boolean;
  disc?: DiscWithTags | null;
  onClose: () => void;
  onSubmit: (input: NewDiscInput) => Promise<void>;
};

const flightToText = (n: number | null): string =>
  n === null || !Number.isFinite(n) ? '' : String(n);

type FlightField = 'speed' | 'glide' | 'turn' | 'fade';

const FLIGHT_FIELDS: { key: FlightField; label: string }[] = [
  { key: 'speed', label: 'Speed' },
  { key: 'glide', label: 'Glide' },
  { key: 'turn', label: 'Turn' },
  { key: 'fade', label: 'Fade' },
];

export function AddDiscSheet({ visible, disc, onClose, onSubmit }: Props) {
  const isEditing = disc != null;

  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [plastic, setPlastic] = useState('');
  const [category, setCategory] = useState<DiscCategory | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [flight, setFlight] = useState<Record<FlightField, string>>({
    speed: '',
    glide: '',
    turn: '',
    fade: '',
  });
  const [turnNegative, setTurnNegative] = useState(true);
  // Bumped whenever flight values are programmatically replaced (catalog pick
  // or edit-mode load). Used as a key on the flight inputs so they remount
  // and pick up the new value — react-native-web's controlled <input> doesn't
  // always sync the DOM value attribute when the prop changes from outside
  // a user-typed event.
  const [flightGen, setFlightGen] = useState(0);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [newTagName, setNewTagName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void listTags().then(setTags);
    if (disc) {
      setManufacturer(disc.manufacturer);
      setModel(disc.model);
      setPlastic(disc.plastic ?? '');
      setCategory(disc.category);
      setColor(disc.color);
      setFlight({
        speed: flightToText(disc.speed),
        glide: flightToText(disc.glide),
        turn: disc.turn !== null ? flightToText(Math.abs(disc.turn)) : '',
        fade: flightToText(disc.fade),
      });
      setTurnNegative(disc.turn !== null ? disc.turn < 0 : true);
      setSelectedTagIds(new Set(disc.tags.map((t) => t.id)));
      // Editing an existing disc — don't pester with catalog suggestions.
      setShowSuggestions(false);
    } else {
      setManufacturer('');
      setModel('');
      setPlastic('');
      setCategory(null);
      setColor(null);
      setFlight({ speed: '', glide: '', turn: '', fade: '' });
      setTurnNegative(true);
      setSelectedTagIds(new Set());
      setShowSuggestions(true);
    }
    setFlightGen((g) => g + 1);
    setNewTagName('');
    setError(null);
  }, [visible, disc]);

  const resetForm = () => {
    setManufacturer('');
    setModel('');
    setPlastic('');
    setCategory(null);
    setColor(null);
    setFlight({ speed: '', glide: '', turn: '', fade: '' });
    setTurnNegative(true);
    setSelectedTagIds(new Set());
    setNewTagName('');
    setShowSuggestions(true);
    setError(null);
  };

  const canSubmit = useMemo(
    () =>
      !submitting &&
      manufacturer.trim().length > 0 &&
      model.trim().length > 0 &&
      category !== null &&
      color !== null,
    [submitting, manufacturer, model, category, color]
  );

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (name.length === 0) return;
    try {
      const tag = await createTag(name);
      setTags((prev) => {
        if (prev.some((t) => t.id === tag.id)) return prev;
        return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedTagIds((prev) => new Set(prev).add(tag.id));
      setNewTagName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tag');
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parseFlight = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const parseTurn = (magnitude: string, negative: boolean): number | null => {
    const n = parseFlight(magnitude);
    if (n === null) return null;
    return negative ? -Math.abs(n) : Math.abs(n);
  };

  // Catalog suggestions are derived from the model field. Hidden once the user
  // picks a suggestion (they probably don't want the list nagging them after
  // selection) and re-shown whenever they edit the model field again.
  const suggestions = useMemo<CatalogDisc[]>(
    () => (showSuggestions ? searchCatalog(model) : []),
    [model, showSuggestions]
  );

  const handleModelChange = (text: string) => {
    setModel(text);
    setShowSuggestions(true);
  };

  const handlePickCatalogDisc = (d: CatalogDisc) => {
    setManufacturer(d.manufacturer);
    setModel(d.model);
    setCategory(d.category);
    setFlight({
      speed: flightToText(d.speed),
      glide: flightToText(d.glide),
      turn: flightToText(Math.abs(d.turn)),
      fade: flightToText(d.fade),
    });
    setTurnNegative(d.turn < 0);
    setFlightGen((g) => g + 1);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !category || !color) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        plastic: plastic.trim() || null,
        category,
        color,
        speed: parseFlight(flight.speed),
        glide: parseFlight(flight.glide),
        turn: parseTurn(flight.turn, turnNegative),
        fade: parseFlight(flight.fade),
        tagIds: Array.from(selectedTagIds),
      });
      resetForm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save disc');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit disc' : 'New disc'}</Text>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Model">
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={handleModelChange}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {suggestions.length > 0 && (
              <View style={styles.suggestList}>
                {suggestions.map((d) => (
                  <Pressable
                    key={`${d.manufacturer}|${d.model}`}
                    style={({ pressed }) => [
                      styles.suggestRow,
                      pressed && styles.suggestRowPressed,
                    ]}
                    onPress={() => handlePickCatalogDisc(d)}
                  >
                    <View style={styles.suggestText}>
                      <Text style={styles.suggestModel} numberOfLines={1}>
                        {d.model}
                      </Text>
                      <Text style={styles.suggestMeta} numberOfLines={1}>
                        {d.manufacturer} · {d.category}
                      </Text>
                    </View>
                    <Text style={styles.suggestFlight}>
                      {d.speed}/{d.glide}/{d.turn}/{d.fade}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Field>

          <Field label="Manufacturer">
            <TextInput
              style={styles.input}
              value={manufacturer}
              onChangeText={setManufacturer}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </Field>

          <Field label="Plastic">
            <TextInput
              style={styles.input}
              value={plastic}
              onChangeText={setPlastic}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </Field>

          <Field label="Category">
            <View style={styles.segmented}>
              {DISC_CATEGORIES.map((c) => {
                const selected = category === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.segment, selected && styles.segmentOn]}
                    onPress={() => setCategory(c)}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        selected && styles.segmentLabelOn,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Color">
            <View style={styles.swatchGrid}>
              {DISC_SWATCHES.map((hex) => {
                const selected = color === hex;
                return (
                  <Pressable
                    key={hex}
                    onPress={() => setColor(hex)}
                    style={[
                      styles.swatch,
                      { backgroundColor: hex },
                      selected && styles.swatchSelected,
                    ]}
                    accessibilityLabel={`Color ${hex}`}
                  />
                );
              })}
            </View>
          </Field>

          <Field label="Tags">
            {tags.length > 0 && (
              <View style={styles.tagWrap}>
                {tags.map((tag) => {
                  const selected = selectedTagIds.has(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      onPress={() => toggleTag(tag.id)}
                      style={[
                        styles.tagChip,
                        selected && styles.tagChipOn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagChipLabel,
                          selected && styles.tagChipLabelOn,
                        ]}
                      >
                        {tag.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={styles.newTagRow}>
              <TextInput
                style={[styles.input, styles.newTagInput]}
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="Add a new tag"
                autoCapitalize="words"
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <Pressable
                style={[
                  styles.newTagBtn,
                  newTagName.trim().length === 0 && styles.newTagBtnDisabled,
                ]}
                onPress={handleAddTag}
                disabled={newTagName.trim().length === 0}
              >
                <Text style={styles.newTagBtnLabel}>Add</Text>
              </Pressable>
            </View>
          </Field>

          <Field label="Flight numbers (optional)">
            <View style={styles.flightRow}>
              {FLIGHT_FIELDS.map(({ key, label }) =>
                key === 'turn' ? (
                  <TurnCell
                    key={`${key}-${flightGen}`}
                    label={label}
                    magnitude={flight.turn}
                    negative={turnNegative}
                    onChangeMagnitude={(v) =>
                      setFlight((prev) => ({ ...prev, turn: v }))
                    }
                    onToggleSign={() => setTurnNegative((prev) => !prev)}
                  />
                ) : (
                  <View key={`${key}-${flightGen}`} style={styles.flightCell}>
                    <Text style={styles.flightLabel}>{label}</Text>
                    <TextInput
                      style={[styles.input, styles.flightInput]}
                      value={flight[key]}
                      onChangeText={(v) =>
                        setFlight((prev) => ({ ...prev, [key]: v }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="—"
                    />
                  </View>
                )
              )}
            </View>
          </Field>

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

type TurnCellProps = {
  label: string;
  magnitude: string;
  negative: boolean;
  onChangeMagnitude: (next: string) => void;
  onToggleSign: () => void;
};

function TurnCell({
  label,
  magnitude,
  negative,
  onChangeMagnitude,
  onToggleSign,
}: TurnCellProps) {
  return (
    <View style={styles.flightCell}>
      <Text style={styles.flightLabel}>{label}</Text>
      <View style={styles.turnInputRow}>
        <Pressable
          onPress={onToggleSign}
          style={[styles.signBtn, negative && styles.signBtnOn]}
          accessibilityLabel={negative ? 'Make positive' : 'Make negative'}
          hitSlop={4}
        >
          <Text style={[styles.signLabel, negative && styles.signLabelOn]}>
            {negative ? '−' : '+'}
          </Text>
        </Pressable>
        <TextInput
          style={[styles.input, styles.flightInput, styles.turnMagnitudeInput]}
          value={magnitude}
          onChangeText={onChangeMagnitude}
          keyboardType="decimal-pad"
          placeholder="—"
        />
      </View>
    </View>
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
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 20 },
  field: { gap: 8 },
  fieldLabel: {
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
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: UI.text,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  tagChipOn: { backgroundColor: UI.text, borderColor: UI.text },
  tagChipLabel: { fontSize: 13, color: UI.textMuted },
  tagChipLabelOn: { color: UI.textInverse, fontWeight: '600' },
  newTagRow: { flexDirection: 'row', gap: 8 },
  newTagInput: { flex: 1 },
  newTagBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  newTagBtnDisabled: { opacity: 0.4 },
  newTagBtnLabel: { fontSize: 14, fontWeight: '600', color: UI.text },
  suggestList: {
    marginTop: 4,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  suggestRowPressed: { backgroundColor: UI.bg },
  suggestText: { flex: 1, minWidth: 0 },
  suggestModel: { fontSize: 14, fontWeight: '600', color: UI.text },
  suggestMeta: { fontSize: 11, color: UI.textMuted, marginTop: 1 },
  suggestFlight: { fontSize: 12, color: UI.textMuted, fontVariant: ['tabular-nums'] },
  flightRow: { flexDirection: 'row', gap: 8 },
  // minWidth: 0 lets flex children shrink below their intrinsic content width
  // — without it the TextInput's HTML intrinsic size makes the Turn cell
  // (which has an extra ± button inside) overflow on web.
  flightCell: { flex: 1, minWidth: 0 },
  flightLabel: {
    fontSize: 11,
    color: UI.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  // flex: 1 + minWidth: 0 lets the input shrink below its HTML-intrinsic
  // min-content width on react-native-web (the <input> would otherwise reserve
  // ~20 chars and overflow its flex share, especially in the Turn cell which
  // also holds a ± button).
  flightInput: { textAlign: 'center', flex: 1, minWidth: 0 },
  turnInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    minWidth: 0,
  },
  turnMagnitudeInput: { paddingHorizontal: 4, minWidth: 0 },
  signBtn: {
    width: 28,
    borderRadius: 10,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signBtnOn: { backgroundColor: UI.text, borderColor: UI.text },
  signLabel: { fontSize: 16, fontWeight: '700', color: UI.textMuted },
  signLabelOn: { color: UI.textInverse },
  error: { color: UI.danger, fontSize: 14, marginTop: 4 },
});
