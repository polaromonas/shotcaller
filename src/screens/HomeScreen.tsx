import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UI } from '../theme/colors';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.title}>ShotCaller</Text>
        <Text style={styles.subtitle}>You call the shots.</Text>
        <Text style={styles.note}>
          Mode picker comes here once Practice, Game Plan, and Tournament screens are built.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  body: { flex: 1, padding: 24, justifyContent: 'center', gap: 6 },
  title: { fontSize: 32, fontWeight: '700', color: UI.text },
  subtitle: { fontSize: 16, color: UI.textMuted },
  note: { marginTop: 24, fontSize: 13, color: UI.textMuted, lineHeight: 18 },
});
