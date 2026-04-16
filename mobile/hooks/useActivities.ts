import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesApi } from '@/services/api';
import { packingKey } from './usePackingList';

export const activitiesKey = (tripId: string) => ['activities', tripId] as const;

export function useActivities(tripId: string) {
  return useQuery({
    queryKey: activitiesKey(tripId),
    queryFn: () => activitiesApi.list(tripId),
    enabled: !!tripId,
  });
}

export function useFetchActivities(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activitiesApi.fetch(tripId),
    onSuccess: (data) => {
      queryClient.setQueryData(activitiesKey(tripId), data);
    },
  });
}

export function useToggleActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, selected }: { activityId: string; selected: boolean }) =>
      activitiesApi.toggle(tripId, activityId, selected),
    onSuccess: (updated) => {
      // Update activity in list
      queryClient.setQueryData(activitiesKey(tripId), (old: any) => {
        if (!old) return old;
        return old.map((a: any) => (a.id === updated.id ? updated : a));
      });
      // Refresh packing list since items may have been added/removed
      queryClient.invalidateQueries({ queryKey: packingKey(tripId) });
    },
  });
}
