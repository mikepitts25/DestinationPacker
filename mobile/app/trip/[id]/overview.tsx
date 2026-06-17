import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useActivities, useFetchActivities } from '@/hooks/useActivities';
import { useGeneratePackingList, usePackingList } from '@/hooks/usePackingList';
import { useTrip } from '@/hooks/useTrips';
import { useTripWeatherForecasts } from '@/hooks/useWeather';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  buildTripAdvisorShareText,
  tripAdvisorGuideForDestination,
  type AdvisorItem,
  type DestinationAdvisorGuide,
} from '@/lib/advisor/tripAdvisor';
import { tripDestinations } from '@/lib/trips/destinations';
import { buildTripPrepTasks } from '@/lib/trips/prepTasks';

type ReadinessItem = {
  label: string;
  detail: string;
  done: boolean;
};

type BriefingGroup = {
  title: string;
  icon: string;
  items: {
    label: string;
    item: AdvisorItem;
    destination: string;
  }[];
};

export default function OverviewScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading: isTripLoading } = useTrip(tripId);
  const { data: packingList, isLoading: isPackingLoading } = usePackingList(tripId);
  const { data: activities } = useActivities(tripId);
  const { data: weatherRows } = useTripWeatherForecasts(trip);
  const { mutate: generatePacking, isPending: isGeneratingPacking } = useGeneratePackingList(tripId);
  const { mutate: fetchActivities, isPending: isFetchingActivities } = useFetchActivities(tripId);

  if (isTripLoading || isPackingLoading || !trip) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const totalItems = packingList?.total_items ?? 0;
  const packedItems = packingList?.packed_items ?? 0;
  const packingProgress = totalItems > 0 ? packedItems / totalItems : 0;
  const selectedActivities = activities?.filter((activity) => activity.selected).length ?? 0;
  const suggestedActivities = activities?.length ?? 0;
  const destinations = tripDestinations(trip, { dedupe: true });
  const destinationGuides: DestinationAdvisorGuide[] = destinations.map((destination) => ({
    destination: destination.destination,
    guide: tripAdvisorGuideForDestination(destination.destination),
  }));
  const forecastsReady = weatherRows?.filter((row) => row.forecast).length ?? 0;
  const weatherCount = weatherRows?.length ?? destinations.length;
  const briefingGroups = buildBriefingGroups(destinationGuides);
  const prepTasks = buildTripPrepTasks(trip);

  const readinessItems: ReadinessItem[] = [
    {
      label: 'Packing list',
      detail: totalItems > 0 ? `${packedItems}/${totalItems} packed` : 'Generate a list',
      done: totalItems > 0 && packingProgress >= 0.7,
    },
    {
      label: 'Activities',
      detail: selectedActivities > 0 ? `${selectedActivities} selected` : `${suggestedActivities} ideas found`,
      done: selectedActivities > 0,
    },
    {
      label: 'Weather',
      detail: weatherCount > 0 ? `${forecastsReady}/${weatherCount} forecasts ready` : 'No coordinates',
      done: weatherCount > 0 && forecastsReady === weatherCount,
    },
    {
      label: 'Trip context',
      detail: trip.activity_interests.length > 0 ? `${trip.activity_interests.length} interests set` : 'General suggestions',
      done: trip.activity_interests.length > 0,
    },
  ];
  const readinessScore = Math.round(
    readinessItems.filter((item) => item.done).length / readinessItems.length * 100,
  );
  const handleShareBriefing = () => {
    Share.share({
      title: 'DestinationPacker trip briefing',
      message: buildTripAdvisorShareText(destinationGuides),
    }).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.eyebrow}>Trip readiness</Text>
          <Text style={styles.score}>{readinessScore}%</Text>
        </View>
        <View style={styles.scoreRing}>
          <Text style={styles.scoreRingText}>{readinessItems.filter((item) => item.done).length}/{readinessItems.length}</Text>
        </View>
      </View>

      <View style={styles.checklist}>
        {readinessItems.map((item) => (
          <View key={item.label} style={styles.checkRow}>
            <View style={[styles.checkIcon, item.done && styles.checkIconDone]}>
              <Text style={[styles.checkIconText, item.done && styles.checkIconTextDone]}>
                {item.done ? '✓' : '•'}
              </Text>
            </View>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkLabel}>{item.label}</Text>
              <Text style={styles.checkDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionGrid}>
        <ActionCard
          title="Packing"
          value={totalItems > 0 ? `${Math.round(packingProgress * 100)}%` : 'Not started'}
          detail={totalItems > 0 ? `${totalItems - packedItems} left` : 'Build the smart list'}
          action={totalItems > 0 ? 'Regenerate' : 'Generate'}
          loading={isGeneratingPacking}
          onPress={() => generatePacking()}
        />
        <ActionCard
          title="Activities"
          value={selectedActivities > 0 ? `${selectedActivities} picked` : `${suggestedActivities} ideas`}
          detail={selectedActivities > 0 ? 'Packing adapts' : 'Find trip-specific ideas'}
          action="Refresh"
          loading={isFetchingActivities}
          onPress={() => fetchActivities()}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Destination Briefing</Text>
            <Text style={styles.sectionSubtitle}>Food, local buys, booking, customs, and safety in one place.</Text>
          </View>
          <Button compact mode="outlined" onPress={handleShareBriefing} style={styles.shareButton} textColor={Colors.primaryDark}>
            Share Briefing
          </Button>
        </View>

        {briefingGroups.map((group) => (
          <View key={group.title} style={styles.briefingGroup}>
            <Text style={styles.briefingGroupTitle}>{group.icon} {group.title}</Text>
            {group.items.slice(0, 3).map(({ label, item, destination }) => (
              <View key={`${group.title}:${destination}:${label}:${item.title}`} style={styles.briefingRow}>
                <View style={styles.briefingRowHeader}>
                  <Text style={styles.briefingLabel}>{label}</Text>
                  {destinationGuides.length > 1 && (
                    <Text style={styles.briefingDestination} numberOfLines={1}>{destination}</Text>
                  )}
                </View>
                <Text style={styles.briefingTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.briefingText} numberOfLines={2}>{item.description}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Actions</Text>
        {prepTasks.slice(0, 3).map((task) => (
          <View key={`${task.timing}:${task.title}`} style={styles.taskCard}>
            <View style={styles.taskTop}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskTiming}>{task.timing}</Text>
            </View>
            <Text style={styles.sparkDescription}>{task.detail}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function firstItems(
  destinationGuides: DestinationAdvisorGuide[],
  label: string,
  key: keyof DestinationAdvisorGuide['guide'],
) {
  return destinationGuides.flatMap(({ destination, guide }) => (
    guide[key].slice(0, 1).map((item) => ({ label, item, destination }))
  ));
}

function buildBriefingGroups(destinationGuides: DestinationAdvisorGuide[]): BriefingGroup[] {
  return [
    {
      title: 'Eat & Bring Home',
      icon: '🍽️',
      items: [
        ...firstItems(destinationGuides, 'Eat', 'foods'),
        ...firstItems(destinationGuides, 'Buy', 'souvenirs'),
      ],
    },
    {
      title: 'Book & Timing',
      icon: '📅',
      items: [
        ...firstItems(destinationGuides, 'Book', 'booking'),
        ...firstItems(destinationGuides, 'Plan', 'practical'),
      ],
    },
    {
      title: 'Travel Notes',
      icon: '🧭',
      items: [
        ...firstItems(destinationGuides, 'Customs', 'customs'),
        ...firstItems(destinationGuides, 'Buying', 'buying'),
        ...firstItems(destinationGuides, 'Comfort', 'safety'),
      ],
    },
  ].filter((group) => group.items.length > 0);
}

function ActionCard({
  title,
  value,
  detail,
  action,
  loading,
  onPress,
}: {
  title: string;
  value: string;
  detail: string;
  action: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionValue}>{value}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
      <Button compact mode="contained-tonal" loading={loading} onPress={onPress} style={styles.actionButton}>
        {action}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 96 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: { ...Typography.label, color: Colors.muted, textTransform: 'uppercase' },
  score: { fontSize: 42, fontWeight: '800', color: Colors.onSurface, marginTop: 2 },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingText: { ...Typography.label, color: Colors.primaryDark, fontWeight: '800' },
  checklist: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  checkIconDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkIconText: { color: Colors.muted, fontWeight: '800' },
  checkIconTextDone: { color: '#FFFFFF' },
  checkTextWrap: { flex: 1 },
  checkLabel: { ...Typography.body, color: Colors.onSurface, fontWeight: '700' },
  checkDetail: { ...Typography.caption, color: Colors.muted, marginTop: 2 },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  actionTitle: { ...Typography.label, color: Colors.muted },
  actionValue: { ...Typography.h3, color: Colors.onSurface, marginTop: 4 },
  actionDetail: { ...Typography.caption, color: Colors.muted, marginTop: 2, minHeight: 32 },
  actionButton: { marginTop: Spacing.sm, borderRadius: Radius.sm },
  section: { marginTop: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.sm },
  sectionSubtitle: { ...Typography.caption, color: Colors.muted, maxWidth: 230 },
  shareButton: { borderRadius: 8, borderColor: Colors.border },
  briefingGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  briefingGroupTitle: {
    ...Typography.label,
    color: Colors.onSurface,
    fontWeight: '800',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(10,147,150,0.05)',
  },
  briefingRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  briefingRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  briefingDestination: { ...Typography.caption, color: Colors.primary, flexShrink: 1 },
  briefingTitle: { ...Typography.body, color: Colors.onSurface, fontWeight: '700' },
  briefingText: { ...Typography.caption, color: Colors.muted, lineHeight: 18, marginTop: 2 },
  taskCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  taskTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  taskTitle: { ...Typography.body, color: Colors.onSurface, fontWeight: '700', flex: 1 },
  taskTiming: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '800',
    backgroundColor: '#edf7f7',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  sparkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sparkTop: { marginBottom: 4 },
  sparkName: { ...Typography.body, color: Colors.onSurface, fontWeight: '700' },
  sparkDestination: { ...Typography.caption, color: Colors.primary, marginTop: 2 },
  sparkDescription: { ...Typography.caption, color: Colors.muted },
  briefingCard: {
    backgroundColor: '#edf7f7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  briefingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  briefingLabel: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '800', textTransform: 'uppercase' },
  tipCard: {
    backgroundColor: '#edf7f7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  tipText: { ...Typography.body, color: Colors.primaryDark },
});
