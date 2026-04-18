import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from './src/db';
import { RootStack } from './src/navigation/RootStack';
import { UI } from './src/theme/colors';

type InitState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<InitState>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        setState({ status: 'ready' });
      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {state.status === 'ready' ? (
          <NavigationContainer>
            <RootStack />
          </NavigationContainer>
        ) : (
          <View style={styles.splash}>
            {state.status === 'loading' ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.err}>DB error: {state.message}</Text>
            )}
          </View>
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  err: { color: '#b83a3a', fontSize: 14, textAlign: 'center' },
});
