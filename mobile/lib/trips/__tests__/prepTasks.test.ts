import { buildTripPrepTasks } from '../prepTasks';
import type { Trip } from '@/types';

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    destination: 'Tokyo, Japan',
    latitude: null,
    longitude: null,
    country_code: 'JP',
    start_date: '2026-06-10',
    end_date: '2026-06-17',
    accommodation: 'hotel',
    travel_method: 'flight',
    travelers: 2,
    male_travelers: 1,
    female_travelers: 1,
    children: 0,
    pets: 0,
    activity_interests: [],
    notes: null,
    has_laundry_access: false,
    legs: [],
    duration_days: 8,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildTripPrepTasks', () => {
  it('builds practical reminders for a flight within a week', () => {
    const tasks = buildTripPrepTasks(trip(), new Date('2026-06-03T12:00:00Z'));
    const titles = tasks.map((task) => task.title);

    expect(titles).toContain('Confirm bookings and opening days');
    expect(titles).toContain('Check documents and entry needs');
    expect(titles).toContain('Review buy-and-bring-home rules');
    expect(titles).toContain('Check baggage and airport rules');
    expect(titles).toContain('Do the final weather pass');
    expect(tasks.some((task) => task.timing === 'This week')).toBe(true);
  });

  it('adds family and pet prompts when needed', () => {
    const tasks = buildTripPrepTasks(trip({ children: 1, pets: 1 }), new Date('2026-05-20T12:00:00Z'));
    const titles = tasks.map((task) => task.title);

    expect(titles).toContain('Prep child travel essentials');
    expect(titles).toContain('Confirm pet travel requirements');
  });

  it('adds last-mile tasks close to departure', () => {
    const tasks = buildTripPrepTasks(trip(), new Date('2026-06-09T12:00:00Z'));

    expect(tasks.map((task) => task.title)).toContain('Finish the last-mile pack');
    expect(tasks.some((task) => task.timing === 'Next 3 days')).toBe(true);
  });
});
