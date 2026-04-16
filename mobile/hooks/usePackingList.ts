import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packingApi } from '@/services/api';

export const packingKey = (tripId: string) => ['packing', tripId] as const;

export function usePackingList(tripId: string) {
  return useQuery({
    queryKey: packingKey(tripId),
    queryFn: () => packingApi.getList(tripId),
    enabled: !!tripId,
  });
}

export function useGeneratePackingList(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => packingApi.generate(tripId),
    onSuccess: (data) => {
      queryClient.setQueryData(packingKey(tripId), data);
    },
  });
}

export function useToggleItemPacked(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, packed }: { itemId: string; packed: boolean }) =>
      packingApi.updateItem(tripId, itemId, { packed }),
    onMutate: async ({ itemId, packed }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: packingKey(tripId) });
      const prev = queryClient.getQueryData(packingKey(tripId));
      queryClient.setQueryData(packingKey(tripId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === itemId ? { ...item, packed } : item,
          ),
          packed_items: old.items.filter((i: any) => (i.id === itemId ? packed : i.packed)).length,
        };
      });
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(packingKey(tripId), context?.prev);
    },
  });
}

export function useAddPackingItem(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; item_name: string; quantity: number; essential: boolean }) =>
      packingApi.addItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packingKey(tripId) });
    },
  });
}

export function useDeletePackingItem(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => packingApi.deleteItem(tripId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packingKey(tripId) });
    },
  });
}
