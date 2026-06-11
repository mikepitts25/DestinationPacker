import { useEffect } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useActivities, useFetchActivities, useToggleActivity } from '@/hooks/useActivities';
import { Colors, Spacing, Typography } from '@/constants/theme';
import {
  activityPlanningInsight,
  buildActivityPlan,
  groupActivitiesForPlanning,
  type ActivityPlanBlock,
} from '@/lib/activities/plan';
import { formatActivityRating } from '@/lib/activities/rating';
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
  souvenirs: '🎁',
  family: '🎢',
  adventure: '🧗',
};

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  outdoor: 'Outdoors',
  water: 'Water',
  cultural: 'Sights & history',
  nightlife: 'Evening',
  dining: 'Food & drink',
  sports: 'Sports',
  beach: 'Beach',
  snow: 'Snow',
  business: 'Business',
  wellness: 'Wellness',
  shopping: 'Markets & shops',
  souvenirs: 'Local buys',
  family: 'Family',
  adventure: 'Adventure',
};

export default function ActivitiesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: activities, isLoading } = useActivities(tripId);
  const { mutate: fetchActivities, isPending: isFetching } = useFetchActivities(tripId);
  const { mutate: toggleActivity, isPending: isToggling } = useToggleActivity(tripId);

  useEffect(() => {
    if (tripId && (!activities || activities.length === 0)) {
      fetchActivities();
    }
  }, [activities, fetchActivities, tripId]);

  const activityList = activities ?? [];
  const selectedCount = activityList.filter((a) => a.selected).length;
  const planBlocks = buildActivityPlan(activityList);
  const sections = groupActivitiesForPlanning(activityList);

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

      <SectionList
        sections={sections}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ActivitiesHeader
            planBlocks={planBlocks}
            disabled={isToggling}
            isFetching={isFetching}
            onRefresh={() => fetchActivities()}
            onTogglePlanItem={(block) => {
              toggleActivity({ activityId: block.activityId, selected: !block.selected });
            }}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.subtitle && (
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              )}
            </View>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
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
            <Text style={styles.emptyTitle}>No trip ideas yet</Text>
            <Text style={styles.emptyText}>
              Refresh to search again for sights, classes, tastings, local buys, and experience ideas for this destination.
            </Text>
            <Button mode="contained-tonal" onPress={() => fetchActivities()}>Refresh Ideas</Button>
          </View>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </View>
  );
}

