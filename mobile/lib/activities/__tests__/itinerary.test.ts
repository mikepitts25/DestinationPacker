import { buildSuggestedItinerary } from '../itinerary';
import { localActivitySuggestionsForDestination } from '../localSuggestions';
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
    external_id: Object.prototype.hasOwnProperty.call(overrides, 'external_id')
      ? overrides.external_id ?? null
      : `osm:${overrides.id}`,
    photo_url: Object.prototype.hasOwnProperty.call(overrides, 'photo_url')
      ? overrides.photo_url ?? null
      : null,
    rating: Object.prototype.hasOwnProperty.call(overrides, 'rating')
      ? overrides.rating ?? null
      : null,
    review_count: Object.prototype.hasOwnProperty.call(overrides, 'review_count')
      ? overrides.review_count ?? null
      : null,
    rating_source: Object.prototype.hasOwnProperty.call(overrides, 'rating_source')
      ? overrides.rating_source ?? null
      : null,
    distance_from_center_km: Object.prototype.hasOwnProperty.call(overrides, 'distance_from_center_km')
      ? overrides.distance_from_center_km ?? null
      : null,
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

  it('builds three-stop day plans when enough named activities exist', () => {
    const itinerary = buildSuggestedItinerary([
      activity({
        id: 'site',
        activity_name: 'Casa Batllo',
        activity_type: 'cultural',
        source: 'ai_curated',
        external_id: null,
        description: 'Gaudi landmark for a morning architecture stop.',
      }),
      activity({
        id: 'lunch',
        activity_name: 'Disfrutar',
        activity_type: 'dining',
        source: 'ai_curated',
        external_id: null,
        description: 'Named restaurant for a food-focused meal anchor.',
      }),
      activity({
        id: 'beach',
        activity_name: 'Praia de Carcavelos',
        activity_type: 'beach',
        source: 'ai_curated',
        external_id: null,
        description: 'Named beach for an afternoon outdoor block.',
      }),
    ], { days: 1 });

    expect(itinerary).toHaveLength(1);
    expect(itinerary[0].items.map((item) => item.activity.activity_name)).toEqual([
      'Casa Batllo',
      'Disfrutar',
      'Praia de Carcavelos',
    ]);
  });

  it('builds Lisbon itinerary rows from named local-guide candidates', () => {
    const lisbonActivities = localActivitySuggestionsForDestination('Lisbon, Portugal')
      .map((suggestion, index) => activity({
        id: `lisbon-${index}`,
        destination: 'Lisbon, Portugal',
        activity_name: suggestion.activity_name,
        activity_type: suggestion.activity_type,
        description: suggestion.description,
        source: suggestion.source,
        external_id: suggestion.external_id,
      }));
    const itinerary = buildSuggestedItinerary(lisbonActivities, { days: 3 });
    const names = itinerary.flatMap((day) => day.items.map((item) => item.activity.activity_name));

    expect(names).toEqual(expect.arrayContaining([
      'Time Out Market Lisboa',
      'Praia de Carcavelos',
      'Park and National Palace of Pena',
      'LX Market at LX Factory',
    ]));
    expect(names.some((name) => name.toLowerCase().includes('book one'))).toBe(false);
    expect(names.some((name) => name.toLowerCase().includes('experience:'))).toBe(false);
  });

  it('builds an itinerary from named AI-curated city suggestions without provider ids', () => {
    const itinerary = buildSuggestedItinerary([
      activity({
        id: 'boqueria',
        destination: 'Barcelona, Catalonia, Spain',
        activity_name: 'Mercat de Sant Josep de la Boqueria',
        activity_type: 'shopping',
        source: 'ai_curated',
        external_id: null,
        description: 'Named Barcelona market for food browsing and snacks.',
      }),
      activity({
        id: 'casa-batllo',
        destination: 'Barcelona, Catalonia, Spain',
        activity_name: 'Casa Batllo',
        activity_type: 'cultural',
        source: 'ai_curated',
        external_id: null,
        description: 'Gaudi landmark that fits an architecture-focused Barcelona day.',
      }),
      activity({
        id: 'garage',
        destination: 'Barcelona, Catalonia, Spain',
        activity_name: 'Garage Beer Co.',
        activity_type: 'nightlife',
        source: 'ai_curated',
        external_id: null,
        description: 'Named Barcelona craft beer stop for an evening plan.',
      }),
    ], { days: 2 });

    expect(itinerary.flatMap((day) => day.items.map((item) => item.activity.activity_name))).toEqual([
      'Casa Batllo',
      'Mercat de Sant Josep de la Boqueria',
      'Garage Beer Co.',
    ]);
  });

  it('does not treat zero rating or zero distance as concrete itinerary signal', () => {
    const itinerary = buildSuggestedItinerary([
      activity({
        id: 'zero-rating',
        activity_name: 'Zero Rating Place',
        activity_type: 'cultural',
        external_id: null,
        rating: 0,
        review_count: 0,
        distance_from_center_km: null,
      }),
      activity({
        id: 'zero-distance',
        activity_name: 'Zero Distance Place',
        activity_type: 'shopping',
        external_id: null,
        rating: null,
        review_count: null,
        distance_from_center_km: 0,
      }),
    ], { days: 1 });

    expect(itinerary).toEqual([]);
  });
});
