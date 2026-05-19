import {
  buildPackingGroups,
  buildPackingTravelerSections,
  itemToRestoreInput,
  normalizeQuantityInput,
} from '../listUi';
import type { PackingItem } from '@/types';

function item(overrides: Partial<PackingItem>): PackingItem {
  return {
    id: 'item-1',
    trip_id: 'trip-1',
    activity_id: null,
    category: 'Gear',
    item_name: 'Day pack',
    quantity: 1,
    packed: false,
    essential: false,
    source: 'rule_engine',
    traveler_type: 'shared',
    ...overrides,
  };
}

describe('packing list UI helpers', () => {
  it('hides packed items and drops empty categories when requested', () => {
    const items = [
      item({ id: 'a', category: 'Documents', item_name: 'Passport', packed: true }),
      item({ id: 'b', category: 'Gear', item_name: 'Day pack', packed: false }),
      item({ id: 'c', category: 'Gear', item_name: 'Umbrella', packed: true }),
    ];

    expect(buildPackingGroups(['Documents', 'Gear'], items, true)).toEqual([
      {
        category: 'Gear',
        visibleItems: [items[1]],
        allItems: [items[1], items[2]],
        packedCount: 1,
      },
    ]);
  });

  it('keeps packed items and category totals when hide packed is disabled', () => {
    const items = [
      item({ id: 'a', category: 'Documents', item_name: 'Passport', packed: true }),
      item({ id: 'b', category: 'Gear', item_name: 'Day pack', packed: false }),
    ];

    expect(buildPackingGroups(['Documents', 'Gear'], items, false)).toEqual([
      {
        category: 'Documents',
        visibleItems: [items[0]],
        allItems: [items[0]],
        packedCount: 1,
      },
      {
        category: 'Gear',
        visibleItems: [items[1]],
        allItems: [items[1]],
        packedCount: 0,
      },
    ]);
  });

  it('normalizes quantity text into the supported item quantity range', () => {
    expect(normalizeQuantityInput('')).toBe(1);
    expect(normalizeQuantityInput('0')).toBe(1);
    expect(normalizeQuantityInput('7')).toBe(7);
    expect(normalizeQuantityInput('150')).toBe(99);
  });

  it('preserves generated item metadata for undo delete restores', () => {
    expect(itemToRestoreInput(item({
      id: 'generated-1',
      activity_id: 'activity-1',
      category: 'Footwear',
      item_name: 'Hiking socks',
      quantity: 2,
      packed: true,
      essential: true,
      source: 'activity',
      traveler_type: 'child',
    }))).toEqual({
      activity_id: 'activity-1',
      category: 'Footwear',
      item_name: 'Hiking socks',
      quantity: 2,
      packed: true,
      essential: true,
      source: 'activity',
      traveler_type: 'child',
    });
  });

  it('builds traveler sections with category groups inside each traveler type', () => {
    const items = [
      item({ id: 'a', category: 'Clothing', item_name: 'Razors / shaving kit', traveler_type: 'male' }),
      item({ id: 'b', category: 'Clothing', item_name: 'Dresses / skirts', traveler_type: 'female' }),
      item({ id: 'c', category: 'Health', item_name: 'Kids sunscreen', traveler_type: 'child' }),
      item({ id: 'd', category: 'Gear', item_name: 'Pet leash', traveler_type: 'pet' }),
      item({ id: 'e', category: 'Documents', item_name: 'Reservation confirmations', traveler_type: 'shared' }),
    ];

    expect(buildPackingTravelerSections(['Clothing', 'Health', 'Gear', 'Documents'], items, false).map((section) => ({
      travelerType: section.travelerType,
      title: section.title,
      categories: section.groups.map((group) => group.category),
    }))).toEqual([
      { travelerType: 'male', title: 'Adult (Male)', categories: ['Clothing'] },
      { travelerType: 'female', title: 'Adult (Female)', categories: ['Clothing'] },
      { travelerType: 'child', title: 'Children', categories: ['Health'] },
      { travelerType: 'pet', title: 'Pets', categories: ['Gear'] },
      { travelerType: 'shared', title: 'Shared', categories: ['Documents'] },
    ]);
  });
});
