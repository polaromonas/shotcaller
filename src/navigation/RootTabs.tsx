import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { YouStack } from './YouStack';
import { MODE, UI } from '../theme/colors';
import type { RootStackParamList } from './types';

const Tab = createBottomTabNavigator();

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  tint?: string;
};

function TabIcon({ name, focused, tint }: TabIconProps) {
  const color = tint ?? (focused ? UI.text : UI.textMuted);
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

// Center "Practice" tab navigates onto the root stack instead of switching
// tabs. Same shape as the other tabs — practice color and center position
// carry the visual emphasis.
function PracticeTabButton(props: BottomTabBarButtonProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Practice round"
      onPress={() => navigation.navigate('PracticeStart')}
      style={[styles.tabBtn, props.style]}
    >
      <TabIcon name="disc" focused tint={MODE.practice} />
      <Text style={[styles.tabLabel, { color: MODE.practice }]}>Practice</Text>
    </Pressable>
  );
}

function PracticeStub() {
  return null;
}

export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: UI.text,
        tabBarInactiveTintColor: UI.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: { borderTopColor: UI.border, height: 64 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeStub}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <PracticeTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={YouStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'menu' : 'menu-outline'}
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
