import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'About'>;

export function AboutScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>About ShotCaller</Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.tagline}>You call the shots.</Text>
        <Text style={styles.body}>
          ShotCaller is a game-planning app for disc golf. It's the second screen
          you glance at on the tee: what disc, what shape, where to aim.
        </Text>

        <Section
          color={MODE.plan}
          label="Plan"
          body="At home, build a hole-by-hole plan for a course layout: the disc, the throw, the shot shape, and a note on where to aim. Jot what you know — a partial plan is fine."
        />

        <Section
          color={MODE.play}
          label="Play"
          body="On the course, read your plan one hole at a time — big, glanceable, sunlight-ready. Swipe to the next tee. It reopens right where you left off when you come back from your scorekeeping app."
        />

        <View style={styles.privacyCard}>
          <Text style={styles.privacyLabel}>Your data stays here</Text>
          <Text style={styles.privacyBody}>
            Everything — discs, courses, plans — lives on this device only.
            No account, no upload, no server.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  color,
  label,
  body,
}: {
  color: string;
  label: string;
  body: string;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.modeChip, { backgroundColor: color }]}>
        <Text style={styles.modeChipLabel}>{label}</Text>
      </View>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  back: { fontSize: 16, color: UI.textMuted },
  // Spacer to keep the title visually centered against the Back chevron.
  backSpacer: { width: 48 },
  title: { fontSize: 18, fontWeight: '700', color: UI.text },
  content: { padding: 20, gap: 18, paddingBottom: 32 },
  tagline: { fontSize: 18, fontWeight: '600', color: UI.text },
  body: { fontSize: 14, color: UI.text, lineHeight: 20 },
  section: { gap: 6 },
  modeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modeChipLabel: {
    color: UI.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionBody: { fontSize: 14, color: UI.text, lineHeight: 20 },
  privacyCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 4,
  },
  privacyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textMuted,
  },
  privacyBody: { fontSize: 13, color: UI.text, lineHeight: 18 },
});
