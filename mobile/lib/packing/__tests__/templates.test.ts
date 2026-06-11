/* eslint-disable import/first */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

import {
  createPackingTemplateFromList,
  templateItemsToAdd,
  type PackingTemplate,
} from '../templates';
import type { PackingItem, PackingList } from '@/types';

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

function list(items: PackingItem[]): PackingList {
  return {
    trip_id: 'trip-1',
    items,
    categories: [...new Set(items.map((packingItem) => packingItem.category))],
    total_items: items.length,
    packed_items: items.filter((packingItem) => packingItem.packed).length,
  };
}

describe('packing templates', () => {
  it('creates a reusable template from a packing list', () => {
    const template = createPackingTemplateFromList(
      '  Japan summer  ',
      list([
        item({ id: 'a', category: 'Documents', item_name: 'Passport', essential: true }),
        item({ id: 'b', category: 'Gear', item_name: 'Day pack', quantity: 2, traveler_type: 'shared' }),
      ]),
      new Date('2026-06-03T12:00:00Z'),
    );

    expect(template).toEqual({
      id: 'template-1780488000000',
      name: 'Japan summer',
      created_at: '2026-06-03T12:00:00.000Z',
      item_count: 2,
      items: [
        { category: 'Documents', item_name: 'Passport', quantity: 1, essential: true, traveler_type: 'shared' },
        { category: 'Gear', item_name: 'Day pack', quantity: 2, essential: false, traveler_type: 'shared' },
      ],
    });
  });

  it('dedupes template items by traveler, category, and name', () => {
    const template = createPackingTemplateFromList(
      '',
      list([
        item({ id: 'a', item_name: 'Day pack' }),
        item({ id: 'b', item_name: ' day   pack ' }),
        item({ id: 'c', item_name: 'Day pack', traveler_type: 'child' }),
      ]),
      new Date('2026-06-03T12:00:00Z'),
    );

    expect(template.name).toBe('Packing template');
    expect(template.items).toHaveLength(2);
  });

  it('filters template items that already exist on the trip', () => {
    const template: PackingTemplate = {
      id: 'template-1',
      name: 'Beach',
      created_at: '2026-06-03T12:00:00.000Z',
      item_count: 2,
      items: [
        { category: 'Gear', item_name: 'Day pack', quantity: 1, essential: false, traveler_type: 'shared' },
        { category: 'Health', item_name: 'Sunscreen', quantity: 1, essential: true, traveler_type: 'shared' },
      ],
    };

    expect(templateItemsToAdd(template, [
      item({ category: 'Gear', item_name: 'day pack', traveler_type: 'shared' }),
    ])).toEqual([
      { category: 'Health', item_name: 'Sunscreen', quantity: 1, essential: true, traveler_type: 'shared' },
    ]);
  });
});
