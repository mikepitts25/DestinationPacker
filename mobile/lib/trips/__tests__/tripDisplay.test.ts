import { formatTripDurationBadge, formatTripRoute } from '../tripDisplay';
import type { Trip } from '@/types';

function trip(overrides: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    destination: 'Berlin, Germany',
    latitude: null,
    longitude: null,
    country_code: null,
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

describe('trip display helpers', () => {
  it('formats multi-leg routes with destination arrows', () => {
    expect(formatTripRoute(trip({
      destination: 'Paris, France',
      legs: [
        {
          destination: 'Paris, France',
          travel_method: 'flight',
          accommodation: 'hotel',
          start_date: '2026-06-01',
          end_date: '2026-06-03',
        },
        {
          destination: 'Chamonix, France',
          travel_method: 'train',
          accommodation: 'camping',
          start_date: '2026-06-04',
          end_date: '2026-06-07',
        },
      ],
    }))).toBe('Paris, France → Chamonix, France');
  });

  it('falls back to the single destination when no legs are stored', () => {
    expect(formatTripRoute(trip({ destination: 'Tokyo, Japan', legs: [] }))).toBe('Tokyo, Japan');
  });

  it('spells out nights and day labels for trip cards', () => {
    expect(formatTripDurationBadge(7)).toBe('6 Nights');
    expect(formatTripDurationBadge(1)).toBe('1 Day');
  });
});
