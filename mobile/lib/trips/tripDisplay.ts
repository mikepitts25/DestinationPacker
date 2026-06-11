import type { Trip, TripLeg } from '@/types';

function cityLabel(destination: string) {
  return destination.trim();
}

function uniqueRouteStops(legs: TripLeg[], fallbackDestination: string): string[] {
  const stops = legs
    .map((leg) => cityLabel(leg.destination))
    .filter(Boolean);
  const route = stops.length > 0 ? stops : [cityLabel(fallbackDestination)];

  return route.filter((stop, index) => index === 0 || stop !== route[index - 1]);
}

export function formatTripRoute(trip: Pick<Trip, 'destination' | 'legs'>): string {
  return uniqueRouteStops(trip.legs ?? [], trip.destination).join(' → ');
}

export function formatTripDurationBadge(durationDays: number): string {
  const days = Math.max(1, durationDays || 1);
  if (days <= 1) return '1 Day';
  const nights = days - 1;
  return `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
}

function utcDateOnly(date: string | Date) {
  if (date instanceof Date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
}

export function formatTripTimingBadge(
  trip: Pick<Trip, 'start_date' | 'end_date'>,
  now = new Date(),
): string {
  const today = utcDateOnly(now);
  const start = utcDateOnly(trip.start_date);
  const end = utcDateOnly(trip.end_date);
  const dayMs = 24 * 60 * 60 * 1000;

  if (today > end) return 'Completed';
  if (today >= start) return 'Traveling now';

  const daysUntil = Math.round((start - today) / dayMs);
  if (daysUntil <= 0) return 'Starts today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil <= 14) return `In ${daysUntil} days`;

  return `Starts ${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}
