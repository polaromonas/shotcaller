import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { YouStack } from './YouStack';
import { UI } from '../theme/colors';

const Tab = createBottomTabNavigator();

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
};

function TabIcon({ name, focused }: TabIconProps) {
  const color = focused ? UI.text : UI.textMuted;
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
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
        tabBarStyle: {
          backgroundColor: UI.bg,
          borderTopColor: UI.border,
          height: 64,
        },
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
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
