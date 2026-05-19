import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTrip } from '@/hooks/useTrips';
import {
  tripAdvisorGuideForDestination,
  type AdvisorItem,
} from '@/lib/advisor/tripAdvisor';

const SECTIONS: { key: keyof ReturnType<typeof tripAdvisorGuideForDestination>; title: string; icon: string }[] = [
  { key: 'foods', title: 'Foods To Try', icon: '🍽️' },
  { key: 'souvenirs', title: 'Souvenirs', icon: '🎁' },
  { key: 'customs', title: 'Customs', icon: '🤝' },
  { key: 'practical', title: 'Practical Notes', icon: '🧭' },
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

  const guide = tripAdvisorGuideForDestination(trip.destination);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <Text style={styles.destination}>{trip.destination}</Text>
        <Text style={styles.summaryText}>
          Local foods, gift ideas, customs, and practical notes for this trip.
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <AdvisorSection
          key={section.key}
          title={section.title}
          icon={section.icon}
          items={guide[section.key]}
        />
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
