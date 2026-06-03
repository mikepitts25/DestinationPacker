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

  it('adds missing categories from selected interests so suggestions stay varied', () => {
    const activities = completeActivitySuggestions(
      [
        suggestion('Museum Island', 'cultural', 'osm:node:1'),
        suggestion('Brandenburg Gate', 'cultural', 'osm:node:2'),
      ],
      'Berlin, Germany',
      ['museums', 'historical_sites', 'fine_dining', 'local_markets', 'live_music'],
    );

    const types = new Set(activities.map((activity) => activity.activity_type));
    expect(types.has('cultural')).toBe(true);
    expect(types.has('dining')).toBe(true);
    expect(types.has('shopping') || types.has('souvenirs')).toBe(true);
    expect(types.has('nightlife')).toBe(true);
    expect(activities.map((activity) => activity.activity_name)).toContain('Try: Currywurst');
  });
});