function ActivitiesHeader({
  planBlocks,
  disabled,
  isFetching,
  onRefresh,
  onTogglePlanItem,
}: {
  planBlocks: ActivityPlanBlock[];
  disabled: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onTogglePlanItem: (block: ActivityPlanBlock) => void;
}) {
  return (
    <View style={styles.headerStack}>
      <View style={styles.listHeader}>
        <Text style={styles.hint}>
          Choose the plan items that match this trip; packing updates from the activities you add.
        </Text>
        <Button
          compact
          mode="outlined"
          onPress={onRefresh}
          loading={isFetching}
          disabled={isFetching}
          style={styles.refreshButton}
          textColor={Colors.primaryDark}
        >
          Refresh Ideas
        </Button>
      </View>

      {planBlocks.length > 0 && (
        <View style={styles.planSection}>
          <View style={styles.planHeadingRow}>
            <View>
              <Text style={styles.planEyebrow}>Suggested Plan</Text>
              <Text style={styles.planTitle}>Start with a real route</Text>
            </View>
            <Text style={styles.planCount}>{planBlocks.length} picks</Text>
          </View>

          {planBlocks.map((block) => (
            <TouchableOpacity
              key={block.activityId}
              style={[styles.planItem, block.selected && styles.planItemSelected]}
              onPress={() => !disabled && onTogglePlanItem(block)}
              disabled={disabled}
            >
              <View style={styles.planTimeColumn}>
                <Text style={styles.planTime}>{block.timeLabel}</Text>
                <View style={[styles.planDot, block.selected && styles.planDotSelected]} />
              </View>
              <View style={styles.planItemContent}>
                <View style={styles.planItemHeader}>
                  <Text style={styles.planItemTitle} numberOfLines={2}>{block.title}</Text>
                  <Text style={[styles.planStatus, block.selected && styles.planStatusSelected]}>
                    {block.selected ? 'Added' : 'Add'}
                  </Text>
                </View>
                <Text style={styles.planDestination}>{block.destination}</Text>
                <Text style={styles.planReason} numberOfLines={3}>{block.reason}</Text>
                <Text style={styles.planNote} numberOfLines={2}>{block.practicalNote}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {planBlocks.length > 0 && (
        <View style={styles.buildTripIntro}>
          <Text style={styles.buildTripTitle}>Build Your Trip</Text>
          <Text style={styles.buildTripText}>
            Add or remove anything below to tune the plan and the packing list.
          </Text>
        </View>
      )}
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
  const ratingText = formatActivityRating(activity);
  const sourceText = sourceLabel(activity.source);
  const insight = activityPlanningInsight(activity);

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
          <Text style={styles.activityName} numberOfLines={2}>
            {activity.activity_name}
          </Text>
          <Text style={[styles.addedLabel, activity.selected && styles.addedLabelSelected]}>
            {activity.selected ? 'Added to trip' : 'Add'}
          </Text>
        </View>
        <Text style={styles.insightText} numberOfLines={3}>
          {insight}
        </Text>
        <View style={styles.metaRow}>
          <Chip compact style={styles.typeChip} textStyle={styles.typeChipText}>
            {emoji} {ACTIVITY_TYPE_LABEL[activity.activity_type]}
          </Chip>
          <Chip compact style={styles.sourceChip} textStyle={styles.sourceChipText}>
            {sourceText}
          </Chip>
        </View>
        {ratingText && (
          <Text style={styles.ratingText}>{ratingText}</Text>
        )}
        {activity.distance_from_center_km !== null && (
          <Text style={styles.distanceText}>{activity.distance_from_center_km.toFixed(1)} km from center</Text>
        )}
        {activity.description && activity.description !== insight && (
          <Text style={styles.description} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function sourceLabel(source: string) {
  switch (source) {
    case 'ai_curated':
      return 'Curated';
    case 'openstreetmap':
      return 'Place';
    case 'local_guide':
      return 'Guide';
    case 'user_added':
      return 'Custom';
    default:
      return 'Guide';
  }
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
  headerStack: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hint: { ...Typography.caption, color: Colors.muted, flex: 1 },
  refreshButton: { borderRadius: 8, borderColor: Colors.border },
  planSection: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  planHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  planEyebrow: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planTitle: { ...Typography.h3, color: Colors.onSurface },
  planCount: { ...Typography.caption, color: Colors.muted, fontWeight: '700' },
  planItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  planItemSelected: {
    backgroundColor: '#f0faf2',
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    paddingBottom: Spacing.sm,
  },
  planTimeColumn: { width: 74, alignItems: 'flex-start', gap: Spacing.xs },
  planTime: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '700' },
  planDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  planDotSelected: { backgroundColor: Colors.secondary },
  planItemContent: { flex: 1, gap: 3 },
  planItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  planItemTitle: { ...Typography.body, color: Colors.onSurface, fontWeight: '700', flex: 1 },
  planStatus: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  planStatusSelected: {
    color: Colors.secondary,
    backgroundColor: '#e6f4ea',
    borderColor: '#b9dfc4',
  },
  planDestination: { ...Typography.caption, color: Colors.muted, fontWeight: '700' },
  planReason: { ...Typography.caption, color: Colors.onSurface, lineHeight: 18 },
  planNote: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18, fontWeight: '600' },
  buildTripIntro: { gap: 2 },
  buildTripTitle: { ...Typography.h3, color: Colors.onSurface },
  buildTripText: { ...Typography.caption, color: Colors.muted },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: { ...Typography.h3, color: Colors.onSurface },
  sectionSubtitle: { ...Typography.caption, color: Colors.muted, marginTop: 2 },
  sectionCount: { ...Typography.caption, color: Colors.muted, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
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
    width: 88,
    height: 112,
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
  addedLabel: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  addedLabelSelected: {
    color: Colors.secondary,
    backgroundColor: '#e6f4ea',
    borderColor: '#b9dfc4',
  },
  insightText: { ...Typography.caption, color: Colors.onSurface, lineHeight: 18, marginBottom: Spacing.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  typeChip: { backgroundColor: Colors.background, alignSelf: 'flex-start' },
  typeChipText: { fontSize: 10, color: Colors.muted, lineHeight: 14 },
  sourceChip: { backgroundColor: '#edf7f7', alignSelf: 'flex-start' },
  sourceChipText: { fontSize: 10, color: Colors.primaryDark, lineHeight: 14 },
  ratingText: { ...Typography.caption, color: Colors.primary, marginBottom: 4, fontWeight: '600' },
  distanceText: { ...Typography.caption, color: Colors.muted, marginBottom: 4, fontWeight: '600' },
  description: { ...Typography.caption, color: Colors.muted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.muted, marginBottom: Spacing.md, textAlign: 'center', lineHeight: 22 },
});
