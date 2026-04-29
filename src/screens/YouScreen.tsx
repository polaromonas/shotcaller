import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UI } from '../theme/colors';
import type { YouStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<YouStackParamList, 'YouHome'>;

type Item = {
  label: string;
  description: string;
  glyph: string;
  route: keyof YouStackParamList;
};

const ITEMS: Item[] = [
  {
    label: 'My Discs',
    description: 'Your collection and bag',
    glyph: '◎',
    route: 'MyDiscs',
  },
  {
    label: 'Sessions',
    description: 'Past practice and tournament rounds',
    glyph: '⌚',
    route: 'Sessions',
  },
  {
    label: 'My Stats',
    description: 'Performance and activity',
    glyph: '◧',
    route: 'MyStats',
  },
  {
    label: 'Courses',
    description: 'Browse and edit saved courses',
    glyph: '⛳',
    route: 'CoursesList',
  },
  {
    label: 'About ShotCaller',
    description: 'How the app works',
    glyph: 'ⓘ',
    route: 'About',
  },
];

export function YouScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>You</Text>
      </View>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate(item.route as never)}
          >
            <Text style={styles.glyph}>{item.glyph}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowDescription} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
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
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: UI.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  rowPressed: { opacity: 0.7 },
  glyph: { fontSize: 22, color: UI.text, width: 28, textAlign: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: UI.text },
  rowDescription: { fontSize: 12, color: UI.textMuted },
  chev: { fontSize: 22, color: UI.textMuted },
});
