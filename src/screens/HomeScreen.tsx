import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MODE, UI } from '../theme/colors';

// Transitional V2 Home. The full design-1d Home (resume-round card, gradient
// PLAN/PLAY tiles, My Bag card) lands once the Plan and Play screens exist.
// For now it wires only to surfaces that are actually built: Courses, My Bag,
// and About. Plan/Play tiles route to Courses (pick a layout) as a stopgap.
export function HomeScreen() {
  const navigation = useNavigation<any>();

  const openCourses = () =>
    navigation.navigate('More', { screen: 'CoursesList' });
  const openBag = () => navigation.navigate('More', { screen: 'MyDiscs' });
  const openAbout = () => navigation.getParent()?.navigate('About');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>ShotCaller</Text>
          <Text style={styles.subtitle}>You call the shots.</Text>
        </View>

        <View style={styles.modes}>
          <ModeCard
            label="Plan"
            description="Build a hole-by-hole game plan."
            color={MODE.plan}
            onPress={openCourses}
          />
          <ModeCard
            label="Play"
            description="Read your plan on the tee. One glance, one throw."
            color={MODE.play}
            onPress={openCourses}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.bagCard, pressed && styles.pressed]}
          onPress={openBag}
        >
          <Text style={styles.bagLabel}>My Bag</Text>
          <Text style={styles.bagChev}>›</Text>
        </Pressable>

        <Pressable onPress={openAbout} hitSlop={6} style={styles.helpLink}>
          <Text style={styles.helpLinkLabel}>How does ShotCaller work?</Text>
        </Pressable>

        <Text style={styles.wip}>V2 in progress — Plan and Play screens coming next.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type ModeCardProps = {
  label: string;
  description: string;
  color: string;
  onPress: () => void;
};

function ModeCard({ label, description, color, onPress }: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        { backgroundColor: color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.modeLabel}>{label}</Text>
      <Text style={styles.modeDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  content: { padding: 20, paddingTop: 24, gap: 24 },
  hero: { gap: 4 },
  title: { fontSize: 34, fontWeight: '700', color: UI.text },
  subtitle: { fontSize: 16, color: UI.textMuted },
  modes: { gap: 12 },
  modeCard: { borderRadius: 16, padding: 24, gap: 4 },
  pressed: { opacity: 0.85 },
  modeLabel: { fontSize: 24, fontWeight: '800', color: UI.textInverse },
  modeDescription: { fontSize: 14, color: UI.textInverse, opacity: 0.92 },
  bagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  bagLabel: { fontSize: 16, fontWeight: '700', color: UI.text },
  bagChev: { fontSize: 20, color: UI.textMuted },
  helpLink: { alignItems: 'center' },
  helpLinkLabel: {
    fontSize: 13,
    color: UI.textMuted,
    textDecorationLine: 'underline',
  },
  wip: { fontSize: 12, color: UI.textMuted, textAlign: 'center' },
});
