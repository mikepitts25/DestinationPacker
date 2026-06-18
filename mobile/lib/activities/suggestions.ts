import { activityTypesForInterests } from './interests';
import {
  localActivitySuggestionsForDestination,
  type ActivitySuggestion,
} from './localSuggestions';
import type { ActivityInterest, ActivityType } from '@/types';

const MAX_SUGGESTIONS_PER_DESTINATION = 18;

type SuggestionSeed = Omit<ActivitySuggestion, 'source' | 'external_id' | 'photo_url'>;

function baseFallbacksForDestination(destination: string): SuggestionSeed[] {
  void destination;
  return [];
}

function asSuggestedActivity(activity: SuggestionSeed): ActivitySuggestion {
  return {
    ...activity,
    source: 'suggested',
    external_id: null,
    photo_url: null,
  };
}

function normalizedName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function matchesSelectedTypes(activityType: ActivityType, selectedTypes: ActivityType[]) {
  return selectedTypes.length === 0 || selectedTypes.includes(activityType);
}

export function dedupeActivitySuggestions(activities: ActivitySuggestion[]): ActivitySuggestion[] {
  const seen = new Set<string>();

  return activities.filter((activity) => {
    const key = normalizedName(activity.activity_name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isUserFacingActivitySuggestion(activity: Pick<ActivitySuggestion, 'source'>): boolean {
  return activity.source !== 'suggested';
}

function seedSuggestionsForInterests(destination: string, interests: ActivityInterest[]) {
  const selectedTypes = activityTypesForInterests(interests);
  const local = localActivitySuggestionsForDestination(destination)
    .filter((activity) => matchesSelectedTypes(activity.activity_type, selectedTypes));

  return local;
}

export function fallbackActivitiesForDestination(
  destination: string,
  interests: ActivityInterest[] = [],
): ActivitySuggestion[] {
  const selectedTypes = activityTypesForInterests(interests);
  const base = baseFallbacksForDestination(destination)
    .filter((activity) => matchesSelectedTypes(activity.activity_type, selectedTypes))
    .map(asSuggestedActivity);
  const seeds = seedSuggestionsForInterests(destination, interests);
  const activities = dedupeActivitySuggestions([
    ...seeds,
    ...base,
  ]);

  return activities.length > 0 ? activities : base;
}

export function diversifyActivitySuggestions(
  activities: ActivitySuggestion[],
  interests: ActivityInterest[] = [],
  maxSuggestions = MAX_SUGGESTIONS_PER_DESTINATION,
): ActivitySuggestion[] {
  const deduped = dedupeActivitySuggestions(activities);
  const selectedTypes = activityTypesForInterests(interests);
  const preferredTypes = selectedTypes.length > 0
    ? selectedTypes
    : Array.from(new Set(deduped.map((activity) => activity.activity_type)));
  const buckets = new Map<ActivityType, ActivitySuggestion[]>();

  for (const activity of deduped) {
    const bucket = buckets.get(activity.activity_type) ?? [];
    bucket.push(activity);
    buckets.set(activity.activity_type, bucket);
  }

  const typeOrder = [
    ...preferredTypes,
    ...Array.from(buckets.keys()).filter((type) => !preferredTypes.includes(type)),
  ];
  const result: ActivitySuggestion[] = [];
  let added = true;

  while (added && result.length < maxSuggestions) {
    added = false;
    for (const type of typeOrder) {
      const bucket = buckets.get(type);
      const next = bucket?.shift();
      if (!next) continue;
      result.push(next);
      added = true;
      if (result.length >= maxSuggestions) break;
    }
  }

  return result;
}

export function completeActivitySuggestions(
  providerActivities: ActivitySuggestion[],
  destination: string,
  interests: ActivityInterest[] = [],
): ActivitySuggestion[] {
  const selectedTypes = activityTypesForInterests(interests);
  const provider = providerActivities.filter((activity) => (
    isUserFacingActivitySuggestion(activity)
    && matchesSelectedTypes(activity.activity_type, selectedTypes)
  ));
  const seeds = seedSuggestionsForInterests(destination, interests);
  const completed = dedupeActivitySuggestions([...provider, ...seeds]);

  return diversifyActivitySuggestions(
    completed.length > 0 ? completed : fallbackActivitiesForDestination(destination, interests),
    interests,
  );
}
