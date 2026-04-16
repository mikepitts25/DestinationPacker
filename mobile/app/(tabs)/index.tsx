import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTrips } from '@/hooks/useTrips';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { FREE_TRIP_LIMIT } from '@/constants/config';
import type { Trip } from '@/types';

export default function HomeScreen() {
  const { data: trips, isLoading } = useTrips();
  const { isPremium } = useAuthStore();

  const upcomingTrips = trips?.filter(t => new Date(t.end_date) >= new Date()) ?? [];
  const pastTrips = trips?.filter(t => new Date(t.end_date) < new Date()) ?? [];

  const handleAddTrip = () => {
    if (!isPremium && (trips?.length ?? 0) >= FREE_TRIP_LIMIT) {
      router.push('/premium');
      return;
    }
    router.push('/trip/new');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={upcomingTrips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {!isPremium && (
              <TouchableOpacity onPress={() => router.push('/premium')} style={styles.premiumBanner}>
                <Text style={styles.premiumBannerText}>
                  ✨ Upgrade to Premium — AI packing, unlimited trips & more
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sectionTitle}>
              {upcomingTrips.length > 0 ? 'Upcoming Trips' : "You haven't planned any trips yet"}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <TripCard trip={item} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌍</Text>
            <Text style={styles.emptyText}>Tap + to plan your first adventure!</Text>
          </View>
        }
        ListFooterComponent={
          pastTrips.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Past Trips</Text>
              {pastTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} past />
              ))}
            </>
          ) : null
        }
      />

      {!isPremium && <View style={styles.adPlaceholder}><Text style={styles.adText}>Ad</Text></View>}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddTrip}
        color={Colors.surface}
      />
    </SafeAreaView>
  );
}

function TripCard({ trip, past }: { trip: Trip; past?: boolean }) {
  const nights = trip.duration_days - 1;
  const accommodationEmoji: Record<string, string> = {
    hotel: '🏨', hostel: '🏠', airbnb: '🏡', camping: '⛺',
    resort: '🏖️', cruise: '🚢', friends_family: '🏘️',
  };
  const travelEmoji: Record<string, string> = {
    flight: '✈️', road_trip: '🚗', train: '🚂', cruise: '🚢', backpacking: '🎒',
  };

  return (
    <TouchableOpacity
      style={[styles.card, past && styles.pastCard]}
      onPress={() => router.push(`/trip/${trip.id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.destination}>{trip.destination}</Text>
          <Text style={styles.dates}>
            {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' — '}
            {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.daysLabel}>{nights > 0 ? `${nights}N` : '1 day'}</Text>
      </View>
      <View style={styles.chips}>
        <Chip compact style={styles.chip}>{travelEmoji[trip.travel_method]} {trip.travel_method.replace('_', ' ')}</Chip>
        <Chip compact style={styles.chip}>{accommodationEmoji[trip.accommodation]} {trip.accommodation}</Chip>
        {trip.travelers > 1 && <Chip compact style={styles.chip}>👥 {trip.travelers}</Chip>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, paddingBottom: 120 },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.sm },
  premiumBanner: {
    backgroundColor: Colors.premiumGold,
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  premiumBannerText: { ...Typography.label, color: '#5d4037' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pastCard: { opacity: 0.6 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  destination: { ...Typography.h3, color: Colors.onSurface },
  dates: { ...Typography.caption, color: Colors.muted, marginTop: 2 },
  daysLabel: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { backgroundColor: Colors.background, height: 26 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.muted },
  adPlaceholder: {
    height: 52,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adText: { color: Colors.muted, fontSize: 11 },
  fab: {
    position: 'absolute',
    bottom: 70,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
  },
});
