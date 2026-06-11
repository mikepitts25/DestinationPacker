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

  it('adds hands-on destination experiences for food and culture trips', () => {
    const italyNames = localActivitySuggestionsForDestination('Florence, Italy').map((suggestion) => suggestion.activity_name);
    const thailandNames = localActivitySuggestionsForDestination('Chiang Mai, Thailand').map((suggestion) => suggestion.activity_name);
    const belgiumNames = localActivitySuggestionsForDestination('Brussels, Belgium').map((suggestion) => suggestion.activity_name);

    expect(italyNames).toContain('Experience: Fresh pasta cooking class');
    expect(thailandNames).toContain('Experience: Thai cooking class with market visit');
    expect(belgiumNames).toContain('Experience: Belgian chocolate workshop');
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

  it('falls back to destination-specific guide prompts for unknown destinations', () => {
    const suggestions = localActivitySuggestionsForDestination('Somewhere New');

    expect(suggestions).toEqual([
      expect.objectContaining({
        activity_name: 'Experience: Somewhere New food or craft workshop',
        activity_type: 'dining',
      }),
      expect.objectContaining({
        activity_name: 'Buy: Small local specialty from Somewhere New',
        activity_type: 'souvenirs',
      }),
    ]);
  });
});
