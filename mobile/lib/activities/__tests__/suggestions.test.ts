import {
  completeActivitySuggestions,
  dedupeActivitySuggestions,
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
    expect(types.has('dining')).toBe(true);
    expect(activities.map((activity) => activity.activity_name)).toContain('Try: Currywurst');
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
});
