import {
  completeActivitySuggestions,
  dedupeActivitySuggestions,
  isUserFacingActivitySuggestion,
} from '../suggestions';
import type { ActivitySuggestion } from '../localSuggestions';

function suggestion(
  activity_name: string,
  activity_type: ActivitySuggestion['activity_type'],
  external_id: string | null = null,
): ActivitySuggestion {
  return {
    activity_name,
    activity_type,
    description: `${activity_name} description`,
    source: 'openstreetmap',
    external_id,
    photo_url: null,
  };
}

describe('activity suggestion helpers', () => {
  it('deduplicates repeated suggestion names even when provider ids differ', () => {
    const activities = dedupeActivitySuggestions([
      suggestion('Admiralspalast', 'cultural', 'osm:way:1'),
      suggestion('admiralspalast', 'cultural', 'osm:relation:2'),
      suggestion('Museum Island', 'cultural', 'osm:node:3'),
    ]);

    expect(activities.map((activity) => activity.activity_name)).toEqual([
      'Admiralspalast',
      'Museum Island',
    ]);
  });

  it('does not fill food and nightlife interests with generic suggested prompts', () => {
    const activities = completeActivitySuggestions(
      [
        suggestion('Museum Island', 'cultural', 'osm:node:1'),
        suggestion('Brandenburg Gate', 'cultural', 'osm:node:2'),
        {
          ...suggestion('Book one hands-on Berlin, Germany food or craft session', 'dining'),
          source: 'suggested',
        },
      ],
      'Berlin, Germany',
      ['museums', 'historical_sites', 'fine_dining', 'local_markets', 'live_music'],
    );

    const types = new Set(activities.map((activity) => activity.activity_type));
    expect(types.has('cultural')).toBe(true);
    expect(types.has('dining')).toBe(false);
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Try: Currywurst');
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Book one hands-on Berlin, Germany food or craft session');
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Berlin, Germany notable restaurant reservation');
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Berlin, Germany live music room or concert hall');
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Try local cuisine');
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Visit local museums');
  });

  it('does not invent food activities when provider and local data are empty', () => {
    const activities = completeActivitySuggestions(
      [],
      'Somewhere New',
      ['fine_dining', 'street_food', 'wine_tasting'],
    );

    expect(activities).toEqual([]);
  });

  it('keeps named sights and dining anchors even when interests are narrow', () => {
    const activities = completeActivitySuggestions(
      [
        suggestion('Casa Batllo', 'cultural'),
        suggestion('Disfrutar', 'dining'),
        suggestion('Praia de Carcavelos', 'beach'),
      ],
      'Barcelona, Catalonia, Spain',
      ['beach_pool'],
    );
    const names = activities.map((activity) => activity.activity_name);

    expect(names).toEqual(expect.arrayContaining([
      'Casa Batllo',
      'Disfrutar',
      'Praia de Carcavelos',
    ]));
  });

  it('does not use placeholder fallback wording for unknown destinations', () => {
    const activities = completeActivitySuggestions(
      [],
      'Somewhere New',
      [],
    );

    const copy = activities
      .map((activity) => `${activity.activity_name} ${activity.description ?? ''}`.toLowerCase())
      .join(' ');

    expect(copy).not.toContain('old town, landmark');
    expect(copy).not.toContain('local market and independent shops');
    expect(copy).not.toContain('maker, cooking, or craft workshop');
    expect(copy).not.toContain('park, garden, viewpoint, or waterfront');
    expect(copy).not.toContain('look for');
    expect(activities).toEqual([]);
  });

  it('uses named Lisbon picks instead of generic food and market prompts', () => {
    const activities = completeActivitySuggestions(
      [],
      'Lisbon, Portugal',
      ['beach_pool', 'wine_tasting', 'fine_dining', 'craft_beer', 'hiking', 'local_markets'],
    );
    const names = activities.map((activity) => activity.activity_name);

    expect(names).toEqual(expect.arrayContaining([
      'Time Out Market Lisboa',
      'Garrafeira Alfaia',
      'Dois Corvos Marvila Taproom',
      'Praia de Carcavelos',
      'LX Market at LX Factory',
      'Park and National Palace of Pena',
    ]));
    expect(names.some((name) => name.toLowerCase().includes('book a'))).toBe(false);
    expect(names.some((name) => name.toLowerCase().includes('look for'))).toBe(false);
    expect(names.some((name) => name.toLowerCase().includes('experience: port'))).toBe(false);
  });

  it('does not surface generic country-level experience or try prompts as activity ideas', () => {
    const activities = completeActivitySuggestions(
      [],
      'Barcelona, Catalonia, Spain',
      ['fine_dining', 'street_food', 'wine_tasting', 'craft_beer', 'local_markets', 'architecture'],
    );
    const names = activities.map((activity) => activity.activity_name);

    expect(names).not.toContain('Experience: Tapas or market food tour');
    expect(names).not.toContain('Experience: Moorish, medieval, or old town architecture walk');
    expect(names).not.toContain('Try: Iberian jamon');
  });

  it('filters cinemas and broad destination labels from user-facing suggestions', () => {
    expect(isUserFacingActivitySuggestion({
      source: 'openstreetmap',
      activity_name: 'CINEMA Filmtheater',
      activity_type: 'cultural',
      description: 'CINEMA Filmtheater is a cinema.',
      destination: 'Munich, Bavaria, Germany',
    })).toBe(false);

    expect(isUserFacingActivitySuggestion({
      source: 'openstreetmap',
      activity_name: 'Bavaria',
      activity_type: 'cultural',
      description: 'Bavaria is a tourist attraction.',
      destination: 'Munich, Bavaria, Germany',
    })).toBe(false);
  });
});
