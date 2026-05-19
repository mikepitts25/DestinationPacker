import type { ActivityInterest, ActivityType } from '@/types';

export type ActivityInterestOption = {
  value: ActivityInterest;
  label: string;
  emoji: string;
  activityTypes: ActivityType[];
};

export type ActivityInterestGroup = {
  title: string;
  options: ActivityInterestOption[];
};

export const ACTIVITY_INTEREST_GROUPS: ActivityInterestGroup[] = [
  {
    title: 'Outdoors',
    options: [
      { value: 'hiking', label: 'Hiking', emoji: '🥾', activityTypes: ['outdoor'] },
      { value: 'cycling', label: 'Cycling', emoji: '🚲', activityTypes: ['outdoor', 'sports'] },
      { value: 'surfing', label: 'Surfing', emoji: '🏄', activityTypes: ['water', 'beach'] },
      { value: 'skiing_snowboarding', label: 'Skiing/Snowboarding', emoji: '⛷️', activityTypes: ['snow', 'sports'] },
      { value: 'scuba_diving', label: 'Scuba Diving', emoji: '🤿', activityTypes: ['water'] },
      { value: 'rock_climbing', label: 'Rock Climbing', emoji: '🧗', activityTypes: ['outdoor', 'adventure'] },
    ],
  },
  {
    title: 'Culture',
    options: [
      { value: 'museums', label: 'Museums', emoji: '🏛️', activityTypes: ['cultural'] },
      { value: 'art_galleries', label: 'Art Galleries', emoji: '🖼️', activityTypes: ['cultural'] },
      { value: 'historical_sites', label: 'Historical Sites', emoji: '🏰', activityTypes: ['cultural'] },
      { value: 'architecture', label: 'Architecture', emoji: '🏙️', activityTypes: ['cultural'] },
      { value: 'local_markets', label: 'Local Markets', emoji: '🧺', activityTypes: ['shopping', 'souvenirs'] },
    ],
  },
  {
    title: 'Food & Nightlife',
    options: [
      { value: 'fine_dining', label: 'Fine Dining', emoji: '🍽️', activityTypes: ['dining'] },
      { value: 'street_food', label: 'Street Food', emoji: '🥟', activityTypes: ['dining'] },
      { value: 'wine_tasting', label: 'Wine Tasting', emoji: '🍷', activityTypes: ['dining'] },
      { value: 'craft_beer', label: 'Craft Beer', emoji: '🍺', activityTypes: ['nightlife', 'dining'] },
      { value: 'nightclubs', label: 'Nightclubs', emoji: '🪩', activityTypes: ['nightlife'] },
      { value: 'live_music', label: 'Live Music', emoji: '🎸', activityTypes: ['nightlife', 'cultural'] },
    ],
  },
  {
    title: 'Relaxation',
    options: [
      { value: 'spa_wellness', label: 'Spa/Wellness', emoji: '💆', activityTypes: ['wellness'] },
      { value: 'beach_pool', label: 'Beach/Pool', emoji: '🏖️', activityTypes: ['beach', 'water'] },
      { value: 'yoga_retreats', label: 'Yoga Retreats', emoji: '🧘', activityTypes: ['wellness'] },
    ],
  },
  {
    title: 'Family',
    options: [
      { value: 'theme_parks', label: 'Theme Parks', emoji: '🎢', activityTypes: ['family', 'outdoor'] },
      { value: 'zoos_aquariums', label: 'Zoos/Aquariums', emoji: '🐠', activityTypes: ['family', 'outdoor'] },
      { value: 'kid_friendly', label: 'Kid-friendly activities', emoji: '🧸', activityTypes: ['family'] },
    ],
  },
  {
    title: 'Adventure',
    options: [
      { value: 'extreme_sports', label: 'Extreme Sports', emoji: '🪂', activityTypes: ['adventure', 'sports'] },
      { value: 'safari', label: 'Safari', emoji: '🦁', activityTypes: ['adventure', 'outdoor'] },
      { value: 'backpacking', label: 'Backpacking', emoji: '🎒', activityTypes: ['outdoor', 'adventure'] },
    ],
  },
];

export const ACTIVITY_INTEREST_OPTIONS = ACTIVITY_INTEREST_GROUPS.flatMap((group) => group.options);

export function activityTypesForInterests(interests: ActivityInterest[]): ActivityType[] {
  const types = new Set<ActivityType>();
  for (const interest of interests) {
    const option = ACTIVITY_INTEREST_OPTIONS.find((item) => item.value === interest);
    for (const type of option?.activityTypes ?? []) {
      types.add(type);
    }
  }
  return Array.from(types);
}
