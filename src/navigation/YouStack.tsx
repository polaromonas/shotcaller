import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CoursesScreen } from '../screens/CoursesScreen';
import { LayoutDetailScreen } from '../screens/LayoutDetailScreen';
import { MyDiscsScreen } from '../screens/MyDiscsScreen';
import { StatsScreen } from '../screens/StatsScreen';
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
        name="MyStats"
        component={StatsScreen}
        options={{ headerShown: false }}
      />
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
