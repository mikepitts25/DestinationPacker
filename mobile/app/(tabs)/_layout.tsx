import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const TAB_ICONS: Record<string, string> = {
  index: '🗺️',
  profile: '👤',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Trips',
  profile: 'Profile',
};

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] ?? route.name;
          const icon = TAB_ICONS[route.name] ?? '●';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>{icon}</Text>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.deepDark,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFF9F4',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'My Trips', headerShown: false }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', headerShown: false }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: '#F0F4F5',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 21,
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,40,48,0.1)',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  pill: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E8EEEF',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,40,48,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    paddingVertical: 8,
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: Colors.gold,
  },
  tabIcon: { fontSize: 18 },
  tabIconActive: {},
  tabLabel: { fontSize: 10, fontWeight: '400', color: Colors.muted },
  tabLabelActive: { fontWeight: '700', color: '#FFFFFF' },
});
