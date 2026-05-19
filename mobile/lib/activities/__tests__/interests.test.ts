import { ACTIVITY_INTEREST_GROUPS, activityTypesForInterests } from '../interests';

describe('activity interest options', () => {
  it('exposes the expanded grouped interest set', () => {
    expect(ACTIVITY_INTEREST_GROUPS.map((group) => group.title)).toEqual([
      'Outdoors',
      'Culture',
      'Food & Nightlife',
      'Relaxation',
      'Family',
      'Adventure',
    ]);

    const allOptions = ACTIVITY_INTEREST_GROUPS.flatMap((group) => group.options.map((option) => option.value));

    expect(allOptions).toHaveLength(26);
    expect(allOptions).toEqual(expect.arrayContaining([
      'hiking',
      'cycling',
      'surfing',
      'skiing_snowboarding',
      'scuba_diving',
      'rock_climbing',
      'museums',
      'art_galleries',
      'historical_sites',
      'architecture',
      'local_markets',
      'fine_dining',
      'street_food',
      'wine_tasting',
      'craft_beer',
      'nightclubs',
      'live_music',
      'spa_wellness',
      'beach_pool',
      'yoga_retreats',
      'theme_parks',
      'zoos_aquariums',
      'kid_friendly',
      'extreme_sports',
      'safari',
      'backpacking',
    ]));
  });

  it('maps specific interests to concrete activity types for provider filtering', () => {
    expect(activityTypesForInterests(['hiking', 'scuba_diving', 'fine_dining', 'local_markets'])).toEqual([
      'outdoor',
      'water',
      'dining',
      'shopping',
      'souvenirs',
    ]);
  });
});
