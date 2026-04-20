import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootTabs } from './RootTabs';
import { PracticeStartScreen } from '../screens/PracticeStartScreen';
import { PracticeThrowScreen } from '../screens/PracticeThrowScreen';
import { GamePlanStartScreen } from '../screens/GamePlanStartScreen';
import { GamePlanReviewScreen } from '../screens/GamePlanReviewScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={RootTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PracticeStart"
        component={PracticeStartScreen}
        options={{ title: 'Start practice' }}
      />
      <Stack.Screen
        name="PracticeThrow"
        component={PracticeThrowScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GamePlanStart"
        component={GamePlanStartScreen}
        options={{ title: 'Pick a practice session' }}
      />
      <Stack.Screen
        name="GamePlanReview"
        component={GamePlanReviewScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
