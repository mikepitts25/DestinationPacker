import { activityTypesForInterests } from './interests';
import {
  localActivitySuggestionsForDestination,
  type ActivitySuggestion,
} from './localSuggestions';
import type { ActivityInterest, ActivityType } from '@/types';

const MAX_SUGGESTIONS_PER_DESTINATION = 18;

type SuggestionSeed = Omit<ActivitySuggestion, 'source' | 'external_id' | 'photo_url'>;

function baseFallbacksForDestination(destination: string): SuggestionSeed[] {
  return [
    {
      activity_name: `Build a ${destination} history walk around the old center`,
      activity_type: 'cultural',
      description: 'Use the oldest streets, civic buildings, preserved corners, and landmark blocks as a focused cultural route.',
    },
    {
      activity_name: `Use ${destination} market tasting as the food anchor`,
      activity_type: 'dining',
      description: 'Make one market, bakery, food hall, tasting counter, or signature dish the meal that shapes the day.',
    },
    {
      activity_name: `Book one hands-on ${destination} food or craft session`,
      activity_type: 'dining',
      description: 'Choose a class tied to regional food, drink, textiles, ceramics, chocolate, spices, or another craft with local roots.',
    },
    {
      activity_name: `Browse ${destination} markets for useful local finds`,
      activity_type: 'shopping',
      description: 'Use markets and small shops for practical gifts, food souvenirs, crafts, and products that are actually regional.',
    },
    {
      activity_name: `Add a low-friction ${destination} viewpoint or waterfront reset`,
      activity_type: 'outdoor',
      description: 'Keep one outdoor reset between heavier museum, meal, and sightseeing plans so the day has breathing room.',
    },
  ];
}

function interestFallbacksForDestination(
  destination: string,
  interests: ActivityInterest[],
): SuggestionSeed[] {
  return interests.flatMap((interest): SuggestionSeed[] => {
    switch (interest) {
      case 'museums':
        return [{
          activity_name: `${destination} museum or specialist collection`,
          activity_type: 'cultural',
          description: 'Prioritize museums with a strong local story, not just the biggest building on the map.',
        }];
      case 'art_galleries':
        return [{
          activity_name: `${destination} gallery district or artist studio visit`,
          activity_type: 'cultural',
          description: 'Look for current exhibitions, independent galleries, or artist-led spaces tied to the city.',
        }];
      case 'historical_sites':
        return [{
          activity_name: `${destination} castle, ruins, fort, or heritage site`,
          activity_type: 'cultural',
          description: 'Keep castles, archaeological sites, old quarters, monuments, and preserved civic buildings in the mix.',
        }];
      case 'architecture':
        return [{
          activity_name: `${destination} architecture walk`,
          activity_type: 'cultural',
          description: 'Plan a route around notable streets, public buildings, churches, stations, bridges, or design districts.',
        }];
      case 'fine_dining':
        return [{
          activity_name: `${destination} notable restaurant reservation`,
          activity_type: 'dining',
          description: 'Choose one destination-specific meal worth planning around rather than a generic restaurant search.',
        }];
      case 'street_food':
        return [{
          activity_name: `${destination} street-food, bakery, or market-stall crawl`,
          activity_type: 'dining',
          description: 'Sample small bites from markets, bakeries, food halls, or casual counters known locally.',
        }];
      case 'wine_tasting':
        return [{
          activity_name: `${destination} regional wine tasting`,
          activity_type: 'dining',
          description: 'Find a tasting room, cellar, vineyard trip, or wine bar focused on nearby regional bottles.',
        }];
      case 'craft_beer':
        return [{
          activity_name: `${destination} brewery, beer hall, or taproom`,
          activity_type: 'nightlife',
          description: 'Try local styles at a brewery, taproom, beer hall, or pub with regional pours.',
        }];
      case 'nightclubs':
        return [{
          activity_name: `${destination} late-night venue or club district`,
          activity_type: 'nightlife',
          description: 'Pick a specific neighborhood or venue that fits your music and safety preferences.',
        }];
      case 'live_music':
        return [{
          activity_name: `${destination} live music room or concert hall`,
          activity_type: 'nightlife',
          description: 'Look for jazz rooms, small stages, concert halls, or traditional music performances.',
        }];
      case 'local_markets':
        return [{
          activity_name: `${destination} food, craft, or flea market`,
          activity_type: 'shopping',
          description: 'Use markets for local produce, vintage finds, crafts, spices, textiles, and small gifts.',
        }];
      case 'spa_wellness':
      case 'yoga_retreats':
        return [{
          activity_name: `${destination} spa, bathhouse, yoga, or wellness session`,
          activity_type: 'wellness',
          description: 'Find a wellness stop that reflects the destination, such as bathhouses, hammams, springs, or small studios.',
        }];
      case 'beach_pool':
        return [{
          activity_name: `${destination} beach, pool, lake, or waterfront plan`,
          activity_type: 'beach',
          description: 'Choose a realistic water stop and check access, towels, lockers, and season before you go.',
        }];
      case 'theme_parks':
        return [{
          activity_name: `${destination} amusement park, rides, or family entertainment stop`,
          activity_type: 'family',
          description: 'Pick a full-day park or smaller entertainment stop that fits the trip pace.',
        }];
      case 'zoos_aquariums':
        return [{
          activity_name: `${destination} zoo, aquarium, or conservation attraction`,
          activity_type: 'family',
          description: 'Look for animal or marine-life attractions with strong welfare and conservation standards.',
        }];
      case 'kid_friendly':
        return [{
          activity_name: `${destination} hands-on family museum or relaxed kid stop`,
          activity_type: 'family',
          description: 'Prioritize interactive museums, parks, short tours, playgrounds, or low-friction indoor options.',
        }];
      case 'hiking':
      case 'cycling':
      case 'rock_climbing':
      case 'extreme_sports':
      case 'safari':
      case 'backpacking':
        return [{
          activity_name: `${destination} guided outdoor or adventure day`,
          activity_type: 'adventure',
          description: 'Choose a route or outfitter matched to the weather, terrain, and your actual fitness level.',
        }];
      case 'surfing':
      case 'scuba_diving':
        return [{
          activity_name: `${destination} guided water activity`,
          activity_type: 'water',
          description: 'Check season, water conditions, equipment rental, and certification requirements before booking.',
        }];
      case 'skiing_snowboarding':
        return [{
          activity_name: `${destination} ski or snow day`,
          activity_type: 'snow',
          description: 'Confirm snow conditions, lift access, rentals, lessons, and transport before planning the day.',
        }];
      default:
        return [];
    }
  });
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

function seedSuggestionsForInterests(destination: string, interests: ActivityInterest[]) {
  const byInterest = interestFallbacksForDestination(destination, interests);
  const selectedTypes = activityTypesForInterests(interests);
  const base = baseFallbacksForDestination(destination)
    .filter((activity) => matchesSelectedTypes(activity.activity_type, selectedTypes));
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
    matchesSelectedTypes(activity.activity_type, selectedTypes)
  ));
  const seeds = seedSuggestionsForInterests(destination, interests);
  const completed = dedupeActivitySuggestions([...provider, ...seeds]);

  return diversifyActivitySuggestions(
    completed.length > 0 ? completed : fallbackActivitiesForDestination(destination, interests),
    interests,
  );
}
