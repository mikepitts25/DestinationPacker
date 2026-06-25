import { activitiesApi } from '../api';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const tripRow = {
  id: 'trip-1',
  user_id: 'user-1',
  destination: 'Barcelona, Catalonia, Spain',
  latitude: 41.3874,
  longitude: 2.1686,
  country_code: 'ES',
  start_date: '2026-06-30',
  end_date: '2026-07-03',
  accommodation: 'hotel',
  travel_method: 'flight',
  travelers: 2,
  male_travelers: 0,
  female_travelers: 0,
  children: 0,
  pets: 0,
  activity_interests: ['fine_dining', 'street_food', 'wine_tasting', 'craft_beer', 'local_markets', 'architecture'],
  notes: null,
  has_laundry_access: false,
  legs: [],
  created_at: '2026-06-25T00:00:00Z',
};

const staleActivity = {
  id: 'old-generic',
  trip_id: 'trip-1',
  destination: 'Barcelona, Catalonia, Spain',
  activity_name: 'Experience: Tapas or market food tour',
  activity_type: 'dining',
  description: 'A guided tapas route helps you try regional dishes without guessing from a crowded menu.',
  source: 'local_guide',
  external_id: null,
  photo_url: null,
  rating: null,
  review_count: null,
  rating_source: null,
  distance_from_center_km: null,
  selected: false,
};

function orderQuery(result: unknown[]) {
  let orderCount = 0;
  const query: { order: jest.Mock } = {
    order: jest.fn(() => {
      orderCount += 1;
      return orderCount >= 3 ? Promise.resolve({ data: result, error: null }) : query;
    }),
  };
  return query;
}

describe('activitiesApi.fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces stale unselected generated rows when refreshing activities', async () => {
    const insertedRows: any[][] = [];
    let deletedIds: string[] = [];
    const activityListResults = [
      [staleActivity],
      [{
        ...staleActivity,
        id: 'new-market',
        activity_name: 'Mercat de Sant Josep de la Boqueria',
        activity_type: 'shopping',
        description: 'Named Barcelona market for food browsing and snacks.',
        source: 'ai_curated',
      }],
    ];

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: {
        activities: [{
          activity_name: 'Mercat de Sant Josep de la Boqueria',
          activity_type: 'shopping',
          description: 'Named Barcelona market for food browsing and snacks.',
          source: 'ai_curated',
          external_id: null,
          photo_url: null,
        }],
      },
      error: null,
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'trips') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({ data: tripRow, error: null })),
            })),
          })),
        };
      }

      if (table === 'trip_activities') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => orderQuery(activityListResults.shift() ?? [])),
          })),
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn(async (_field: string, ids: string[]) => {
                deletedIds = ids;
                return { error: null };
              }),
            })),
          })),
          insert: jest.fn(async (rows: any[]) => {
            insertedRows.push(rows);
            return { error: null };
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    await activitiesApi.fetch('trip-1');

    expect(deletedIds).toEqual(['old-generic']);
    expect(insertedRows[0].map((row) => row.activity_name)).toContain('Mercat de Sant Josep de la Boqueria');
    expect(insertedRows[0].map((row) => row.activity_name)).not.toContain('Experience: Tapas or market food tour');
  });
});
