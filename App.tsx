import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getDb } from './src/db';

type InitState =
  | { status: 'loading' }
  | { status: 'ready'; tableCount: number; tagCount: number }
  | { status: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<InitState>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        const tagRow = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM tag'
        );
        setState({
          status: 'ready',
          tableCount: tables.length,
          tagCount: tagRow?.count ?? 0,
        });
      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShotCaller</Text>
      {state.status === 'loading' && <ActivityIndicator />}
      {state.status === 'ready' && (
        <>
          <Text style={styles.ok}>Database ready</Text>
          <Text style={styles.meta}>
            {state.tableCount} tables · {state.tagCount} seed tags
          </Text>
        </>
      )}
      {state.status === 'error' && (
        <Text style={styles.err}>DB error: {state.message}</Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16 },
  ok: { fontSize: 16, color: '#4a9e5c' },
  meta: { fontSize: 13, color: '#555870', marginTop: 4 },
  err: { fontSize: 14, color: '#b83a3a', textAlign: 'center' },
});
