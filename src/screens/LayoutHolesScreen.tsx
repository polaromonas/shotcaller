import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getLayoutHeading,
  listHoles,
  type Hole,
} from '../db/courses';
import { discDisplayName, listDiscs } from '../db/discs';
import { listHolePlans, planSummary, type HolePlan } from '../db/plans';
import { FONT, MODE, SHELL } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LayoutDetail'>;
type Rt = RouteProp<RootStackParamList, 'LayoutDetail'>;

export function LayoutHolesScreen() {
  const navigation = useNavigation<Nav>();
  const { layoutId } = useRoute<Rt>().params;
  const { width } = useWindowDimensions();

  const [heading, setHeading] = useState<{ layoutName: string; courseName: string } | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [plansByHole, setPlansByHole] = useState<Map<number, HolePlan>>(new Map());
  const [discNames, setDiscNames] = useState<Map<number, string>>(new Map());
  const [lastEditedHole, setLastEditedHole] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [head, hs, plans, discs] = await Promise.all([
      getLayoutHeading(layoutId),
      listHoles(layoutId),
      listHolePlans(layoutId),
      listDiscs(),
    ]);
    setHeading(head);
    setHoles(hs);
    setPlansByHole(new Map(plans.map((p) => [p.hole_id, p])));
    setDiscNames(new Map(discs.map((d) => [d.id, discDisplayName(d)])));
    const newest = plans.reduce<HolePlan | null>(
      (acc, p) => (!acc || p.updated_at > acc.updated_at ? p : acc),
      null
    );
    setLastEditedHole(newest?.hole_id ?? null);
    setLoading(false);
  }, [layoutId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading || !heading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MODE.plan} />
      </View>
    );
  }

  const planned = plansByHole.size;
  const cellWidth = (width - 40 - 20) / 3; // screen padding 20*2, two 10px gaps

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ {heading.courseName}</Text>
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>PLAN</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{heading.layoutName.toUpperCase()}</Text>
        <Text style={styles.subtitle}>
          {planned} of {holes.length} holes planned
        </Text>

        <View style={styles.grid}>
          {holes.map((h) => {
            const plan = plansByHole.get(h.id);
            const isCurrent = h.id === lastEditedHole;
            const facts = `Par ${h.par} · ${h.distance_ft > 0 ? h.distance_ft : '—'}`;
            const summary = plan
              ? planSummary(plan, plan.disc_id ? discNames.get(plan.disc_id) ?? null : null)
              : null;
            return (
              <Pressable
                key={h.id}
                onPress={() =>
                  navigation.navigate('PlanHole', { layoutId, holeId: h.id })
                }
                style={[
                  styles.cell,
                  { width: cellWidth },
                  plan ? styles.cellPlanned : styles.cellEmpty,
                  isCurrent && styles.cellCurrent,
                ]}
              >
                <Text style={styles.cellNumber}>{h.hole_number}</Text>
                <Text style={styles.cellFacts} numberOfLines={1}>
                  {facts}
                </Text>
                {plan ? (
                  <Text style={styles.cellSummary} numberOfLines={2}>
                    {summary}
                  </Text>
                ) : (
                  <Text style={styles.cellAdd}>+ Plan</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.editBtn}
          onPress={() => navigation.navigate('LayoutEdit', { layoutId })}
        >
          <Text style={styles.editLabel}>Edit layout</Text>
        </Pressable>
        <Pressable
          style={styles.playBtn}
          onPress={() => navigation.navigate('PlayLayout', { layoutId })}
        >
          <Ionicons name="play" size={15} color="#fff" />
          <Text style={styles.playLabel}>Play this</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHELL.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SHELL.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  back: { fontFamily: FONT.b600, fontSize: 16, color: SHELL.textSecondary },
  badge: {
    backgroundColor: MODE.plan,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeLabel: { fontFamily: FONT.bc700, fontSize: 13, letterSpacing: 1.5, color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontFamily: FONT.bc800, fontSize: 34, color: SHELL.text },
  subtitle: { fontFamily: FONT.b500, fontSize: 15, color: SHELL.textMuted, marginTop: 2, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    minHeight: 96,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  cellPlanned: {
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  cellEmpty: {
    borderWidth: 1,
    borderColor: SHELL.dashed,
    borderStyle: 'dashed',
  },
  cellCurrent: { borderWidth: 2, borderColor: MODE.plan },
  cellNumber: { fontFamily: FONT.bc800, fontSize: 24, color: SHELL.text },
  cellFacts: { fontFamily: FONT.b600, fontSize: 12, color: SHELL.textMuted },
  cellSummary: { fontFamily: FONT.b500, fontSize: 12, color: SHELL.textSecondary, marginTop: 2 },
  cellAdd: { fontFamily: FONT.b700, fontSize: 13, color: MODE.plan, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: SHELL.border,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: SHELL.card,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  editLabel: { fontFamily: FONT.bc700, fontSize: 15, letterSpacing: 0.5, color: SHELL.textSecondary },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MODE.play,
  },
  playLabel: { fontFamily: FONT.bc800, fontSize: 16, letterSpacing: 0.5, color: '#fff' },
});
