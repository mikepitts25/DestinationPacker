import { tripDestinations } from '../destinations';
import type { Trip } from '@/types';

function trip(overrides: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    destination: 'Berlin, Germany',
    latitude: 52.52,
    longitude: 13.405,
    country_code: 'de',
    start_date: '2026-06-01',
    end_date: '2026-06-07',
    accommodation: 'hotel',
    travel_method: 'flight',
    travelers: 1,
    male_travelers: 1,
    female_travelers: 0,
    children: 0,
    pets: 0,
    activity_interests: [],
    notes: null,
    has_laundry_access: false,
    legs: [],
    duration_days: 7,
    created_at: '2026-05-19T00:00:00Z',
    ...overrides,
  };
}

describe('trip destinations', () => {
  it('returns every stored leg with its own dates and coordinates', () => {
    expect(tripDestinations(trip({
      destination: 'Berlin, Germany',
      legs: [
        {
          destination: 'Berlin, Germany',
          latitude: 52.52,
          longitude: 13.405,
          country_code: 'de',
          start_date: '2026-06-01',
          end_date: '2026-06-03',
          travel_method: 'flight',
          accommodation: 'hotel',
        },
        {
          destination: 'Prague, Czechia',
          latitude: 50.0755,
          longitude: 14.4378,
          country_code: 'cz',
          start_date: '2026-06-04',
          end_date: '2026-06-07',
          travel_method: 'train',
          accommodation: 'hotel',
        },
      ],
    }))).toEqual([
      expect.objectContaining({ destination: 'Berlin, Germany', start_date: '2026-06-01' }),
      expect.objectContaining({ destination: 'Prague, Czechia', start_date: '2026-06-04' }),
    ]);
  });

  it('falls back to the primary destination for older single-stop trips', () => {
    expect(tripDestinations(trip({ destination: 'Tokyo, Japan', legs: [] }))).toEqual([
      expect.objectContaining({ destination: 'Tokyo, Japan', latitude: 52.52 }),
    ]);
  });
});
