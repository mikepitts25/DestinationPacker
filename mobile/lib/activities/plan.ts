import type { Activity, ActivityType } from '@/types';

export type ActivityPlanTimeLabel = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible';

export type ActivityPlanningGroupTitle =
  | 'Start With These'
  | 'Local Food & Drink'
  | 'Worth Booking'
  | 'Bring Home'
  | 'Easy Fillers'
  | 'Outdoor / Weather Dependent';

export type ActivityPlanBlock = {
  activityId: string;
  timeLabel: ActivityPlanTimeLabel;
  title: string;
  destination: string;
  reason: string;
  practicalNote: string;
  groupLabel: ActivityPlanningGroupTitle;
  selected: boolean;
};

export type ActivityPlanningGroup = {
  title: ActivityPlanningGroupTitle;
  subtitle: string;
  data: Activity[];
};

const GROUP_ORDER: ActivityPlanningGroupTitle[] = [
  'Start With These',
  'Local Food & Drink',
  'Worth Booking',
  'Bring Home',
  'Outdoor / Weather Dependent',
  'Easy Fillers',
];

const MAX_GROUP_ITEMS = 5;

const GROUP_SUBTITLES: Record<ActivityPlanningGroupTitle, string> = {
  'Start With These': 'Already selected or strongest fit for the trip.',
  'Local Food & Drink': 'Meals, tastings, markets, and hands-on food stops.',
  'Worth Booking': 'Classes, workshops, venues, and structured experiences.',
  'Bring Home': 'Local buys that can affect packing and customs planning.',
  'Outdoor / Weather Dependent': 'Good options once the forecast and energy level are clear.',
  'Easy Fillers': 'Lower-friction ideas for open time between anchors.',
};

const TIME_BY_GROUP: Partial<Record<ActivityPlanningGroupTitle, ActivityPlanTimeLabel>> = {
  'Start With These': 'Morning',
  'Local Food & Drink': 'Afternoon',
  'Worth Booking': 'Afternoon',
  'Bring Home': 'Flexible',
  'Outdoor / Weather Dependent': 'Morning',
  'Easy Fillers': 'Flexible',
};

const EVENING_TYPES = new Set<ActivityType>(['nightlife', 'dining']);
const OUTDOOR_TYPES = new Set<ActivityType>(['outdoor', 'water', 'beach', 'snow', 'sports', 'adventure']);

export function activityPlanningInsight(activity: Activity): string {
  if (activity.selected) {
    return 'This is already in your trip, so the plan keeps it visible and tied to packing.';
  }

  if (activity.source === 'local_guide' || activity.source === 'ai_curated') {
    return 'Local-guide context makes this feel more specific than a broad search result.';
  }

  if (activity.rating !== null && activity.rating >= 4.5) {
    const reviews = activity.review_count !== null && activity.review_count > 0
      ? ` from ${formatCompactNumber(activity.review_count)} reviews`
      : '';
    return `Strong signal at ${activity.rating.toFixed(1)} stars${reviews}, so it is worth anchoring part of the day.`;
  }

  if (activity.activity_type === 'souvenirs' || normalizedName(activity.activity_name).startsWith('buy:')) {
    return 'Bring-home pick that can change what you leave space for in the bag.';
  }

  if (activity.distance_from_center_km !== null && activity.distance_from_center_km <= 2) {
    return `${activity.distance_from_center_km.toFixed(1)} km from the center, so it can slot into the day without heavy transit.`;
  }

  if (OUTDOOR_TYPES.has(activity.activity_type)) {
    return 'Weather and energy matter here, so keep it as a flexible outdoor option.';
  }

  return activity.description ?? 'Use this as a flexible stop when the day needs another destination-specific idea.';
}

export function activityPlanningGroupFor(activity: Activity): ActivityPlanningGroupTitle {
  const name = normalizedName(activity.activity_name);

  if (activity.selected) return 'Start With These';
  if (activity.activity_type === 'souvenirs' || name.startsWith('buy:')) return 'Bring Home';
  if (
    name.startsWith('experience:')
    || name.includes('workshop')
    || name.includes('class')
    || name.includes('reservation')
    || name.includes('tour')
    || activity.activity_type === 'wellness'
    || activity.activity_type === 'nightlife'
  ) {
    return 'Worth Booking';
  }
  if (activity.activity_type === 'dining' || name.startsWith('try:') || name.includes('tasting')) {
    return 'Local Food & Drink';
  }
  if (OUTDOOR_TYPES.has(activity.activity_type)) return 'Outdoor / Weather Dependent';

  return 'Easy Fillers';
}

