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
  listSessionsForGamePlan,
  type SessionCandidate,
} from '../db/gamePlan';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GamePlanStart'>;

export function GamePlanStartScreen() {
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<SessionCandidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const rows = await listSessionsForGamePlan();
    setSessions(rows);
    if (rows.length > 0 && selectedId === null) {
      setSelectedId(rows[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleContinue = () => {
    if (selectedId === null) return;
    navigation.replace('GamePlanReview', { sessionId: selectedId });
  };

  if (sessions === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No practice sessions yet</Text>
        <Text style={styles.emptyBody}>
          Log a practice round first. Game plans draw their recommendations
          from throws logged across your practice sessions.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          The game plan reviews every hole on the session's layout and
          recommends disc and shape based on all throws you have ever logged
          on that hole.
        </Text>
        {sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            selected={selectedId === s.id}
            onSelect={() => setSelectedId(s.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[styles.continueBtn, selectedId === null && styles.continueBtnDisabled]}
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
  session: SessionCandidate;
  selected: boolean;
  onSelect: () => void;
};

function SessionRow({ session, selected, onSelect }: RowProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, selected && styles.rowOn]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, selected && styles.rowTitleOn]} numberOfLines={1}>
          {session.course_name} · {session.layout_name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {session.session_date} · {session.throw_count}{' '}
          {session.throw_count === 1 ? 'throw' : 'throws'}
          {session.has_plan > 0 ? ' · plan saved' : ''}
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
