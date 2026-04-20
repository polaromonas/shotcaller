import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  listLayoutsForGamePlan,
  type LayoutCandidate,
} from '../db/gamePlan';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GamePlanStart'>;

export function GamePlanStartScreen() {
  const navigation = useNavigation<Nav>();
  const [layouts, setLayouts] = useState<LayoutCandidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const rows = await listLayoutsForGamePlan();
    setLayouts(rows);
    if (rows.length > 0 && selectedId === null) {
      setSelectedId(rows[0].layout_id);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleContinue = () => {
    if (selectedId === null) return;
    navigation.replace('GamePlanReview', { layoutId: selectedId });
  };

  if (layouts === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (layouts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No layouts yet</Text>
        <Text style={styles.emptyBody}>
          Add a course and layout in the Courses tab before building a game
          plan.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Game plans attach to a layout. Recommendations pull from every
          throw you have ever logged on that layout, across all practice
          sessions.
        </Text>
        {layouts.map((l) => (
          <LayoutRow
            key={l.layout_id}
            layout={l}
            selected={selectedId === l.layout_id}
            onSelect={() => setSelectedId(l.layout_id)}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.continueBtn,
            selectedId === null && styles.continueBtnDisabled,
          ]}
          disabled={selectedId === null}
          onPress={handleContinue}
        >
          <Text style={styles.continueLabel}>Review game plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

type RowProps = {
  layout: LayoutCandidate;
  selected: boolean;
  onSelect: () => void;
};

function LayoutRow({ layout, selected, onSelect }: RowProps) {
  const sessionsLabel =
    layout.session_count === 1 ? 'session' : 'sessions';
  const throwsLabel = layout.throw_count === 1 ? 'throw' : 'throws';
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, selected && styles.rowOn]}
    >
      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, selected && styles.rowTitleOn]}
          numberOfLines={1}
        >
          {layout.layout_name}
        </Text>
        <Text style={styles.rowCourse} numberOfLines={1}>
          {layout.course_name} · {layout.course_location}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {layout.throw_count} {throwsLabel} · {layout.session_count}{' '}
          {sessionsLabel}
          {layout.planned_holes > 0
            ? ` · plan saved (${layout.planned_holes}/${layout.hole_count})`
            : ''}
        </Text>
      </View>
      {selected && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  content: { padding: 16, gap: 10 },
  hint: {
    fontSize: 13,
    color: UI.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: UI.text },
  emptyBody: {
    fontSize: 14,
    color: UI.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: UI.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  rowOn: {
    backgroundColor: '#ecf7ee',
    borderColor: MODE.gamePlan,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: UI.text },
  rowTitleOn: { color: MODE.gamePlan },
  rowCourse: { fontSize: 13, color: UI.textMuted },
  rowMeta: { fontSize: 12, color: UI.textMuted },
  check: { fontSize: 18, color: MODE.gamePlan, fontWeight: '700' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  continueBtn: {
    backgroundColor: MODE.gamePlan,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueLabel: {
    color: UI.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
