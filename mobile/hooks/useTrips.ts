import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/services/api';
import type { TripCreate } from '@/types';

export const TRIPS_KEY = ['trips'] as const;

export function useTrips() {
  return useQuery({
    queryKey: TRIPS_KEY,
    queryFn: tripsApi.list,
  });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: [...TRIPS_KEY, tripId],
    queryFn: () => tripsApi.get(tripId),
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TripCreate) => tripsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });
}

export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TripCreate>) => tripsApi.update(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TRIPS_KEY, tripId] });
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.delete(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
    },
  });
}
