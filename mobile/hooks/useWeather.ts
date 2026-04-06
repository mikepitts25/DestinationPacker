import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '@/services/api';

export function useWeatherForecast(lat: number | null, lon: number | null, destination: string) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => weatherApi.getForecast(lat!, lon!, destination),
    enabled: lat !== null && lon !== null,
    staleTime: 3 * 60 * 60 * 1000, // 3 hours
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
