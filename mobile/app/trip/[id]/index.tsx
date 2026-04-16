import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrip } from '@/hooks/useTrips';
import { useGeneratePackingList } from '@/hooks/usePackingList';
import { Colors, Spacing, Typography } from '@/constants/theme';
import PackingScreen from './packing';
import ActivitiesScreen from './activities';
import WeatherScreen from './weather';

const Tab = createMaterialTopTabNavigator();

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id);
  const { mutate: generate, isPending: isGenerating } = useGeneratePackingList(id);

  useEffect(() => {
    // Auto-generate packing list when trip is first loaded
    if (trip && id) {
      generate();
    }
  }, [trip?.id]);

  if (isLoading || !trip) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Trip Header */}
      <View style={styles.header}>
        <Text
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          ←
        </Text>
        <View style={styles.headerInfo}>
          <Text style={styles.destination}>{trip.destination}</Text>
          <Text style={styles.dates}>
            {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{trip.duration_days - 1} nights
          </Text>
        </View>
      </View>

      {isGenerating && (
        <View style={styles.generatingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.generatingText}>Generating your packing list...</Text>
        </View>
      )}

      {/* Tab navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.muted,
          tabBarIndicatorStyle: { backgroundColor: Colors.primary },
          tabBarStyle: { backgroundColor: Colors.surface },
          tabBarLabelStyle: { ...Typography.label },
        }}
      >
        <Tab.Screen name="Packing" component={PackingScreen} initialParams={{ id }} />
        <Tab.Screen name="Activities" component={ActivitiesScreen} initialParams={{ id }} />
        <Tab.Screen name="Weather" component={WeatherScreen} initialParams={{ id }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: 24, color: Colors.primary, marginRight: Spacing.sm },
  headerInfo: { flex: 1 },
  destination: { ...Typography.h3, color: Colors.onSurface },
  dates: { ...Typography.caption, color: Colors.muted },
  generatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0fe',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  generatingText: { ...Typography.label, color: Colors.primary },
});
