import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '@/services/api';
import { tripDestinations } from '@/lib/trips/destinations';
import type { Trip } from '@/types';

export function useWeatherForecast(
  lat: number | null,
  lon: number | null,
  destination: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ['weather', lat, lon, startDate, endDate],
    queryFn: () => weatherApi.getForecast(lat!, lon!, destination, startDate, endDate),
    enabled: lat !== null && lon !== null,
    staleTime: 3 * 60 * 60 * 1000, // 3 hours
  });
}

export function useTripWeatherForecasts(trip: Trip | null | undefined) {
  const destinations = trip ? tripDestinations(trip) : [];

  return useQuery({
    queryKey: [
      'weather',
      'trip',
      trip?.id,
      destinations.map((destination) => [
        destination.destination,
        destination.latitude,
        destination.longitude,
        destination.start_date,
        destination.end_date,
      ]),
    ],
    queryFn: async () => Promise.all(destinations.map(async (destination) => {
      if (destination.latitude === null || destination.longitude === null) {
        return { destination, forecast: null };
      }

      const forecast = await weatherApi.getForecast(
        destination.latitude,
        destination.longitude,
        destination.destination,
        destination.start_date,
        destination.end_date,
      );

      return { destination, forecast };
    })),
    enabled: !!trip,
    staleTime: 3 * 60 * 60 * 1000,
  });
}

export function usePlacesAutocomplete(query: string) {
  return useQuery({
    queryKey: ['places', 'autocomplete', query],
    queryFn: () => weatherApi.autocomplete(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
