import { isUserFacingActivitySuggestion } from './suggestions';
import type { Activity, ActivityType } from '@/types';

export type SuggestedItineraryItem = {
  timeLabel: 'Morning' | 'Midday' | 'Afternoon' | 'Evening';
  activity: Activity;
};

export type SuggestedItineraryDay = {
  day: number;
  items: SuggestedItineraryItem[];
};

const SLOT_ORDER: { timeLabel: SuggestedItineraryItem['timeLabel']; types: ActivityType[] }[] = [
  { timeLabel: 'Morning', types: ['cultural', 'family', 'wellness'] },
  { timeLabel: 'Midday', types: ['shopping', 'souvenirs', 'dining'] },
  { timeLabel: 'Afternoon', types: ['outdoor', 'beach', 'water', 'sports', 'adventure', 'snow'] },
  { timeLabel: 'Evening', types: ['nightlife', 'dining', 'cultural'] },
];

export function buildSuggestedItinerary(
  activities: Activity[],
  options: { days?: number; maxItemsPerDay?: number } = {},
): SuggestedItineraryDay[] {
  const days = Math.max(1, Math.min(options.days ?? 1, 5));
  const maxItemsPerDay = options.maxItemsPerDay ?? 2;
  const candidates = activities
    .map((activity, index) => ({ activity, index }))
    .filter(({ activity }) => isConcreteCandidate(activity))
    .sort(compareIndexedItineraryCandidates)
    .map(({ activity }) => activity);
  const used = new Set<string>();
  const usedTypes = new Set<ActivityType>();
  const itinerary: SuggestedItineraryDay[] = [];

  for (let day = 1; day <= days; day += 1) {
    const items: SuggestedItineraryItem[] = [];

    for (const slot of SLOT_ORDER) {
      const candidate = selectCandidateForSlot(candidates, used, usedTypes, slot.types);
      if (!candidate) continue;
      used.add(candidate.id);
      usedTypes.add(candidate.activity_type);
      items.push({ timeLabel: slot.timeLabel, activity: candidate });
      if (items.length >= maxItemsPerDay) break;
    }

    if (items.length > 0) itinerary.push({ day, items });
  }

  return itinerary;
}

function selectCandidateForSlot(
  candidates: Activity[],
  used: Set<string>,
  usedTypes: Set<ActivityType>,
  slotTypes: ActivityType[],
) {
  return candidates.find((activity) => (
    !used.has(activity.id) &&
    slotTypes.includes(activity.activity_type) &&
    !usedTypes.has(activity.activity_type)
  )) ?? candidates.find((activity) => (
    !used.has(activity.id) && slotTypes.includes(activity.activity_type)
  ));
}

function isConcreteCandidate(activity: Activity) {
  if (!isUserFacingActivitySuggestion(activity)) return false;
  return Boolean(
    activity.external_id
    || activity.rating !== null
    || activity.review_count !== null
    || activity.photo_url
    || activity.distance_from_center_km !== null,
  );
}

function compareIndexedItineraryCandidates(
  a: { activity: Activity; index: number },
  b: { activity: Activity; index: number },
) {
  const scoreDiff = itineraryScore(b.activity) - itineraryScore(a.activity);
  if (scoreDiff !== 0) return scoreDiff;
  return a.index - b.index;
}

function itineraryScore(activity: Activity) {
  let score = 0;
  if (activity.selected) score += 100;
  if (activity.source === 'google_places') score += 30;
  if (activity.source === 'openstreetmap') score += 20;
  if (activity.source === 'ai_curated') score += 15;
  if (activity.rating !== null) score += activity.rating * 5;
  if (activity.review_count !== null) score += Math.min(activity.review_count / 1000, 15);
  if (activity.distance_from_center_km !== null) score += Math.max(0, 8 - activity.distance_from_center_km);
  return score;
}
