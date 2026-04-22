import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrip, useDeleteTrip } from '@/hooks/useTrips';
import { Colors, Spacing, Typography } from '@/constants/theme';
import PackingScreen from './packing';
import ActivitiesScreen from './activities';
import WeatherScreen from './weather';

const Tab = createMaterialTopTabNavigator();

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id);
  const { mutateAsync: deleteTrip, isPending: isDeleting } = useDeleteTrip();

  const handleDelete = () => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete your trip to ${trip?.destination}? This will also remove the packing list and activities.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(id);
              router.replace('/(tabs)');
            } catch {}
          },
        },
      ],
    );
  };

  if (isLoading || !trip) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Trip Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backBtnText}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.destination} numberOfLines={1}>{trip.destination}</Text>
          <Text style={styles.dates}>
            {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{trip.duration_days - 1} nights
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={isDeleting}
          style={styles.deleteBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  backBtnText: { fontSize: 24, color: Colors.primary },
  headerInfo: { flex: 1, marginRight: Spacing.sm },
  deleteBtn: {
    padding: Spacing.sm,
  },
  deleteBtnText: { fontSize: 22 },
  destination: { ...Typography.h3, color: Colors.onSurface },
  dates: { ...Typography.caption, color: Colors.muted },
});
