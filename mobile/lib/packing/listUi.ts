import type { ItemSource, PackingItem, TravelerType } from '@/types';

export type PackingGroup = {
  category: string;
  visibleItems: PackingItem[];
  allItems: PackingItem[];
  packedCount: number;
};

export type RestorePackingItemInput = {
  activity_id: string | null;
  category: string;
  item_name: string;
  quantity: number;
  packed: boolean;
  essential: boolean;
  source: ItemSource;
  traveler_type: TravelerType;
};

export type PackingTravelerSection = {
  travelerType: TravelerType;
  title: string;
  groups: PackingGroup[];
};

const TRAVELER_SECTION_ORDER: { travelerType: TravelerType; title: string }[] = [
  { travelerType: 'male', title: 'Adult (Male)' },
  { travelerType: 'female', title: 'Adult (Female)' },
  { travelerType: 'child', title: 'Children' },
  { travelerType: 'pet', title: 'Pets' },
  { travelerType: 'shared', title: 'Shared' },
];

export function normalizeQuantityInput(value: string): number {
  const quantity = parseInt(value, 10);
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(99, quantity));
}

export function buildPackingGroups(
  categories: string[],
  items: PackingItem[],
  hidePacked: boolean,
): PackingGroup[] {
  return categories.flatMap((category) => {
    const allItems = items.filter((item) => item.category === category);
    const visibleItems = hidePacked ? allItems.filter((item) => !item.packed) : allItems;
    if (visibleItems.length === 0) return [];

    return [{
      category,
      visibleItems,
      allItems,
      packedCount: allItems.filter((item) => item.packed).length,
    }];
  });
}

export function buildPackingTravelerSections(
  categories: string[],
  items: PackingItem[],
  hidePacked: boolean,
): PackingTravelerSection[] {
  return TRAVELER_SECTION_ORDER.flatMap(({ travelerType, title }) => {
    const sectionItems = items.filter((item) => item.traveler_type === travelerType);
    const groups = buildPackingGroups(categories, sectionItems, hidePacked);
    if (groups.length === 0) return [];

    return [{
      travelerType,
      title,
      groups,
    }];
  });
}

export function itemToRestoreInput(item: PackingItem): RestorePackingItemInput {
  return {
    activity_id: item.activity_id,
    category: item.category,
    item_name: item.item_name,
    quantity: item.quantity,
    packed: item.packed,
    essential: item.essential,
    source: item.source,
    traveler_type: item.traveler_type,
  };
}
