import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
  deleteSession,
  listSessions,
  type PracticeSessionWithContext,
} from '../db/sessions';
import { MODE, UI } from '../theme/colors';
import { confirmAction } from '../util/confirm';

export function SessionsScreen() {
  const [sessions, setSessions] = useState<PracticeSessionWithContext[] | null>(
    null
  );
  const openRow = useRef<SwipeableMethods | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listSessions();
    setSessions(rows);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRowOpen = useCallback((methods: SwipeableMethods) => {
    if (openRow.current && openRow.current !== methods) {
      openRow.current.close();
    }
    openRow.current = methods;
  }, []);

  const handleDelete = useCallback(
    (s: PracticeSessionWithContext) => {
      const throwsLabel =
        s.throw_count === 0
          ? 'No throws to lose'
          : `${s.throw_count} ${s.throw_count === 1 ? 'throw' : 'throws'} will be deleted with it`;
      confirmAction({
        title: `Delete this ${s.mode === 'Tournament' ? 'tournament' : 'practice'} round?`,
        message: `${s.course_name} · ${s.layout_name} on ${s.session_date}. ${throwsLabel}. Saved game plans on this layout are not affected. This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        onConfirm: async () => {
          await deleteSession(s.id);
          openRow.current = null;
          await refresh();
        },
      });
    },
    [refresh]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessions</Text>
      </View>

      {sessions === null ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyBody}>
            Practice and tournament rounds you start will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <SessionRow
              session={item}
              onDelete={() => handleDelete(item)}
              onOpen={handleRowOpen}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

type RowProps = {
  session: PracticeSessionWithContext;
  onDelete: () => void;
  onOpen: (methods: SwipeableMethods) => void;
};

function SessionRow({ session, onDelete, onOpen }: RowProps) {
  const ref = useRef<SwipeableMethods>(null);
  const isTournament = session.mode === 'Tournament';
  const tint = isTournament ? MODE.tournament : MODE.practice;
  const isOngoing = session.completed_at === null;

  const renderRightActions = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        ref.current?.close();
        onDelete();
      }}
      accessibilityLabel={`Delete session at ${session.course_name}`}
    >
      <Text style={styles.deleteLabel}>Delete</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (ref.current) onOpen(ref.current);
      }}
    >
      <View style={styles.row}>
        <View style={[styles.modeStripe, { backgroundColor: tint }]} />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {session.course_name} · {session.layout_name}
            </Text>
            <Text style={[styles.modeTag, { color: tint }]}>
              {isTournament ? 'Tournament' : 'Practice'}
            </Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {session.session_date} · {session.throw_count}{' '}
            {session.throw_count === 1 ? 'throw' : 'throws'}
            {isOngoing ? ' · ongoing' : ''}
          </Text>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: UI.text },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
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
    alignItems: 'stretch',
    backgroundColor: UI.bg,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  modeStripe: { width: 4 },
  body: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleText: { fontSize: 15, fontWeight: '600', color: UI.text, flexShrink: 1 },
  modeTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  meta: { fontSize: 12, color: UI.textMuted },
  deleteAction: {
    backgroundColor: UI.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  deleteLabel: { color: UI.textInverse, fontSize: 15, fontWeight: '600' },
});
