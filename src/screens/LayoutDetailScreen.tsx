import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getLayout,
  listHoles,
  updateHole,
  type Hole,
  type Layout,
} from '../db/courses';
import { INBAG_GREEN, UI } from '../theme/colors';
import type { YouStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<YouStackParamList, 'LayoutDetail'>;
type Rt = RouteProp<YouStackParamList, 'LayoutDetail'>;

const PARS = [2, 3, 4, 5];

export function LayoutDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { layoutId } = route.params;

  const [layout, setLayout] = useState<Layout | null>(null);
  const [holes, setHoles] = useState<Hole[] | null>(null);

  const load = useCallback(async () => {
    const [l, h] = await Promise.all([getLayout(layoutId), listHoles(layoutId)]);
    setLayout(l);
    setHoles(h);
  }, [layoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (layout) navigation.setOptions({ title: layout.name });
  }, [layout, navigation]);

  const handleUpdate = useCallback(
    async (hole: Hole, changes: Partial<Pick<Hole, 'par' | 'distance_ft'>>) => {
      const next: Hole = { ...hole, ...changes };
      setHoles((prev) =>
        prev ? prev.map((h) => (h.id === hole.id ? next : h)) : prev
      );
      await updateHole({
        id: next.id,
        par: next.par,
        distance_ft: next.distance_ft,
      });
    },
    []
  );

  if (!layout || !holes) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Set par and distance for each hole. Changes save as you type.
        </Text>
        {holes.map((h) => (
          <HoleRow key={h.id} hole={h} onUpdate={handleUpdate} />
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type HoleRowProps = {
  hole: Hole;
  onUpdate: (
    hole: Hole,
    changes: Partial<Pick<Hole, 'par' | 'distance_ft'>>
  ) => void;
};

function HoleRow({ hole, onUpdate }: HoleRowProps) {
  const [distanceText, setDistanceText] = useState(
    hole.distance_ft > 0 ? String(hole.distance_ft) : ''
  );

  const commitDistance = () => {
    const parsed = Number(distanceText.trim());
    const value = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
    if (value !== hole.distance_ft) {
      onUpdate(hole, { distance_ft: value });
    }
    setDistanceText(value > 0 ? String(value) : '');
  };

  return (
    <View style={styles.row}>
      <View style={styles.numberCol}>
        <Text style={styles.holeNumber}>{hole.hole_number}</Text>
      </View>
      <View style={styles.fields}>
        <View style={styles.parRow}>
          <Text style={styles.fieldLabel}>Par</Text>
          <View style={styles.parSegmented}>
            {PARS.map((p) => {
              const on = hole.par === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onUpdate(hole, { par: p })}
                  style={[styles.parSegment, on && styles.parSegmentOn]}
                >
                  <Text
                    style={[
                      styles.parSegmentLabel,
                      on && styles.parSegmentLabelOn,
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.distRow}>
          <Text style={styles.fieldLabel}>Distance</Text>
          <TextInput
            style={styles.distInput}
            value={distanceText}
            onChangeText={setDistanceText}
            onBlur={commitDistance}
            placeholder="0"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={commitDistance}
          />
          <Text style={styles.distSuffix}>ft</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, color: UI.textMuted, lineHeight: 18, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.surface,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  numberCol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
  },
  holeNumber: { fontSize: 15, fontWeight: '700', color: UI.text },
  fields: { flex: 1, gap: 8 },
  parRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: UI.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    width: 60,
  },
  parSegmented: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: UI.bg,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: UI.border,
  },
  parSegment: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  parSegmentOn: { backgroundColor: INBAG_GREEN },
  parSegmentLabel: { fontSize: 13, color: UI.textMuted, fontWeight: '600' },
  parSegmentLabelOn: { color: UI.textInverse },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distInput: {
    flex: 1,
    backgroundColor: UI.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: UI.text,
    borderWidth: 1,
    borderColor: UI.border,
  },
  distSuffix: { fontSize: 13, color: UI.textMuted, width: 20 },
});
