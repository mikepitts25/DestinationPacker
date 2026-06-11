import type { Trip } from '@/types';

export type PrepTask = {
  title: string;
  detail: string;
  timing: string;
};

function utcDateOnly(date: string | Date) {
  if (date instanceof Date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
}

function daysUntilTripStart(trip: Pick<Trip, 'start_date'>, now: Date) {
  return Math.round((utcDateOnly(trip.start_date) - utcDateOnly(now)) / (24 * 60 * 60 * 1000));
}

function taskTiming(daysUntil: number) {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil <= 3) return 'Next 3 days';
  if (daysUntil <= 7) return 'This week';
  if (daysUntil <= 21) return 'Soon';
  return 'Plan ahead';
}

export function buildTripPrepTasks(trip: Trip, now = new Date()): PrepTask[] {
  const daysUntil = daysUntilTripStart(trip, now);
  const timing = taskTiming(daysUntil);
  const tasks: PrepTask[] = [
    {
      title: 'Confirm bookings and opening days',
      detail: 'Check timed entry, class reservations, closure days, public holidays, and cancellation windows.',
      timing,
    },
    {
      title: 'Check documents and entry needs',
      detail: trip.country_code
        ? 'Confirm passport, visa, ID, insurance, vaccination, and entry requirements for the destination.'
        : 'Confirm passport, visa, ID, insurance, vaccination, and entry requirements for the trip.',
      timing: daysUntil <= 21 ? timing : 'Plan ahead',
    },
    {
      title: 'Review buy-and-bring-home rules',
      detail: 'Before buying food, alcohol, plants, wood, shells, or animal products, verify customs/import rules.',
      timing: 'Before shopping',
    },
  ];

  if (trip.travel_method === 'flight') {
    tasks.push({
      title: 'Check baggage and airport rules',
      detail: 'Confirm bag size, liquids, batteries, medicine, and checked-luggage rules before packing.',
      timing,
    });
  }

  if (trip.children > 0) {
    tasks.push({
      title: 'Prep child travel essentials',
      detail: 'Confirm child documents, snacks, comfort items, medicine, and downtime entertainment.',
      timing,
    });
  }

  if (trip.pets > 0) {
    tasks.push({
      title: 'Confirm pet travel requirements',
      detail: 'Check pet documents, carrier rules, accommodation policies, food, medication, and cleanup supplies.',
      timing: 'Plan ahead',
    });
  }

  if (daysUntil <= 7) {
    tasks.push({
      title: 'Do the final weather pass',
      detail: 'Refresh the forecast and adjust shoes, layers, rain gear, sunscreen, and activity plans.',
      timing,
    });
  }

  if (daysUntil <= 3) {
    tasks.push({
      title: 'Finish the last-mile pack',
      detail: 'Charge devices, refill prescriptions, download documents, and pack chargers, adapters, and payment backup.',
      timing,
    });
  }

  return tasks.slice(0, 6);
}
