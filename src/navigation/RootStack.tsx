import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootTabs } from './RootTabs';
import { PracticeStartScreen } from '../screens/PracticeStartScreen';
import { PracticeThrowScreen } from '../screens/PracticeThrowScreen';
import { GamePlanStartScreen } from '../screens/GamePlanStartScreen';
import { GamePlanReviewScreen } from '../screens/GamePlanReviewScreen';
import { TournamentStartScreen } from '../screens/TournamentStartScreen';
import { TournamentThrowScreen } from '../screens/TournamentThrowScreen';
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
        options={{ title: 'Pick a layout' }}
      />
      <Stack.Screen
        name="GamePlanReview"
        component={GamePlanReviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TournamentStart"
        component={TournamentStartScreen}
        options={{ title: 'Start tournament' }}
      />
      <Stack.Screen
        name="TournamentThrow"
        component={TournamentThrowScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
