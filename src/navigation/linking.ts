import { Platform } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Web only: give each screen its own URL so navigating pushes a browser
// history entry. Without this the URL never changes, and the browser (or
// Android) back button leaves the app instead of going back a screen.
//
// The web build is served under a sub-path (app.json `experiments.baseUrl`,
// e.g. /shotcaller on GitHub Pages), and React Navigation matches the full
// pathname, so every path is prefixed with it.
const base = (process.env.EXPO_BASE_URL ?? '').replace(/^\/+|\/+$/g, '');
const at = (path: string) => [base, path].filter(Boolean).join('/');

// IDs come back from the URL as strings; the screens and SQL expect numbers.
const id = { layoutId: Number, holeId: Number };

export const linking: LinkingOptions<RootStackParamList> = {
  enabled: Platform.OS === 'web',
  prefixes: [],
  config: {
    // A reloaded or shared deep link still has Home underneath it, so back
    // always has somewhere to go.
    initialRouteName: 'Home',
    screens: {
      Home: at(''),
      MyDiscs: at('bag'),
      CoursesList: at('plan'),
      CourseAdd: at('plan/new-course'),
      LayoutDetail: { path: at('plan/layout/:layoutId'), parse: id },
      LayoutEdit: { path: at('plan/layout/:layoutId/edit'), parse: id },
      PlanHole: { path: at('plan/layout/:layoutId/hole/:holeId'), parse: id },
      PlayPicker: at('play'),
      PlayLayout: { path: at('play/:layoutId'), parse: id },
      About: at('about'),
    },
  },
};
