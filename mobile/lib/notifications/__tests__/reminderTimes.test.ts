import { buildTripReminders } from '../reminderTimes';

const trip = { id: 'trip-1', destination: 'Lisbon', start_date: '2026-08-20' };

describe('buildTripReminders', () => {
  it('schedules a 3-day packing nudge and a day-before final check', () => {
    const now = new Date('2026-08-01T12:00:00');
    const reminders = buildTripReminders(trip, now);

    expect(reminders).toHaveLength(2);
    expect(reminders[0].title).toContain('3 days');
    expect(reminders[0].fireDate).toEqual(new Date('2026-08-17T09:00:00'));
    expect(reminders[1].title).toContain('tomorrow');
    expect(reminders[1].fireDate).toEqual(new Date('2026-08-19T18:00:00'));
    expect(reminders.every((r) => r.tripId === 'trip-1')).toBe(true);
  });

  it('drops reminders that are already in the past', () => {
    const now = new Date('2026-08-18T12:00:00');
    const reminders = buildTripReminders(trip, now);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].title).toContain('tomorrow');
  });

  it('returns nothing for trips starting today or in the past', () => {
    expect(buildTripReminders(trip, new Date('2026-08-20T08:00:00'))).toHaveLength(0);
    expect(buildTripReminders(trip, new Date('2026-09-01T08:00:00'))).toHaveLength(0);
  });

  it('returns nothing for an invalid start date', () => {
    expect(buildTripReminders({ ...trip, start_date: 'not-a-date' })).toHaveLength(0);
  });
});
