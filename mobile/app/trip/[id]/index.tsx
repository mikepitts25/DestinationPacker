import { View, StyleSheet, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTrip, useDeleteTrip } from '@/hooks/useTrips';
import { Colors, Spacing } from '@/constants/theme';
import { formatTripDurationBadge, formatTripRoute } from '@/lib/trips/tripDisplay';
import OverviewScreen from './overview';
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
      `Are you sure you want to delete your trip to ${trip?.destination}?`,
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

  const startStr = new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const durationLabel = formatTripDurationBadge(trip.duration_days);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Teal gradient header strip */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.deepDark }}>
        <LinearGradient
          colors={[Colors.deepDark, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.backBtnCircle}>
              <Text style={styles.backBtnText}>←</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.destination} numberOfLines={1}>{formatTripRoute(trip)}</Text>
            <Text style={styles.dates}>{startStr} – {endStr} · {durationLabel}</Text>
          </View>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={styles.deleteBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.backBtnCircle}>
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>

      {/* Material Top Tab navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.gold,
          tabBarInactiveTintColor: Colors.muted,
          tabBarIndicatorStyle: { backgroundColor: Colors.gold, height: 3, borderRadius: 2 },
          tabBarStyle: { backgroundColor: Colors.surface, elevation: 0, shadowOpacity: 0 },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
          tabBarScrollEnabled: true,
          tabBarItemStyle: { width: 'auto', paddingHorizontal: 4 },
          tabBarPressColor: 'rgba(10,147,150,0.1)',
        }}
      >
        <Tab.Screen name="Overview" component={OverviewScreen} initialParams={{ id }} />
        <Tab.Screen name="Packing" component={PackingScreen} initialParams={{ id }} />
        <Tab.Screen name="Activities" component={ActivitiesScreen} initialParams={{ id }} />
        <Tab.Screen name="Weather" component={WeatherScreen} initialParams={{ id }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {},
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: '#FFF9F4' },
  headerInfo: { flex: 1 },
  destination: { fontSize: 17, fontWeight: '700', color: '#FFF9F4' },
  dates: { fontSize: 12, color: 'rgba(255,249,244,0.65)', marginTop: 2 },
  deleteBtn: {},
});
