import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { MyDiscsScreen } from '../screens/MyDiscsScreen';
import { CoursesScreen } from '../screens/CoursesScreen';
import { CourseAddScreen } from '../screens/CourseAddScreen';
import { LayoutHolesScreen } from '../screens/LayoutHolesScreen';
import { LayoutEditScreen } from '../screens/LayoutEditScreen';
import { PlanHoleScreen } from '../screens/PlanHoleScreen';
import { PlayPickerScreen } from '../screens/PlayPickerScreen';
import { PlayLayoutScreen } from '../screens/PlayLayoutScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { UI } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Hub-and-spoke: Home is the root, everything else pushes on top and backs out
// to Home. Most screens draw their own header; only the two utility form
// screens (add course / edit layout) use the native header, styled dark here.
export function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: UI.bg },
        headerTintColor: UI.text,
        headerTitleStyle: { color: UI.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: UI.bg },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyDiscs" component={MyDiscsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoursesList" component={CoursesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CourseAdd" component={CourseAddScreen} options={{ title: 'Add course' }} />
      <Stack.Screen name="LayoutDetail" component={LayoutHolesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LayoutEdit" component={LayoutEditScreen} options={{ title: 'Edit layout' }} />
      <Stack.Screen name="PlanHole" component={PlanHoleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlayPicker" component={PlayPickerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlayLayout" component={PlayLayoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
