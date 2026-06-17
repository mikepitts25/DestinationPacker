import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useActivities, useFetchActivities, useToggleActivity } from '@/hooks/useActivities';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  activityPlanningInsight,
  groupActivitiesForPlanning,
  type ActivityPlanningGroup,
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

const GROUP_META: Record<ActivityPlanningGroup['title'], { accent: string; light: string; emoji: string }> = {
  'Start With These': { accent: Colors.goldDark, light: '#fff8e1', emoji: '⭐' },
  'Local Food & Drink': { accent: '#0a9396', light: '#edf7f7', emoji: '🍽️' },
  'Worth Booking': { accent: '#8a5a00', light: '#fff4d6', emoji: '📅' },
  'Bring Home': { accent: '#7c3aed', light: '#f3ecff', emoji: '🎁' },
  'Easy Fillers': { accent: '#2f6f73', light: '#eef7f6', emoji: '🧭' },
  'Outdoor / Weather Dependent': { accent: '#4f772d', light: '#f0f8e8', emoji: '🥾' },
};

export default function ActivitiesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: activities, isLoading } = useActivities(tripId);
  const { mutate: fetchActivities, isPending: isFetching } = useFetchActivities(tripId);
  const { mutate: toggleActivity, isPending: isToggling } = useToggleActivity(tripId);
  const [selectedGroupTitle, setSelectedGroupTitle] = useState<ActivityPlanningGroup['title'] | null>(null);

  useEffect(() => {
    if (tripId && (!activities || activities.length === 0)) {
      fetchActivities();
    }
  }, [activities, fetchActivities, tripId]);

  const activityList = activities ?? [];
  const groups = groupActivitiesForPlanning(activityList);
  const selectedCount = activityList.filter((activity) => activity.selected).length;
  const activeTitle = groups.some((group) => group.title === selectedGroupTitle)
    ? selectedGroupTitle
    : groups[0]?.title ?? null;
  const activeGroup = groups.find((group) => group.title === activeTitle) ?? null;
  const gridRows: ActivityPlanningGroup[][] = [];

  for (let i = 0; i < groups.length; i += 2) {
    gridRows.push(groups.slice(i, i + 2));
  }

  if (isLoading || isFetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding top trip ideas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryTitle}>Activities</Text>
            <Text style={styles.summaryText}>
              Top five per category. Add picks to tune packing.
            </Text>
          </View>
          <View style={styles.selectedPill}>
            <Text style={styles.selectedPillText}>{selectedCount} added</Text>
          </View>
        </View>
        <Button
          compact
          mode="outlined"
          onPress={() => fetchActivities()}
          loading={isFetching}
          disabled={isFetching}
          style={styles.refreshButton}
          textColor={Colors.primaryDark}
        >
          Refresh Ideas
        </Button>
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No trip ideas yet</Text>
          <Text style={styles.emptyText}>
            Refresh to search for top sights, classes, tastings, local buys, named restaurants, and bars.
          </Text>
          <Button mode="contained-tonal" onPress={() => fetchActivities()}>Refresh Ideas</Button>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {gridRows.map((row) => (
              <View key={row.map((group) => group.title).join('-')} style={styles.gridRow}>
                {row.map((group) => {
                  const isActive = group.title === activeTitle;
                  const addedCount = group.data.filter((activity) => activity.selected).length;
                  const groupMeta = GROUP_META[group.title];

                  return (
                    <TouchableOpacity
                      key={group.title}
                      style={[styles.tile, isActive && { borderColor: groupMeta.accent, backgroundColor: groupMeta.light }]}
                      onPress={() => setSelectedGroupTitle(group.title)}
                      activeOpacity={0.78}
                    >
                      <ActivityGroupIcon meta={groupMeta} active={isActive} />
                      <Text
                        style={[styles.tileTitle, isActive && { color: groupMeta.accent }]}
                        numberOfLines={2}
                      >
                        {group.title}
                      </Text>
                      <Text style={[styles.tileCount, isActive && { color: groupMeta.accent }]}>
                        Top {group.data.length}
                      </Text>
                      {addedCount > 0 && (
                        <View style={[styles.tileBadge, { backgroundColor: groupMeta.accent }]}>
                          <Text style={styles.tileBadgeText}>{addedCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {row.length === 1 && <View style={styles.tileSpacer} />}
              </View>
            ))}
          </View>

          {activeGroup && (
            <View style={styles.expandedCard}>
              <View style={styles.expandedHeader}>
                <View style={styles.expandedTitleRow}>
                  <ActivityGroupIcon meta={GROUP_META[activeGroup.title]} active compact />
                  <View style={styles.expandedTitleBlock}>
                    <Text style={styles.expandedTitle}>{activeGroup.title}</Text>
                    <Text style={styles.expandedSubtitle}>{activeGroup.subtitle}</Text>
                  </View>
                </View>
                <View style={[styles.expandedCountPill, { backgroundColor: GROUP_META[activeGroup.title].light }]}>
                  <Text style={[styles.expandedCount, { color: GROUP_META[activeGroup.title].accent }]}>
                    {activeGroup.data.length}/5
                  </Text>
                </View>
              </View>

              {activeGroup.data.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  disabled={isToggling}
                  onToggle={(selected) => toggleActivity({ activityId: activity.id, selected })}
                />
              ))}
            </View>
          )}

          <View style={{ height: 92 }} />
        </ScrollView>
      )}
    </View>
  );
}

function ActivityGroupIcon({
  meta,
  active,
  compact = false,
}: {
  meta: { accent: string; light: string; emoji: string };
  active: boolean;
  compact?: boolean;
}) {
  const plateStyle = [
    compact ? styles.groupIconCompact : styles.groupIcon,
    { backgroundColor: active ? meta.accent : meta.light },
  ];

  return (
    <View style={plateStyle}>
      <Text style={[compact ? styles.groupEmojiCompact : styles.groupEmoji, active && styles.groupEmojiActive]}>
        {meta.emoji}
      </Text>
    </View>
  );
}

function ActivityRow({
  activity,
  disabled,
  onToggle,
}: {
  activity: Activity;
  disabled: boolean;
  onToggle: (selected: boolean) => void;
}) {
  const emoji = ACTIVITY_EMOJI[activity.activity_type] ?? '📍';
  const ratingText = formatActivityRating(activity);
  const sourceText = sourceLabel(activity.source);
  const insight = activityPlanningInsight(activity);

  return (
    <TouchableOpacity
      style={[styles.activityRow, activity.selected && styles.activityRowSelected]}
      onPress={() => !disabled && onToggle(!activity.selected)}
      disabled={disabled}
      activeOpacity={0.76}
    >
      <View style={styles.activityIcon}>
        <Text style={styles.activityIconText}>{emoji}</Text>
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityName} numberOfLines={2}>{activity.activity_name}</Text>
          <Text style={[styles.addLabel, activity.selected && styles.addLabelSelected]}>
            {activity.selected ? 'Added' : 'Add'}
          </Text>
        </View>
        <Text style={styles.activityMeta} numberOfLines={1}>
          {[ratingText, distanceText(activity), sourceText].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.activityInsight} numberOfLines={2}>{insight}</Text>
      </View>
    </TouchableOpacity>
  );
}

