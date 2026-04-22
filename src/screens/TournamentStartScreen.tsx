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
import {
  createSession,
  findActiveSession,
  listActiveSessionsByLayout,
  todayIso,
} from '../db/sessions';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TournamentStart'>;

export function TournamentStartScreen() {
  const navigation = useNavigation<Nav>();
  const [layouts, setLayouts] = useState<LayoutCandidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeByLayout, setActiveByLayout] = useState<Map<number, number>>(
    new Map()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rows, active] = await Promise.all([
      listLayoutsForGamePlan(),
      listActiveSessionsByLayout({
        sessionDate: todayIso(),
        mode: 'Tournament',
      }),
    ]);
    const playable = rows.filter(
      (r) => r.planned_holes > 0 && r.hole_count > 0
    );
    setLayouts(playable);
    setActiveByLayout(active);
    if (playable.length > 0 && selectedId === null) {
      const resumable = playable.find((l) => active.has(l.layout_id));
      setSelectedId(resumable ? resumable.layout_id : playable[0].layout_id);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStart = async () => {
    if (selectedId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const today = todayIso();
      const existing = await findActiveSession({
        layoutId: selectedId,
        sessionDate: today,
        mode: 'Tournament',
      });
      const sessionId =
        existing ??
        (await createSession({
          layoutId: selectedId,
          sessionDate: today,
          mode: 'Tournament',
        }));
      navigation.replace('TournamentThrow', {
        sessionId,
        layoutId: selectedId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start round');
      setSubmitting(false);
    }
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
        <Text style={styles.emptyTitle}>No game plans yet</Text>
        <Text style={styles.emptyBody}>
          Lock in a game plan for a layout from the Game plan screen before
          starting a tournament round.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Tournament rounds load your saved plan and pre-select the disc and
          shot for each hole. You can override any throw without changing the
          plan.
        </Text>
        {layouts.map((l) => (
          <LayoutRow
            key={l.layout_id}
            layout={l}
            selected={selectedId === l.layout_id}
            inProgress={activeByLayout.has(l.layout_id)}
            onSelect={() => setSelectedId(l.layout_id)}
          />
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.startBtn,
            (selectedId === null || submitting) && styles.startBtnDisabled,
          ]}
          disabled={selectedId === null || submitting}
          onPress={handleStart}
        >
          <Text style={styles.startLabel}>
            {submitting
              ? 'Starting…'
              : selectedId !== null && activeByLayout.has(selectedId)
              ? "Resume today's round"
              : 'Start tournament round'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type RowProps = {
  layout: LayoutCandidate;
  selected: boolean;
  inProgress: boolean;
  onSelect: () => void;
};

function LayoutRow({ layout, selected, inProgress, onSelect }: RowProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, selected && styles.rowOn]}
    >
      <View style={styles.rowText}>
        <View style={styles.rowTitleRow}>
          <Text
            style={[styles.rowTitle, selected && styles.rowTitleOn]}
            numberOfLines={1}
          >
            {layout.layout_name}
          </Text>
          {inProgress && (
            <View style={styles.inProgressTag}>
              <Text style={styles.inProgressTagLabel}>Today</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowCourse} numberOfLines={1}>
          {layout.course_name} · {layout.course_location}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          Plan: {layout.planned_holes}/{layout.hole_count} holes
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
    backgroundColor: '#fff0f4',
    borderColor: MODE.tournament,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: UI.text },
  rowTitleOn: { color: MODE.tournament },
  inProgressTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: MODE.tournament,
  },
  inProgressTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: UI.textInverse,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowCourse: { fontSize: 13, color: UI.textMuted },
  rowMeta: { fontSize: 12, color: UI.textMuted },
  check: { fontSize: 18, color: MODE.tournament, fontWeight: '700' },
  error: { color: UI.danger, fontSize: 14 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  startBtn: {
    backgroundColor: MODE.tournament,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.4 },
  startLabel: {
    color: UI.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
