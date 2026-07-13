import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
  const [fontsLoaded] = useFonts({
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
        {state.status === 'ready' && fontsLoaded ? (
          <NavigationContainer theme={navTheme}>
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
