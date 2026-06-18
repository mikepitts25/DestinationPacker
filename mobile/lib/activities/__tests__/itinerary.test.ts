import { buildSuggestedItinerary } from '../itinerary';
import type { Activity } from '@/types';

function activity(overrides: Partial<Activity> & Pick<Activity, 'id' | 'activity_name' | 'activity_type'>): Activity {
  return {
    id: overrides.id,
    trip_id: 'trip-1',
    destination: overrides.destination ?? 'Munich, Bavaria, Germany',
    activity_name: overrides.activity_name,
    activity_type: overrides.activity_type,
    description: overrides.description ?? `${overrides.activity_name} description`,
    source: overrides.source ?? 'openstreetmap',
    external_id: overrides.external_id ?? `osm:${overrides.id}`,
    photo_url: overrides.photo_url ?? null,
    rating: overrides.rating ?? null,
    review_count: overrides.review_count ?? null,
    rating_source: overrides.rating_source ?? null,
    distance_from_center_km: overrides.distance_from_center_km ?? 1,
    selected: overrides.selected ?? false,
  };
}

describe('activity itinerary builder', () => {
  it('builds a day plan from concrete candidates and ignores generated placeholders', () => {
    const itinerary = buildSuggestedItinerary([
      activity({
        id: 'placeholder',
        activity_name: 'Book one hands-on Munich food or craft session',
        activity_type: 'dining',
        source: 'suggested',
        external_id: null,
      }),
      activity({
        id: 'museum',
        activity_name: 'Deutsches Museum',
        activity_type: 'cultural',
        rating: 4.7,
        review_count: 8000,
      }),
      activity({
        id: 'market',
        activity_name: 'Viktualienmarkt',
        activity_type: 'shopping',
      }),
      activity({
        id: 'garden',
        activity_name: 'English Garden',
        activity_type: 'outdoor',
      }),
      activity({
        id: 'beer',
        activity_name: 'Augustiner-Keller',
        activity_type: 'nightlife',
        rating: 4.5,
        review_count: 12000,
      }),
    ], { days: 2 });

    expect(itinerary).toHaveLength(2);
    expect(itinerary.flatMap((day) => day.items.map((item) => item.activity.activity_name))).toEqual([
      'Deutsches Museum',
      'Viktualienmarkt',
      'English Garden',
      'Augustiner-Keller',
    ]);
  });

  it('excludes broad destination labels and cinemas from itinerary candidates', () => {
    const itinerary = buildSuggestedItinerary([
      activity({
        id: 'region',
        activity_name: 'Bavaria',
        activity_type: 'cultural',
        description: 'Bavaria is a region.',
      }),
      activity({
        id: 'cinema',
        activity_name: 'CINEMA Filmtheater',
        activity_type: 'cultural',
        description: 'CINEMA Filmtheater is a cinema.',
      }),
      activity({
        id: 'museum',
        activity_name: 'Deutsches Museum',
        activity_type: 'cultural',
        description: 'A science and technology museum on Museum Island.',
      }),
      activity({
        id: 'market',
        activity_name: 'Viktualienmarkt',
        activity_type: 'shopping',
        description: 'A central food market in Munich.',
      }),
    ], { days: 2 });

    expect(itinerary.flatMap((day) => day.items.map((item) => item.activity.activity_name))).toEqual([
      'Deutsches Museum',
      'Viktualienmarkt',
    ]);
  });
});
