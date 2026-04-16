import { View, FlatList, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useWeatherForecast } from '@/hooks/useWeather';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { WeatherDay } from '@/types';

export default function WeatherScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);

  const { data: forecast, isLoading } = useWeatherForecast(
    trip?.latitude ?? null,
    trip?.longitude ?? null,
    trip?.destination ?? '',
  );

  if (!trip?.latitude || !trip?.longitude) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noDataEmoji}>🌍</Text>
        <Text style={styles.noDataText}>
          Add coordinates to your destination to see the weather forecast.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading weather...</Text>
      </View>
    );
  }

  if (!forecast) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noDataEmoji}>⚠️</Text>
        <Text style={styles.noDataText}>Weather data unavailable.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={forecast.days}
      keyExtractor={(d) => d.date}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.summary}>
          <Text style={styles.destination}>{trip.destination}</Text>
          <Text style={styles.summaryText}>{forecast.summary}</Text>
          {forecast.conditions.length > 0 && (
            <View style={styles.conditionTags}>
              {forecast.conditions.map((c) => (
                <View key={c} style={styles.conditionTag}>
                  <Text style={styles.conditionTagText}>{c}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => <WeatherDayCard day={item} />}
    />
  );
}

function WeatherDayCard({ day }: { day: WeatherDay }) {
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const conditionEmoji = day.has_snow ? '❄️' : day.has_rain ? '🌧️' : day.avg_temp > 27 ? '☀️' : day.avg_temp < 5 ? '🥶' : '⛅';

  return (
    <View style={styles.dayCard}>
      <View style={styles.dayLeft}>
        <Text style={styles.dayName}>{dayName}</Text>
        <Text style={styles.dateStr}>{dateStr}</Text>
      </View>
      <Text style={styles.weatherEmoji}>{conditionEmoji}</Text>
      <View style={styles.dayCenter}>
        <Text style={styles.description}>{day.description}</Text>
      </View>
      <View style={styles.dayTemps}>
        <Text style={styles.tempMax}>{Math.round(day.temp_max)}°</Text>
        <Text style={styles.tempMin}>{Math.round(day.temp_min)}°</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  noDataEmoji: { fontSize: 48, marginBottom: Spacing.md },
  noDataText: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
  loadingText: { ...Typography.body, color: Colors.muted, marginTop: Spacing.md },
  list: { padding: Spacing.md },
  summary: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  destination: { ...Typography.h2, color: '#fff', marginBottom: 4 },
  summaryText: { ...Typography.body, color: 'rgba(255,255,255,0.9)', marginBottom: Spacing.sm },
  conditionTags: { flexDirection: 'row', gap: Spacing.sm },
  conditionTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  conditionTagText: { ...Typography.caption, color: '#fff', textTransform: 'capitalize' },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  dayLeft: { width: 44 },
  dayName: { ...Typography.label, color: Colors.onSurface, fontWeight: '700' },
  dateStr: { ...Typography.caption, color: Colors.muted },
  weatherEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  dayCenter: { flex: 1 },
  description: { ...Typography.caption, color: Colors.muted },
  dayTemps: { alignItems: 'flex-end' },
  tempMax: { ...Typography.body, color: Colors.onSurface, fontWeight: '700' },
  tempMin: { ...Typography.caption, color: Colors.muted },
});
