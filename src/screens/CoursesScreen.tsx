import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UI } from '../theme/colors';

export function CoursesScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.title}>Courses</Text>
        <Text style={styles.note}>Add and manage courses here (coming next).</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  body: { flex: 1, padding: 24, gap: 6 },
  title: { fontSize: 22, fontWeight: '700', color: UI.text },
  note: { fontSize: 14, color: UI.textMuted },
});
