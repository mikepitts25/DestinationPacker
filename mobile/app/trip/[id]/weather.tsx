import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { useWeatherForecast } from '@/hooks/useWeather';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { WeatherDay } from '@/types';

function conditionIcon(day: WeatherDay): string {
  if (day.has_snow) return '❄️';
  if (day.has_rain) return '🌧️';
  if (day.avg_temp > 27) return '☀️';
  if (day.avg_temp < 5) return '🥶';
  return '⛅';
}

export default function WeatherScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: forecast, isLoading, isFetching, refetch } = useWeatherForecast(
    trip?.latitude ?? null,
    trip?.longitude ?? null,
    trip?.destination ?? '',
    trip?.start_date,
    trip?.end_date,
  );

  if (!trip?.latitude || !trip?.longitude) {
    return (
      <View style={styles.centered}>
        <Text style={styles.bigEmoji}>🌍</Text>
        <Text style={styles.noDataText}>No coordinates found for this destination.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading forecast...</Text>
      </View>
    );
  }

  if (!forecast) {
    return (
      <View style={styles.centered}>
        <Text style={styles.bigEmoji}>⚠️</Text>
        <Text style={styles.noDataText}>Weather data unavailable.</Text>
      </View>
    );
  }

  // Build summary stats from first available day
  const firstDay = forecast.days[0];
  const avgTemp = firstDay ? Math.round(firstDay.avg_temp) : '—';
  const maxTemp = firstDay ? Math.round(firstDay.temp_max) : '—';
  const minTemp = firstDay ? Math.round(firstDay.temp_min) : '—';

  return (
    <FlatList
      data={forecast.days}
      keyExtractor={(d) => d.date}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>⛅</Text>
            <Text style={styles.heroTemp}>{avgTemp}°C</Text>
            <Text style={styles.heroCondition}>{forecast.summary}</Text>
            <Text style={styles.heroRange}>High {maxTemp}°  ·  Low {minTemp}°</Text>
          </View>

          {/* Condition cards */}
          <View style={styles.condRow}>
            {forecast.conditions.slice(0, 3).map((c) => (
              <View key={c} style={styles.condCard}>
                <Text style={styles.condEmoji}>
                  {c.toLowerCase().includes('rain') ? '🌧️' : c.toLowerCase().includes('wind') ? '💨' : c.toLowerCase().includes('snow') ? '❄️' : '🌡️'}
                </Text>
                <Text style={styles.condText}>{c}</Text>
              </View>
            ))}
            {forecast.conditions.length === 0 && (
              <>
                <View style={styles.condCard}><Text style={styles.condEmoji}>💧</Text><Text style={styles.condText}>Humidity</Text></View>
                <View style={styles.condCard}><Text style={styles.condEmoji}>💨</Text><Text style={styles.condText}>Wind</Text></View>
                <View style={styles.condCard}><Text style={styles.condEmoji}>🌧️</Text><Text style={styles.condText}>Rain chance</Text></View>
              </>
            )}
          </View>

          {/* Source + refresh */}
          <View style={styles.sourceRow}>
            <Text style={styles.sourceText}>Via {forecast.source.name} · Updated {formatUpdatedAt(forecast.updated_at)}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()} disabled={isFetching}>
              {isFetching
                ? <ActivityIndicator size={14} color={Colors.primary} />
                : <Text style={styles.refreshBtnText}>↻ Update</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>TRIP FORECAST</Text>
        </View>
      }
      renderItem={({ item, index }) => <WeatherDayRow day={item} highlight={index === 0} />}
      ListFooterComponent={<View style={{ height: 40 }} />}
    />
  );
}

function WeatherDayRow({ day, highlight }: { day: WeatherDay; highlight?: boolean }) {
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.dayRow, highlight && styles.dayRowHighlight]}>
      <View style={styles.dayLeft}>
        <Text style={[styles.dayName, highlight && styles.dayNameHighlight]}>{dayName}</Text>
        <Text style={styles.dayDate}>{dateStr}</Text>
      </View>
      <Text style={styles.dayIcon}>{conditionIcon(day)}</Text>
      <View style={styles.dayCenter}>
        <Text style={styles.dayDesc} numberOfLines={1}>{day.description}</Text>
        {day.rain_probability !== null && (
          <Text style={styles.rainChance}>💧 {day.rain_probability}%</Text>
        )}
      </View>
      <View style={styles.dayTemps}>
        <Text style={[styles.tempHigh, highlight && styles.tempHighlight]}>{Math.round(day.temp_max)}°</Text>
        <Text style={styles.tempLow}>{Math.round(day.temp_min)}°</Text>
      </View>
    </View>
  );
}

function formatUpdatedAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'recently';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, backgroundColor: Colors.background },
  bigEmoji: { fontSize: 48, marginBottom: Spacing.md },
  noDataText: { fontSize: 15, color: Colors.muted, textAlign: 'center' },
  loadingText: { fontSize: 14, color: Colors.muted, marginTop: Spacing.md },
  list: { padding: Spacing.md, backgroundColor: Colors.background },
  hero: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  heroIcon: { fontSize: 64, marginBottom: Spacing.sm },
  heroTemp: { fontSize: 56, fontWeight: '800', color: Colors.onSurface, lineHeight: 60 },
  heroCondition: { fontSize: 16, fontWeight: '500', color: Colors.primary, marginTop: 4 },
  heroRange: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  condRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  condCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  condEmoji: { fontSize: 22, marginBottom: 4 },
  condText: { fontSize: 11, color: Colors.muted, textAlign: 'center' },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sourceText: { flex: 1, fontSize: 11, color: Colors.muted },
  refreshBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 76,
    alignItems: 'center',
  },
  refreshBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.primary,
    letterSpacing: 1.2, marginBottom: Spacing.sm, paddingHorizontal: 4,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dayRowHighlight: { backgroundColor: '#FFF3D6', borderWidth: 1, borderColor: 'rgba(238,155,0,0.2)' },
  dayLeft: { width: 44 },
  dayName: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  dayNameHighlight: { color: Colors.gold },
  dayDate: { fontSize: 11, color: Colors.muted },
  dayIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  dayCenter: { flex: 1 },
  dayDesc: { fontSize: 13, color: Colors.muted },
  rainChance: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  dayTemps: { alignItems: 'flex-end' },
  tempHigh: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  tempHighlight: { color: Colors.gold },
  tempLow: { fontSize: 12, color: Colors.muted },
});
