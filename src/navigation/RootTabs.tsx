import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { MyDiscsScreen } from '../screens/MyDiscsScreen';
import { CoursesStack } from './CoursesStack';
import { StatsScreen } from '../screens/StatsScreen';
import { UI } from '../theme/colors';

const Tab = createBottomTabNavigator();

type TabIconProps = { glyph: string; focused: boolean };

function TabIcon({ glyph, focused }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.glyph, focused && styles.glyphOn]}>{glyph}</Text>
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
        tabBarStyle: { borderTopColor: UI.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="My discs"
        component={MyDiscsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="◎" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="⛳" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="◧" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 20, color: UI.textMuted },
  glyphOn: { color: UI.text },
});
