import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packingApi } from '@/services/api';
import type { RestorePackingItemInput } from '@/lib/packing/listUi';

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

export function useSetPackingItemsPacked(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemIds, packed }: { itemIds: string[]; packed: boolean }) =>
      packingApi.setItemsPacked(tripId, itemIds, packed),
    onMutate: async ({ itemIds, packed }) => {
      await queryClient.cancelQueries({ queryKey: packingKey(tripId) });
      const prev = queryClient.getQueryData(packingKey(tripId));
      const itemIdSet = new Set(itemIds);
      queryClient.setQueryData(packingKey(tripId), (old: any) => {
        if (!old) return old;
        const items = old.items.map((item: any) =>
          itemIdSet.has(item.id) ? { ...item, packed } : item,
        );
        return {
          ...old,
          items,
          packed_items: items.filter((item: any) => item.packed).length,
        };
      });
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(packingKey(tripId), context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: packingKey(tripId) });
    },
  });
}

export function useUpdatePackingItem(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      packingApi.updateItem(tripId, itemId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packingKey(tripId) });
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

export function useRestorePackingItem(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RestorePackingItemInput) => packingApi.restoreItem(tripId, data),
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
