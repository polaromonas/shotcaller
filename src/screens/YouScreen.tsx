import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UI } from '../theme/colors';
import type {
  RootStackParamList,
  YouStackParamList,
} from '../navigation/types';

type YouNav = NativeStackNavigationProp<YouStackParamList, 'YouHome'>;

// About lives on the root stack (so Home can also reach it directly), every
// other tile lives in YouStack. Items declare which navigator they target.
type Item =
  | {
      target: 'you';
      label: string;
      description: string;
      glyph: string;
      route: keyof YouStackParamList;
    }
  | {
      target: 'root';
      label: string;
      description: string;
      glyph: string;
      route: keyof RootStackParamList;
    };

const ITEMS: Item[] = [
  {
    target: 'you',
    label: 'My Discs',
    description: 'Your collection and bag',
    glyph: '◎',
    route: 'MyDiscs',
  },
  {
    target: 'you',
    label: 'Sessions',
    description: 'Past practice and tournament rounds',
    glyph: '⌚',
    route: 'Sessions',
  },
  {
    target: 'you',
    label: 'My Stats',
    description: 'Performance and activity',
    glyph: '◧',
    route: 'MyStats',
  },
  {
    target: 'you',
    label: 'Courses',
    description: 'Browse and edit saved courses',
    glyph: '⛳',
    route: 'CoursesList',
  },
  {
    target: 'root',
    label: 'About ShotCaller',
    description: 'How the app works',
    glyph: 'ⓘ',
    route: 'About',
  },
];

export function YouScreen() {
  const youNav = useNavigation<YouNav>();
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
            onPress={() => {
              if (item.target === 'root') {
                youNav
                  .getParent<NativeStackNavigationProp<RootStackParamList>>()
                  ?.navigate(item.route as never);
              } else {
                youNav.navigate(item.route as never);
              }
            }}
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
