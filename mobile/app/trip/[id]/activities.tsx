import { useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useActivities, useFetchActivities, useToggleActivity } from '@/hooks/useActivities';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { Activity, ActivityType } from '@/types';

const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  outdoor: '🥾',
  water: '🏊',
  cultural: '🏛️',
  nightlife: '🌃',
  dining: '🍽️',
  sports: '⚽',
  beach: '🏖️',
  snow: '⛷️',
  business: '💼',
  wellness: '🧘',
  shopping: '🛍️',
};

const FILTER_TYPES: { label: string; value: ActivityType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🥾 Outdoor', value: 'outdoor' },
  { label: '🏛️ Culture', value: 'cultural' },
  { label: '🍽️ Dining', value: 'dining' },
  { label: '🏖️ Beach', value: 'beach' },
  { label: '⛷️ Snow', value: 'snow' },
  { label: '🌃 Nightlife', value: 'nightlife' },
];

export default function ActivitiesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: activities, isLoading } = useActivities(tripId);
  const { mutate: fetchActivities, isPending: isFetching } = useFetchActivities(tripId);
  const { mutate: toggleActivity, isPending: isToggling } = useToggleActivity(tripId);
  const { isPremium } = useAuthStore();

  useEffect(() => {
    if (tripId && (!activities || activities.length === 0)) {
      fetchActivities();
    }
  }, [tripId]);

  const selectedCount = activities?.filter((a) => a.selected).length ?? 0;

  if (isLoading || isFetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding things to do...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedCount > 0 && (
        <View style={styles.selectionBanner}>
          <Text style={styles.selectionText}>
            ✅ {selectedCount} activit{selectedCount === 1 ? 'y' : 'ies'} selected — packing list updated
          </Text>
        </View>
      )}

      <FlatList
        data={activities ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.hint}>
              Select activities to automatically add required gear to your packing list.
            </Text>
            {!isPremium && (
              <TouchableOpacity
                style={styles.aiTeaser}
                onPress={() => router.push('/premium')}
              >
                <Text style={styles.aiTeaserText}>
                  ✨ Premium: Get AI-powered personalized activity recommendations
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onToggle={(selected) => toggleActivity({ activityId: item.id, selected })}
            disabled={isToggling}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyText}>No activities found for this destination.</Text>
            <Button onPress={() => fetchActivities()}>Try Again</Button>
          </View>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </View>
  );
}

function ActivityCard({
  activity, onToggle, disabled,
}: {
  activity: Activity;
  onToggle: (selected: boolean) => void;
  disabled: boolean;
}) {
  const emoji = ACTIVITY_EMOJI[activity.activity_type] ?? '📍';

  return (
    <TouchableOpacity
      style={[styles.card, activity.selected && styles.cardSelected]}
      onPress={() => !disabled && onToggle(!activity.selected)}
      disabled={disabled}
    >
      {activity.photo_url ? (
        <Image source={{ uri: activity.photo_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.cardImageEmoji}>{emoji}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.activityName} numberOfLines={1}>
            {activity.activity_name}
          </Text>
          <Text style={styles.checkmark}>{activity.selected ? '✅' : '⭕'}</Text>
        </View>
        <Chip compact style={styles.typeChip} textStyle={styles.typeChipText}>
          {emoji} {activity.activity_type}
        </Chip>
        {activity.description && (
          <Text style={styles.description} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...Typography.body, color: Colors.muted, marginTop: Spacing.md },
  selectionBanner: {
    backgroundColor: '#e6f4ea',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  selectionText: { ...Typography.label, color: Colors.secondary },
  list: { padding: Spacing.md },
  hint: { ...Typography.caption, color: Colors.muted, marginBottom: Spacing.sm },
  aiTeaser: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.premiumGold,
  },
  aiTeaserText: { ...Typography.caption, color: '#f57f17' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: Colors.secondary,
    backgroundColor: '#f0faf2',
  },
  cardImage: {
    width: 90,
    height: 90,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageEmoji: { fontSize: 32 },
  cardContent: { flex: 1, padding: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityName: { ...Typography.body, color: Colors.onSurface, fontWeight: '600', flex: 1 },
  checkmark: { fontSize: 18, marginLeft: 4 },
  typeChip: { height: 22, backgroundColor: Colors.background, marginBottom: 4, alignSelf: 'flex-start' },
  typeChipText: { fontSize: 10, color: Colors.muted },
  description: { ...Typography.caption, color: Colors.muted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.muted, marginBottom: Spacing.md },
});
