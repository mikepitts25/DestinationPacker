import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/services/api';
import { cancelTripReminders, scheduleTripReminders } from '@/lib/notifications/tripReminders';
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
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
      scheduleTripReminders(trip).catch(() => {});
    },
  });
}

export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TripCreate>) => tripsApi.update(tripId, data),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: [...TRIPS_KEY, tripId] });
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY });
      scheduleTripReminders(trip).catch(() => {});
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.delete(tripId),
    onSuccess: (_data, tripId) => {
      queryClient.removeQueries({ queryKey: [...TRIPS_KEY, tripId] });
      queryClient.setQueryData(TRIPS_KEY, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((t: any) => t.id !== tripId);
      });
      cancelTripReminders(tripId).catch(() => {});
    },
  });
}
