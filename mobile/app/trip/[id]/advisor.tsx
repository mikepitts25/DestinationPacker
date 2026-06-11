import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTrip } from '@/hooks/useTrips';
import { tripDestinations } from '@/lib/trips/destinations';
import {
  buildTripAdvisorShareText,
  tripAdvisorGuideForDestination,
  type AdvisorItem,
} from '@/lib/advisor/tripAdvisor';

const SECTIONS: { key: keyof ReturnType<typeof tripAdvisorGuideForDestination>; title: string; icon: string }[] = [
  { key: 'foods', title: 'Foods To Try', icon: '🍽️' },
  { key: 'souvenirs', title: 'Souvenirs', icon: '🎁' },
  { key: 'customs', title: 'Customs', icon: '🤝' },
  { key: 'practical', title: 'Practical Notes', icon: '🧭' },
  { key: 'booking', title: 'Book Ahead', icon: '📅' },
  { key: 'buying', title: 'Before You Buy', icon: '🧾' },
  { key: 'safety', title: 'Safety & Comfort', icon: '🛡️' },
];

export default function AdvisorScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(tripId);

  if (isLoading || !trip) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const destinationGuides = tripDestinations(trip, { dedupe: true }).map((destination) => ({
    destination: destination.destination,
    guide: tripAdvisorGuideForDestination(destination.destination),
  }));

  const handleShareBriefing = () => {
    Share.share({
      title: 'DestinationPacker trip briefing',
      message: buildTripAdvisorShareText(destinationGuides),
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <Text style={styles.destination}>
          {destinationGuides.map((guide) => guide.destination).join(' -> ')}
        </Text>
        <Text style={styles.summaryText}>
          Foods, gifts, customs, booking reminders, buying cautions, and practical notes for this trip.
        </Text>
        <Button
          compact
          mode="outlined"
          onPress={handleShareBriefing}
          style={styles.shareButton}
          textColor={Colors.primaryDark}
        >
          Share Briefing
        </Button>
      </View>

      {destinationGuides.map(({ destination, guide }) => (
        <View key={destination} style={styles.destinationBlock}>
          {destinationGuides.length > 1 && (
            <Text style={styles.destinationBlockTitle}>{destination}</Text>
          )}
          {SECTIONS.map((section) => (
            <AdvisorSection
              key={`${destination}-${section.key}`}
              title={section.title}
              icon={section.icon}
              items={guide[section.key]}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function AdvisorSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: AdvisorItem[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{icon} {title}</Text>
      {items.map((item) => (
        <View key={`${title}-${item.title}`} style={styles.item}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  summary: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  destination: { ...Typography.h2, color: Colors.onSurface, marginBottom: 4 },
  summaryText: { ...Typography.body, color: Colors.muted },
  shareButton: { alignSelf: 'flex-start', marginTop: Spacing.md, borderRadius: 8, borderColor: Colors.border },
  destinationBlock: { marginBottom: Spacing.md },
  destinationBlockTitle: { ...Typography.h2, color: Colors.onSurface, marginBottom: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.sm },
  item: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemTitle: { ...Typography.body, color: Colors.onSurface, fontWeight: '700', marginBottom: 4 },
  itemDescription: { ...Typography.caption, color: Colors.muted, lineHeight: 18 },
});
