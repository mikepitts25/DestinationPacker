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
    .filter(isConcreteCandidate)
    .sort(compareItineraryCandidates);
  const used = new Set<string>();
  const itinerary: SuggestedItineraryDay[] = [];

  for (let day = 1; day <= days; day += 1) {
    const items: SuggestedItineraryItem[] = [];

    for (const slot of SLOT_ORDER) {
      const candidate = candidates.find((activity) => (
        !used.has(activity.id) && slot.types.includes(activity.activity_type)
      ));
      if (!candidate) continue;
      used.add(candidate.id);
      items.push({ timeLabel: slot.timeLabel, activity: candidate });
      if (items.length >= maxItemsPerDay) break;
    }

    if (items.length > 0) itinerary.push({ day, items });
  }

  return itinerary;
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

function compareItineraryCandidates(a: Activity, b: Activity) {
  const scoreDiff = itineraryScore(b) - itineraryScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  return a.activity_name.localeCompare(b.activity_name);
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
