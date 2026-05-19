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
