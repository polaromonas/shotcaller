import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { loadStats, type Stats, type TopDisc } from '../db/stats';
import { CONFIDENCE, INBAG_GREEN, MODE, UI } from '../theme/colors';

export function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await loadStats();
      setStats(next);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  if (stats === null) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const noActivity = stats.activity.throws === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <Text style={styles.title}>Stats</Text>

        <Card title="Collection">
          <BigStat
            value={String(stats.collection.total)}
            label={stats.collection.total === 1 ? 'disc' : 'discs'}
          />
          <BigStat
            value={String(stats.collection.inBag)}
            label="in bag"
            color={INBAG_GREEN}
          />
        </Card>

        <Card title="Activity">
          <BigStat
            value={String(stats.activity.practiceSessions)}
            label={
              stats.activity.practiceSessions === 1
                ? 'practice round'
                : 'practice rounds'
            }
            color={MODE.practice}
          />
          <BigStat
            value={String(stats.activity.tournamentSessions)}
            label={
              stats.activity.tournamentSessions === 1
                ? 'tournament round'
                : 'tournament rounds'
            }
            color={MODE.tournament}
          />
          <BigStat
            value={String(stats.activity.throws)}
            label={stats.activity.throws === 1 ? 'throw logged' : 'throws logged'}
          />
        </Card>

        {noActivity ? (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintTitle}>No data yet</Text>
            <Text style={styles.emptyHintBody}>
              Log a practice round to see how your discs are performing.
            </Text>
          </View>
        ) : (
          <>
            {stats.performance && (
              <Card title="Where throws land">
                <PercentRow
                  label="In circle (Basket / C1 / C2)"
                  count={stats.performance.inCircle}
                  pct={stats.performance.inCirclePct}
                  color={CONFIDENCE.high}
                />
                <PercentRow
                  label="Fairway"
                  count={stats.performance.fairway}
                  pct={stats.performance.fairwayPct}
                  color={MODE.practice}
                />
                <PercentRow
                  label="Rough"
                  count={stats.performance.rough}
                  pct={stats.performance.roughPct}
                  color={CONFIDENCE.low}
                />
                <PercentRow
                  label="OB"
                  count={stats.performance.ob}
                  pct={stats.performance.obPct}
                  color={UI.danger}
                />
              </Card>
            )}

            {stats.topDiscs.length > 0 && (
              <Card title="Top discs">
                {stats.topDiscs.map((d) => (
                  <TopDiscRow key={d.id} disc={d} />
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function BigStat({
  value,
  label,
  color = UI.text,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.bigStat}>
      <Text style={[styles.bigValue, { color }]}>{value}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

function PercentRow({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <View style={styles.pctRow}>
      <View style={styles.pctHeader}>
        <Text style={styles.pctLabel}>{label}</Text>
        <Text style={styles.pctValue}>
          {pct}% · {count}
        </Text>
      </View>
      <View style={styles.pctTrack}>
        <View
          style={[
            styles.pctFill,
            { width: `${Math.max(pct, 1)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function TopDiscRow({ disc }: { disc: TopDisc }) {
  return (
    <View style={styles.discRow}>
      <View style={[styles.discSwatch, { backgroundColor: disc.color }]} />
      <View style={styles.discText}>
        <Text style={styles.discModel} numberOfLines={1}>
          {disc.model}
        </Text>
        <Text style={styles.discMeta} numberOfLines={1}>
          {disc.manufacturer} · {disc.category}
        </Text>
      </View>
      <Text style={styles.discCount}>{disc.throws}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: UI.text, marginBottom: 4 },

  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardBody: { gap: 12 },

  bigStat: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bigValue: { fontSize: 28, fontWeight: '700' },
  bigLabel: { fontSize: 14, color: UI.textMuted, fontWeight: '500' },

  pctRow: { gap: 6 },
  pctHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  pctLabel: { fontSize: 13, color: UI.text, fontWeight: '600' },
  pctValue: { fontSize: 12, color: UI.textMuted, fontWeight: '600' },
  pctTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.border,
    overflow: 'hidden',
  },
  pctFill: { height: '100%' },

  discRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  discSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: UI.border,
  },
  discText: { flex: 1, minWidth: 0 },
  discModel: { fontSize: 14, fontWeight: '600', color: UI.text },
  discMeta: { fontSize: 12, color: UI.textMuted, marginTop: 1 },
  discCount: { fontSize: 16, fontWeight: '700', color: UI.text },

  emptyHint: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 4,
  },
  emptyHintTitle: { fontSize: 15, fontWeight: '700', color: UI.text },
  emptyHintBody: { fontSize: 13, color: UI.textMuted, lineHeight: 18 },
});
