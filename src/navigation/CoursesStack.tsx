import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CoursesScreen } from '../screens/CoursesScreen';
import { LayoutDetailScreen } from '../screens/LayoutDetailScreen';
import type { CoursesStackParamList } from './types';

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export function CoursesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CoursesList"
        component={CoursesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LayoutDetail"
        component={LayoutDetailScreen}
        options={{ title: 'Layout', headerBackTitle: 'Courses' }}
      />
    </Stack.Navigator>
  );
}
