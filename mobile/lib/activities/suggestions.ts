import { activityTypesForInterests } from './interests';
import {
  localActivitySuggestionsForDestination,
  type ActivitySuggestion,
} from './localSuggestions';
import type { ActivityInterest, ActivityType } from '@/types';

const MAX_SUGGESTIONS_PER_DESTINATION = 18;

type SuggestionSeed = Omit<ActivitySuggestion, 'source' | 'external_id' | 'photo_url'>;

const BASE_FALLBACKS: SuggestionSeed[] = [
  {
    activity_name: 'Visit local museums',
    activity_type: 'cultural',
    description: 'Explore museums, galleries, and local collections.',
  },
  {
    activity_name: 'Tour monuments and historic landmarks',
    activity_type: 'cultural',
    description: 'Visit memorials, monuments, historic buildings, and major city landmarks.',
  },
  {
    activity_name: 'Try local cuisine',
    activity_type: 'dining',
    description: 'Sample local restaurants, cafes, markets, and classic dishes.',
  },
  {
    activity_name: 'Day hike or nature walk',
    activity_type: 'outdoor',
    description: 'Discover parks, gardens, trails, or natural areas nearby.',
  },
  {
    activity_name: 'Beach or waterfront time',
    activity_type: 'beach',
    description: 'Spend time by a beach, lake, riverfront, waterfront, or pool area.',
  },
  {
    activity_name: 'Evening drinks or live music',
    activity_type: 'nightlife',
    description: 'Plan a night out at a bar, music venue, club, or late-night neighborhood.',
  },
  {
    activity_name: 'Spa, wellness, or fitness session',
    activity_type: 'wellness',
    description: 'Look for a spa, yoga class, gym session, or wellness activity nearby.',
  },
  {
    activity_name: 'Local markets and shopping',
    activity_type: 'shopping',
    description: 'Browse local markets, shopping streets, and small independent shops.',
  },
  {
    activity_name: 'Family-friendly attraction',
    activity_type: 'family',
    description: 'Look for hands-on museums, aquariums, parks, or kid-friendly attractions.',
  },
  {
    activity_name: 'Adventure activity',
    activity_type: 'adventure',
    description: 'Look for guided activities, active day trips, or outdoor adventure options.',
  },
];

const INTEREST_FALLBACKS: Partial<Record<ActivityInterest, SuggestionSeed[]>> = {
  museums: [
    {
      activity_name: 'Visit local museums',
      activity_type: 'cultural',
      description: 'Explore museums and collections tied to the destination.',
    },
  ],
  art_galleries: [
    {
      activity_name: 'Browse art galleries',
      activity_type: 'cultural',
      description: 'Look for galleries, art districts, and local exhibition spaces.',
    },
  ],
  historical_sites: [
    {
      activity_name: 'Tour monuments and historic landmarks',
      activity_type: 'cultural',
      description: 'Visit monuments, memorials, ruins, castles, or historic buildings.',
    },
  ],
  architecture: [
    {
      activity_name: 'Architecture walk',
      activity_type: 'cultural',
      description: 'Walk a route focused on notable streets, buildings, and neighborhoods.',
    },
  ],
  fine_dining: [
    {
      activity_name: 'Book a notable restaurant',
      activity_type: 'dining',
      description: 'Find a well-reviewed restaurant for a planned meal.',
    },
  ],
  street_food: [
    {
      activity_name: 'Try street food or casual eats',
      activity_type: 'dining',
      description: 'Look for market stalls, bakeries, food halls, or casual local specialties.',
    },
  ],
  wine_tasting: [
    {
      activity_name: 'Wine bar or tasting',
      activity_type: 'dining',
      description: 'Find a wine bar, tasting room, or restaurant with regional bottles.',
    },
  ],
  craft_beer: [
    {
      activity_name: 'Craft beer stop',
      activity_type: 'nightlife',
      description: 'Visit a local brewery, beer hall, pub, or taproom.',
    },
  ],
  nightclubs: [
    {
      activity_name: 'Club night',
      activity_type: 'nightlife',
      description: 'Plan a late-night venue, club, or dance-focused evening.',
    },
  ],
  live_music: [
    {
      activity_name: 'Live music venue',
      activity_type: 'nightlife',
      description: 'Look for concert halls, clubs, jazz bars, or small live music rooms.',
    },
  ],
  local_markets: [
    {
      activity_name: 'Local markets and shopping',
      activity_type: 'shopping',
      description: 'Browse markets for food, crafts, clothes, and small gifts.',
    },
  ],
  spa_wellness: [
    {
      activity_name: 'Spa, wellness, or fitness session',
      activity_type: 'wellness',
      description: 'Look for a spa, yoga class, gym session, or wellness activity nearby.',
    },
  ],
  beach_pool: [
    {
      activity_name: 'Beach or waterfront time',
      activity_type: 'beach',
      description: 'Spend time by a beach, lake, riverfront, waterfront, or pool area.',
    },
  ],
  theme_parks: [
    {
      activity_name: 'Theme park or amusement stop',
      activity_type: 'family',
      description: 'Look for amusement parks, rides, arcades, or entertainment complexes.',
    },
  ],
  zoos_aquariums: [
    {
      activity_name: 'Zoo or aquarium visit',
      activity_type: 'family',
      description: 'Find animal parks, aquariums, or conservation-focused attractions.',
    },
  ],
  kid_friendly: [
    {
      activity_name: 'Kid-friendly activity',
      activity_type: 'family',
      description: 'Look for hands-on museums, playgrounds, parks, or relaxed family stops.',
    },
  ],
};

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

function seedSuggestionsForInterests(destination: string, interests: ActivityInterest[]) {
  const byInterest = interests.flatMap((interest) => INTEREST_FALLBACKS[interest] ?? []);
  const selectedTypes = activityTypesForInterests(interests);
  const base = BASE_FALLBACKS.filter((activity) => matchesSelectedTypes(activity.activity_type, selectedTypes));
  const local = localActivitySuggestionsForDestination(destination)
    .filter((activity) => matchesSelectedTypes(activity.activity_type, selectedTypes));

  return [
    ...byInterest.map(asSuggestedActivity),
    ...local,
    ...base.map(asSuggestedActivity),
  ];
}

export function fallbackActivitiesForDestination(
  destination: string,
  interests: ActivityInterest[] = [],
): ActivitySuggestion[] {
  const selectedTypes = activityTypesForInterests(interests);
  const base = BASE_FALLBACKS
    .filter((activity) => matchesSelectedTypes(activity.activity_type, selectedTypes))
    .map(asSuggestedActivity);
  const seeds = seedSuggestionsForInterests(destination, interests);
  const activities = dedupeActivitySuggestions([
    {
      activity_name: `Explore ${destination} city center`,
      activity_type: 'cultural',
      description: 'Walk around and discover local neighborhoods.',
      source: 'suggested',
      external_id: null,
      photo_url: null,
    },
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
    matchesSelectedTypes(activity.activity_type, selectedTypes)
  ));
  const seeds = seedSuggestionsForInterests(destination, interests);
  const completed = dedupeActivitySuggestions([...provider, ...seeds]);

  return diversifyActivitySuggestions(
    completed.length > 0 ? completed : fallbackActivitiesForDestination(destination, interests),
    interests,
  );
}
