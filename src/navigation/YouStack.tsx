import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CourseAddScreen } from '../screens/CourseAddScreen';
import { CoursesScreen } from '../screens/CoursesScreen';
import { LayoutDetailScreen } from '../screens/LayoutDetailScreen';
import { MyDiscsScreen } from '../screens/MyDiscsScreen';
import { PlanHoleScreen } from '../screens/PlanHoleScreen';
import { YouScreen } from '../screens/YouScreen';
import type { YouStackParamList } from './types';

const Stack = createNativeStackNavigator<YouStackParamList>();

export function YouStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="YouHome"
        component={YouScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyDiscs"
        component={MyDiscsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoursesList"
        component={CoursesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourseAdd"
        component={CourseAddScreen}
        options={{ title: 'Add course', headerBackTitle: 'Courses' }}
      />
      <Stack.Screen
        name="LayoutDetail"
        component={LayoutDetailScreen}
        options={{ title: 'Layout', headerBackTitle: 'Courses' }}
      />
      <Stack.Screen
        name="PlanHole"
        component={PlanHoleScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
