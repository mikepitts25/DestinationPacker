import {
  buildActivityPlan,
  groupActivitiesForPlanning,
  activityPlanningInsight,
} from '../plan';
import type { Activity } from '@/types';

function activity(overrides: Partial<Activity> & Pick<Activity, 'id' | 'activity_name' | 'activity_type'>): Activity {
  return {
    id: overrides.id,
    trip_id: 'trip-1',
    destination: overrides.destination ?? 'Berlin, Germany',
    activity_name: overrides.activity_name,
    activity_type: overrides.activity_type,
    description: overrides.description ?? `${overrides.activity_name} description`,
    source: overrides.source ?? 'openstreetmap',
    external_id: overrides.external_id ?? null,
    photo_url: overrides.photo_url ?? null,
    rating: overrides.rating ?? null,
    review_count: overrides.review_count ?? null,
    rating_source: overrides.rating_source ?? null,
    distance_from_center_km: overrides.distance_from_center_km ?? null,
    selected: overrides.selected ?? false,
  };
}

describe('activity planning helpers', () => {
  it('builds a mixed suggested plan that prefers selected and high-signal activities', () => {
    const plan = buildActivityPlan([
      activity({
        id: 'generic-shop',
        activity_name: 'Berlin gift shop browse',
        activity_type: 'shopping',
      }),
      activity({
        id: 'selected-food',
        activity_name: 'Try: Currywurst',
        activity_type: 'dining',
        source: 'local_guide',
        selected: true,
      }),
      activity({
        id: 'museum',
        activity_name: 'Museum Island',
        activity_type: 'cultural',
        rating: 4.7,
        review_count: 12000,
        photo_url: 'https://example.com/museum.jpg',
      }),
      activity({
        id: 'ampelmann',
        activity_name: 'Buy: Ampelmann souvenir',
        activity_type: 'souvenirs',
        source: 'local_guide',
      }),
      activity({
        id: 'park',
        activity_name: 'Tiergarten reset walk',
        activity_type: 'outdoor',
        distance_from_center_km: 1.2,
      }),
    ]);

    expect(plan.map((block) => block.activityId)).toEqual([
      'selected-food',
      'museum',
      'ampelmann',
      'park',
    ]);
    expect(new Set(plan.map((block) => block.timeLabel)).size).toBeGreaterThan(1);
    expect(new Set(plan.map((block) => block.activityId)).size).toBe(plan.length);
    expect(plan[0]).toEqual(expect.objectContaining({
      timeLabel: 'Morning',
      title: 'Try: Currywurst',
      destination: 'Berlin, Germany',
      groupLabel: 'Start With These',
    }));
    expect(plan[0].reason).toContain('already in your trip');
  });

  it('keeps destinations visible in multi-destination plans', () => {
    const plan = buildActivityPlan([
      activity({
        id: 'berlin-food',
        activity_name: 'Try: Currywurst',
        activity_type: 'dining',
        destination: 'Berlin, Germany',
        source: 'local_guide',
      }),
      activity({
        id: 'budapest-bath',
        activity_name: 'Szechenyi thermal bath session',
        activity_type: 'wellness',
        destination: 'Budapest, Hungary',
        rating: 4.6,
      }),
    ]);

    expect(plan.map((block) => block.destination)).toEqual([
      'Berlin, Germany',
      'Budapest, Hungary',
    ]);
  });

  it('groups activities into planning-focused sections', () => {
    const groups = groupActivitiesForPlanning([
      activity({
        id: 'selected',
        activity_name: 'Museum Island',
        activity_type: 'cultural',
        selected: true,
      }),
      activity({
        id: 'food',
        activity_name: 'Try: Berliner Pfannkuchen',
        activity_type: 'dining',
      }),
      activity({
        id: 'booking',
        activity_name: 'Laurent Gerbaud chocolate workshop',
        activity_type: 'dining',
        external_id: 'place:laurent-gerbaud',
      }),
      activity({
        id: 'souvenir',
        activity_name: 'Buy: Ampelmann souvenir',
        activity_type: 'souvenirs',
      }),
      activity({
        id: 'outdoor',
        activity_name: 'Tiergarten reset walk',
        activity_type: 'outdoor',
      }),
      activity({
        id: 'easy',
        activity_name: 'Small neighborhood gallery',
        activity_type: 'cultural',
      }),
    ]);

    const byTitle = new Map(groups.map((group) => [group.title, group.data.map((item) => item.id)]));
    expect(byTitle.get('Start With These')).toEqual(['selected']);
    expect(byTitle.get('Local Food & Drink')).toEqual(['food']);
    expect(byTitle.get('Worth Booking')).toEqual(['booking']);
    expect(byTitle.get('Bring Home')).toEqual(['souvenir']);
    expect(byTitle.get('Outdoor / Weather Dependent')).toEqual(['outdoor']);
    expect(byTitle.get('Easy Fillers')).toEqual(['easy']);
  });

  it('only uses concrete named places in Worth Booking', () => {
    const groups = groupActivitiesForPlanning([
      activity({
        id: 'generic-restaurant',
        activity_name: 'Munich, Bavaria, Germany notable restaurant reservation',
        activity_type: 'dining',
        source: 'suggested',
      }),
      activity({
        id: 'generic-brewery',
        activity_name: 'Munich, Bavaria, Germany brewery, beer hall, or taproom',
        activity_type: 'nightlife',
        source: 'suggested',
      }),
      activity({
        id: 'named-bath',
        activity_name: 'Szechenyi Thermal Bath',
        activity_type: 'wellness',
        source: 'openstreetmap',
        external_id: 'osm:123',
        rating: 4.6,
      }),
    ]);

    const byTitle = new Map(groups.map((group) => [group.title, group.data.map((item) => item.id)]));
    expect(byTitle.get('Worth Booking')).toEqual(['named-bath']);
    expect(byTitle.get('Local Food & Drink')).toEqual(['generic-restaurant']);
    expect(byTitle.get('Easy Fillers')).toEqual(['generic-brewery']);
  });

  it('limits each planning group to the top five activities by signal', () => {
    const groups = groupActivitiesForPlanning([
      activity({
        id: 'low',
        activity_name: 'Low signal cafe',
        activity_type: 'dining',
        rating: 3.9,
        review_count: 12,
      }),
      ...Array.from({ length: 5 }, (_, index) => activity({
        id: `rated-${index}`,
        activity_name: `Rated restaurant ${index}`,
        activity_type: 'dining',
        rating: 4.9 - index * 0.1,
        review_count: 5000 - index * 500,
        rating_source: 'Google',
      })),
    ]);

    expect(groups.find((group) => group.title === 'Local Food & Drink')?.data.map((item) => item.id)).toEqual([
      'rated-0',
      'rated-1',
      'rated-2',
      'rated-3',
      'rated-4',
    ]);
  });

  it('writes concrete planning insights from available activity context', () => {
    expect(activityPlanningInsight(activity({
      id: 'ai-market',
      activity_name: 'Mercat de Sant Josep de la Boqueria',
      activity_type: 'shopping',
      source: 'ai_curated',
      description: 'Named Barcelona market for food browsing; bring a reusable bag.',
    }))).toBe('Named Barcelona market for food browsing; bring a reusable bag.');

    expect(activityPlanningInsight(activity({
      id: 'rated',
      activity_name: 'Museum Island',
      activity_type: 'cultural',
      rating: 4.8,
      review_count: 23000,
    }))).toContain('Strong signal');

    expect(activityPlanningInsight(activity({
      id: 'buy',
      activity_name: 'Buy: Ampelmann souvenir',
      activity_type: 'souvenirs',
    }))).toContain('Bring-home');
  });
});
