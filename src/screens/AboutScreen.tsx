import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MODE, UI } from '../theme/colors';

export function AboutScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>About ShotCaller</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.tagline}>You call the shots.</Text>
        <Text style={styles.body}>
          ShotCaller helps you prep for disc golf tournaments by turning
          your practice rounds into a hole-by-hole game plan you can lean
          on when it counts.
        </Text>

        <Section
          color={MODE.practice}
          label="Practice round"
          body="Walk up to a course, pick (or create) the layout, and log throws as you play. Par and distance are filled in at each tee box. Leave any time — your round is saved and shows up as a Resume card on Home."
        />

        <Section
          color={MODE.gamePlan}
          label="Game plan"
          body="After enough practice on a layout, ShotCaller ranks your most reliable disc + throw type + shot shape per hole and surfaces it as a recommendation. Override anything you want, then lock it in. Export to a printable text file if you want to bring it to the course."
        />

        <Section
          color={MODE.tournament}
          label="Tournament round"
          body="Each hole shows the locked-in plan as a read-only card with the disc and shot shape pre-selected. One tap logs a throw if you executed as planned. Override per throw without modifying the plan."
        />

        <View style={styles.privacyCard}>
          <Text style={styles.privacyLabel}>Your data stays here</Text>
          <Text style={styles.privacyBody}>
            Everything — discs, courses, throws, plans — lives on this
            device only. No account, no upload, no server. Game plans
            can be exported to text as a hedge against losing the data.
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: UI.text },
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  privacyBody: { fontSize: 13, color: UI.text, lineHeight: 18 },
});
