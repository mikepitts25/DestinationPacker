import { View, FlatList, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Text, FAB, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { FREE_TRIP_LIMIT } from '@/constants/config';
import { formatTripDurationBadge, formatTripRoute } from '@/lib/trips/tripDisplay';
import type { Trip } from '@/types';

export default function HomeScreen() {
  const { data: trips, isLoading } = useTrips();
  const { mutateAsync: deleteTrip } = useDeleteTrip();
  const { isPremium } = useAuthStore();

  const handleDeleteTrip = (trip: Trip) => {
    Alert.alert(
      'Delete Trip',
      `Delete your trip to ${trip.destination}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrip(trip.id).catch(() => {}),
        },
      ],
    );
  };

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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Teal gradient header strip */}
      <LinearGradient
        colors={[Colors.deepDark, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerStrip}
      >
        <Text style={styles.headerTitle}>My Trips</Text>
        <Text style={styles.headerSub}>{upcomingTrips.length} upcoming</Text>
      </LinearGradient>

      {/* White cream body */}
      <View style={styles.body}>
        {!isPremium && (
          <TouchableOpacity onPress={() => router.push('/premium')} style={styles.premiumBanner}>
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            >
              <Text style={styles.premiumBannerText}>
                ✨ Create unlimited trips with Premium
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <FlatList
          data={upcomingTrips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            upcomingTrips.length > 0 ? (
              <Text style={styles.sectionTitle}>Upcoming Trips</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TripCard trip={item} onDelete={() => handleDeleteTrip(item)} />
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
                  <TripCard key={trip.id} trip={trip} past onDelete={() => handleDeleteTrip(trip)} />
                ))}
              </>
            ) : null
          }
        />
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddTrip}
        color="#FFFFFF"
      />
    </View>
  );
}

const TRAVEL_EMOJI: Record<string, string> = {
  flight: '✈️', road_trip: '🚗', train: '🚂', cruise: '🚢', backpacking: '🎒',
};
const STAY_EMOJI: Record<string, string> = {
  hotel: '🏨', hostel: '🏠', airbnb: '🏡', camping: '⛺', resort: '🏖️', cruise: '🚢', friends_family: '🏘️',
};

function TripCard({ trip, past, onDelete }: { trip: Trip; past?: boolean; onDelete: () => void }) {
  const startStr = new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity
      style={[styles.card, past && styles.pastCard]}
      onPress={() => router.push(`/trip/${trip.id}`)}
      onLongPress={onDelete}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.destination}>{formatTripRoute(trip)}</Text>
          <Text style={styles.dates}>{startStr} — {endStr}</Text>
        </View>
        <View style={styles.nightsBadge}>
          <Text style={styles.nightsText}>{formatTripDurationBadge(trip.duration_days)}</Text>
        </View>
      </View>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {TRAVEL_EMOJI[trip.travel_method] ?? '🚀'} {trip.travel_method.replace('_', ' ')}
          </Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {STAY_EMOJI[trip.accommodation] ?? '🏨'} {trip.accommodation}
          </Text>
        </View>
        {(trip.travelers > 1 || trip.pets > 0) && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>👥 {trip.travelers}{trip.pets > 0 ? ` + 🐾 ${trip.pets}` : ''}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.deepDark },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  headerStrip: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + 8,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF9F4' },
  headerSub: { fontSize: 13, color: 'rgba(255,249,244,0.65)', marginTop: 2 },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
  },
  premiumBanner: { marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.md, overflow: 'hidden' },
  premiumGradient: { padding: Spacing.sm + 2, alignItems: 'center' },
  premiumBannerText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  list: { padding: Spacing.md, paddingBottom: 120 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pastCard: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  destination: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },
  dates: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  nightsBadge: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nightsText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: { fontSize: 12, color: Colors.onSurface, textAlignVertical: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.muted },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.lg,
    backgroundColor: Colors.gold,
  },
});
