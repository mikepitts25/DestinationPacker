import type { Trip, TripLeg } from '@/types';

export type TripDestination = {
  destination: string;
  latitude: number | null;
  longitude: number | null;
  country_code: string | null;
  start_date: string;
  end_date: string;
};

function normalizedDestination(destination: string) {
  return destination.trim().replace(/\s+/g, ' ').toLowerCase();
}

function destinationFromLeg(leg: TripLeg): TripDestination | null {
  const destination = leg.destination.trim();
  if (!destination) return null;

  return {
    destination,
    latitude: leg.latitude ?? null,
    longitude: leg.longitude ?? null,
    country_code: leg.country_code ?? null,
    start_date: leg.start_date,
    end_date: leg.end_date,
  };
}

function primaryDestination(trip: Pick<Trip, 'destination' | 'latitude' | 'longitude' | 'country_code' | 'start_date' | 'end_date'>): TripDestination | null {
  const destination = trip.destination.trim();
  if (!destination) return null;

  return {
    destination,
    latitude: trip.latitude ?? null,
    longitude: trip.longitude ?? null,
    country_code: trip.country_code ?? null,
    start_date: trip.start_date,
    end_date: trip.end_date,
  };
}

export function tripDestinations(
  trip: Pick<Trip, 'destination' | 'latitude' | 'longitude' | 'country_code' | 'start_date' | 'end_date' | 'legs'>,
  options: { dedupe?: boolean } = {},
): TripDestination[] {
  const destinations = (trip.legs ?? [])
    .map(destinationFromLeg)
    .filter((destination): destination is TripDestination => destination !== null);
  const route = destinations.length > 0
    ? destinations
    : [primaryDestination(trip)].filter((destination): destination is TripDestination => destination !== null);

  if (!options.dedupe) return route;

  const seen = new Set<string>();
  return route.filter((destination) => {
    const key = normalizedDestination(destination.destination);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