export function groupActivitiesForPlanning(activities: Activity[]): ActivityPlanningGroup[] {
  const buckets = new Map<ActivityPlanningGroupTitle, Activity[]>();

  for (const activity of activities) {
    const group = activityPlanningGroupFor(activity);
    const bucket = buckets.get(group) ?? [];
    bucket.push(activity);
    buckets.set(group, bucket);
  }

  return GROUP_ORDER.flatMap((title) => {
    const data = buckets.get(title);
    if (!data || data.length === 0) return [];

    return [{
      title,
      subtitle: GROUP_SUBTITLES[title],
      data: [...data].sort(compareActivitiesForPlanning).slice(0, MAX_GROUP_ITEMS),
    }];
  });
}

export function buildActivityPlan(
  activities: Activity[],
  options: { maxBlocks?: number } = {},
): ActivityPlanBlock[] {
  const maxBlocks = options.maxBlocks ?? 4;
  const usedIds = new Set<string>();
  const groups = groupActivitiesForPlanning(activities);
  const selected: Activity[] = [];
  const anchors: Activity[] = [];

  for (const groupTitle of GROUP_ORDER) {
    const group = groups.find((candidate) => candidate.title === groupTitle);
    if (!group) continue;
    const candidate = group.data.find((item) => !usedIds.has(item.id));
    if (!candidate) continue;

    if (candidate.selected) {
      selected.push(candidate);
    } else {
      anchors.push(candidate);
    }
    usedIds.add(candidate.id);
  }

  const ordered = [
    ...selected.sort(compareActivitiesForPlanning),
    ...anchors.sort(compareActivitiesForPlanning),
  ].slice(0, maxBlocks);

  return ordered.map((activity, index) => {
    const groupLabel = activityPlanningGroupFor(activity);
    return {
      activityId: activity.id,
      timeLabel: timeLabelForActivity(activity, groupLabel, index),
      title: activity.activity_name,
      destination: activity.destination?.trim() || 'This trip',
      reason: activityPlanningInsight(activity),
      practicalNote: practicalNoteForActivity(activity, groupLabel),
      groupLabel,
      selected: activity.selected,
    };
  });
}

function compareActivitiesForPlanning(a: Activity, b: Activity) {
  const scoreDiff = planningScore(b) - planningScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  return a.activity_name.localeCompare(b.activity_name);
}

function planningScore(activity: Activity) {
  let score = 0;
  if (activity.selected) score += 100;
  if (activity.source === 'local_guide') score += 30;
  if (activity.source === 'ai_curated') score += 25;
  if (activity.photo_url) score += 10;
  if (activity.rating !== null) score += activity.rating * 4;
  if (activity.review_count !== null) score += Math.min(activity.review_count / 1000, 12);
  if (activity.distance_from_center_km !== null && activity.distance_from_center_km <= 2) score += 8;
  if (normalizedName(activity.activity_name).startsWith('experience:')) score += 8;
  if (normalizedName(activity.activity_name).startsWith('try:')) score += 8;
  if (normalizedName(activity.activity_name).startsWith('buy:')) score += 8;
  return score;
}

function timeLabelForActivity(
  activity: Activity,
  group: ActivityPlanningGroupTitle,
  index: number,
): ActivityPlanTimeLabel {
  if (index === 0) return 'Morning';
  if (EVENING_TYPES.has(activity.activity_type) && index >= 2) return 'Evening';
  return TIME_BY_GROUP[group] ?? (index === 1 ? 'Afternoon' : 'Flexible');
}

function practicalNoteForActivity(activity: Activity, group: ActivityPlanningGroupTitle) {
  if (activity.selected) return 'Added to trip; packing is already tuned for it.';
  if (group === 'Worth Booking') return 'Check times, reservation rules, and cancellation windows before the trip.';
  if (group === 'Bring Home') return 'Leave bag space and check food, liquid, plant, or customs limits before buying.';
  if (group === 'Outdoor / Weather Dependent') return 'Keep it flexible until the forecast and conditions are clear.';
  if (group === 'Local Food & Drink') return 'Use this as a meal anchor instead of treating food as an afterthought.';
  if (activity.distance_from_center_km !== null && activity.distance_from_center_km <= 2) {
    return 'Pair it with another central stop to reduce transit time.';
  }
  return 'Use it to fill open time without derailing the main plan.';
}

function normalizedName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function formatCompactNumber(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}
