import {
  appendLocalActivitySuggestions,
  localActivitySuggestionsForDestination,
} from '../localSuggestions';

describe('local activity suggestions', () => {
  it('suggests known local food and trinkets for Berlin', () => {
    const suggestions = localActivitySuggestionsForDestination('Berlin, Germany');
    const names = suggestions.map((suggestion) => suggestion.activity_name);

    expect(names).toContain('Try: Berliner Pfannkuchen');
    expect(names).toContain('Try: Currywurst');
    expect(names).toContain('Buy: Ampelmann souvenir');
  });

  it('suggests destination-specific goods for Budapest and Sri Lanka', () => {
    const budapestNames = localActivitySuggestionsForDestination('Budapest, Hungary').map((suggestion) => suggestion.activity_name);
    const sriLankaNames = localActivitySuggestionsForDestination('Sri Lanka').map((suggestion) => suggestion.activity_name);

    expect(budapestNames).toContain('Buy: Hungarian paprika');
    expect(sriLankaNames).toContain('Buy: Ceylon tea');
  });

  it('appends local suggestions without duplicating existing activities', () => {
    const activities = appendLocalActivitySuggestions([
      {
        activity_name: 'Try: Currywurst',
        activity_type: 'dining',
        description: 'Already present.',
        source: 'suggested',
        external_id: null,
        photo_url: null,
      },
    ], 'Berlin, Germany');

    expect(activities.filter((activity) => activity.activity_name === 'Try: Currywurst')).toHaveLength(1);
    expect(activities.map((activity) => activity.activity_name)).toContain('Buy: Ampelmann souvenir');
  });

  it('falls back to a generic local market suggestion for unknown destinations', () => {
    const suggestions = localActivitySuggestionsForDestination('Somewhere New');

    expect(suggestions).toEqual([
      expect.objectContaining({
        activity_name: 'Browse local markets for souvenirs',
        activity_type: 'souvenirs',
      }),
    ]);
  });
});