function distanceText(activity: Activity) {
  return activity.distance_from_center_km !== null
    ? `${activity.distance_from_center_km.toFixed(1)} km`
    : null;
}

function sourceLabel(source: string) {
  switch (source) {
    case 'ai_curated':
      return 'Curated';
    case 'google_places':
      return 'Google';
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
  summaryCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  summaryTextBlock: { flex: 1 },
  summaryTitle: { ...Typography.h3, color: Colors.onSurface },
  summaryText: { ...Typography.caption, color: Colors.muted, marginTop: 2 },
  selectedPill: {
    borderRadius: Radius.full,
    backgroundColor: '#edf7f7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  selectedPillText: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '800' },
  refreshButton: { alignSelf: 'flex-start', borderRadius: 8, borderColor: Colors.border },
  scrollContent: { paddingBottom: Spacing.xl },
  grid: { paddingHorizontal: Spacing.md, gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileTitle: {
    ...Typography.label,
    color: Colors.onSurface,
    fontWeight: '800',
    minHeight: 34,
    textAlign: 'center',
    lineHeight: 17,
  },
  tileCount: { ...Typography.caption, color: Colors.muted, fontWeight: '800', textAlign: 'center' },
  tileBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },
  tileSpacer: { flex: 1 },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEmoji: {
    fontSize: 27,
    lineHeight: 34,
    textAlign: 'center',
  },
  groupEmojiActive: {
    transform: [{ scale: 1.03 }],
  },
  groupIconCompact: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEmojiCompact: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  expandedCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: 'rgba(10,147,150,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expandedTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minWidth: 0 },
  expandedTitleBlock: { flex: 1, minWidth: 0 },
  expandedTitle: { ...Typography.h3, color: Colors.onSurface },
  expandedSubtitle: { ...Typography.caption, color: Colors.muted, marginTop: 2, maxWidth: 260 },
  expandedCountPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  expandedCount: { ...Typography.caption, fontWeight: '800' },
  activityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityRowSelected: { backgroundColor: '#f0faf2' },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: { fontSize: 18 },
  activityContent: { flex: 1, gap: 3 },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  activityName: { ...Typography.body, color: Colors.onSurface, fontWeight: '800', flex: 1 },
  addLabel: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  addLabelSelected: {
    color: Colors.secondary,
    backgroundColor: '#e6f4ea',
    borderColor: '#b9dfc4',
  },
  activityMeta: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '700' },
  activityInsight: { ...Typography.caption, color: Colors.muted, lineHeight: 17 },
  empty: { alignItems: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 42, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.xs },
  emptyText: { ...Typography.body, color: Colors.muted, marginBottom: Spacing.md, textAlign: 'center', lineHeight: 22 },
});
