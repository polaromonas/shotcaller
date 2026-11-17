import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CATEGORY_GROUP_LABELS,
  DISC_CATEGORIES,
  type DiscCategory,
} from '../db/types';
import { discDisplayName, discSubline, type DiscWithTags } from '../db/discs';
import { FONT, MODE, SHELL } from '../theme/colors';

type Props = {
  visible: boolean;
  discs: DiscWithTags[];
  selectedId: number | null;
  onPick: (discId: number) => void;
  onClose: () => void;
  onAddDisc?: () => void;
  /** The active bag's name — the picker only offers its discs. */
  bagName?: string;
};

type Filter = 'All' | DiscCategory;

function flightText(d: DiscWithTags): string | null {
  const nums = [d.speed, d.glide, d.turn, d.fade];
  if (nums.some((n) => n === null)) return null;
  return nums.map((n) => String(n)).join('/');
}

export function DiscPickerSheet({
  visible,
  discs,
  selectedId,
  onPick,
  onClose,
  onAddDisc,
  bagName = 'your bag',
}: Props) {
  const [filter, setFilter] = useState<Filter>('All');

  // Only discs in the active bag are offered (in_bag = in the active bag).
  const inBag = useMemo(() => discs.filter((d) => d.in_bag), [discs]);

  const groups = useMemo(() => {
    const shown = filter === 'All' ? inBag : inBag.filter((d) => d.category === filter);
    return DISC_CATEGORIES.map((cat) => ({
      cat,
      discs: shown.filter((d) => d.category === cat),
    })).filter((g) => g.discs.length > 0);
  }, [inBag, filter]);

  const filters: Filter[] = ['All', ...DISC_CATEGORIES];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>Pick a disc</Text>
          <View style={styles.headerActions}>
            {onAddDisc && (
              <Pressable onPress={onAddDisc} hitSlop={8}>
                <Text style={styles.addDisc}>+ Add disc</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filterRow}>
          {filters.map((f) => {
            const on = filter === f;
            const label = f === 'All' ? `All · ${inBag.length}` : f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, on && styles.filterChipOn]}
              >
                <Text style={[styles.filterLabel, on && styles.filterLabelOn]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView style={styles.listScroll} contentContainerStyle={styles.list}>
          {groups.length === 0 ? (
            <Text style={styles.empty}>
              No discs in {bagName}{filter === 'All' ? '' : ` in ${filter}`}. Add
              discs to it from My Bag.
            </Text>
          ) : (
            groups.map((g) => (
              <View key={g.cat} style={styles.group}>
                <Text style={styles.sectionLabel}>{CATEGORY_GROUP_LABELS[g.cat]}</Text>
                {g.discs.map((d) => {
                  const on = d.id === selectedId;
                  const flight = flightText(d);
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => onPick(d.id)}
                      style={[styles.row, on && styles.rowOn]}
                    >
                      <View style={[styles.dot, { backgroundColor: d.color }]} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {discDisplayName(d)}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {discSubline(d)}
                        </Text>
                      </View>
                      {flight && (
                        <Text style={[styles.flight, on && styles.flightOn]}>
                          {flight}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        <Text style={styles.footer}>
          {inBag.length} {inBag.length === 1 ? 'disc' : 'discs'} in {bagName}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 118,
    backgroundColor: SHELL.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: SHELL.dashed,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontFamily: FONT.bc700,
    fontSize: 15,
    color: SHELL.text,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  addDisc: { fontFamily: FONT.b600, fontSize: 15, color: MODE.plan },
  cancel: { fontFamily: FONT.b600, fontSize: 15, color: SHELL.textMuted },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: SHELL.bg,
    borderWidth: 1,
    borderColor: SHELL.border,
  },
  filterChipOn: { backgroundColor: MODE.plan, borderColor: MODE.plan },
  filterLabel: { fontFamily: FONT.b600, fontSize: 13, color: SHELL.textSecondary },
  filterLabelOn: { color: '#fff' },
  listScroll: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 18 },
  group: { gap: 8 },
  sectionLabel: {
    fontFamily: FONT.bc700,
    fontSize: 12,
    color: SHELL.textMuted,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: MODE.plan, backgroundColor: SHELL.selectedFill },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: FONT.bc700, fontSize: 18, color: SHELL.text },
  rowSub: { fontFamily: FONT.b500, fontSize: 13, color: SHELL.textMuted, marginTop: 1 },
  flight: { fontFamily: FONT.bc700, fontSize: 14, color: SHELL.textMuted },
  flightOn: { color: SHELL.textSecondary },
  empty: {
    fontFamily: FONT.b500,
    fontSize: 14,
    color: SHELL.textMuted,
    lineHeight: 20,
    paddingVertical: 20,
  },
  footer: {
    fontFamily: FONT.b500,
    fontSize: 12,
    color: SHELL.textFaint,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
