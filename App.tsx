import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import { getDb } from './src/db';
import { RootStack } from './src/navigation/RootStack';
import { linking } from './src/navigation/linking';
import { UI } from './src/theme/colors';

type InitState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

// Dark navigation theme so the container background (and inter-screen
// transitions) match the dark shell instead of flashing white.
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: UI.bg, card: UI.bg, border: UI.border },
};

export default function App() {
  const [state, setState] = useState<InitState>({ status: 'loading' });
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  useEffect(() => {
    (async () => {
      try {
        // Dev-only demo data for screenshots: `?seed=demo` on the web dev
        // server. __DEV__ is false in production builds, so this is stripped.
        if (
          __DEV__ &&
          Platform.OS === 'web' &&
          new URLSearchParams(window.location.search).get('seed') === 'demo'
        ) {
          const { seedDemo } = await import('./src/dev/seedDemo');
          await seedDemo();
          window.history.replaceState(null, '', window.location.pathname);
        }
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
        {state.status === 'ready' && (fontsLoaded || fontError) ? (
          <NavigationContainer
            theme={navTheme}
            linking={linking}
            documentTitle={{ formatter: () => 'ShotCaller' }}
          >
            <RootStack />
          </NavigationContainer>
        ) : (
          <View style={styles.splash}>
            {state.status === 'error' ? (
              <Text style={styles.err}>DB error: {state.message}</Text>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        )}
        <StatusBar style="light" />
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
