export interface TripReminderInput {
  id: string;
  destination: string;
  start_date: string;
}

export interface TripReminder {
  tripId: string;
  title: string;
  body: string;
  fireDate: Date;
}

function atLocalTime(dateOnly: string, daysBefore: number, hour: number): Date | null {
  const base = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() - daysBefore);
  base.setHours(hour, 0, 0, 0);
  return base;
}

/**
 * Departure reminders for a trip: a packing nudge three days out (9am) and a
 * final-check nudge the evening before (6pm). Times already in the past are
 * dropped, so a trip created two days before departure only gets the
 * final-check reminder.
 */
export function buildTripReminders(trip: TripReminderInput, now: Date = new Date()): TripReminder[] {
  const reminders: { daysBefore: number; hour: number; title: string; body: string }[] = [
    {
      daysBefore: 3,
      hour: 9,
      title: `${trip.destination} in 3 days ✈️`,
      body: 'Time to start packing — open your list and check a few things off.',
    },
    {
      daysBefore: 1,
      hour: 18,
      title: `${trip.destination} tomorrow — final check`,
      body: 'Documents, chargers, medications: make sure the essentials are packed.',
    },
  ];

  return reminders.flatMap((reminder) => {
    const fireDate = atLocalTime(trip.start_date, reminder.daysBefore, reminder.hour);
    if (!fireDate || fireDate.getTime() <= now.getTime()) return [];
    return [{ tripId: trip.id, title: reminder.title, body: reminder.body, fireDate }];
  });
}
