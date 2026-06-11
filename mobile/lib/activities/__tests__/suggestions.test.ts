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
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Try local cuisine');
    expect(activities.map((activity) => activity.activity_name)).not.toContain('Visit local museums');
  });

  it('uses destination-aware experience suggestions instead of generic filler', () => {
    const activities = completeActivitySuggestions(
      [],
      'Florence, Italy',
      ['historical_sites', 'street_food'],
    );

    const names = activities.map((activity) => activity.activity_name);
    expect(names).toContain('Experience: Fresh pasta cooking class');
    expect(names).toContain('Experience: Historic piazza and church walk');
    expect(names).toContain('Florence, Italy castle, ruins, fort, or heritage site');
    expect(names).not.toContain('Try local cuisine');
    expect(names).not.toContain('Tour monuments and historic landmarks');
  });

  it('uses decisive fallback wording instead of placeholder planning categories', () => {
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
    expect(activities.map((activity) => activity.activity_name)).toContain(
      'Use Somewhere New market tasting as the food anchor',
    );
  });
});
