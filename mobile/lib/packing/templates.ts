import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PackingItem, PackingList, TravelerType } from '@/types';

const STORAGE_KEY = 'destinationpacker.packingTemplates.v1';

export type PackingTemplateItem = {
  category: string;
  item_name: string;
  quantity: number;
  essential: boolean;
  traveler_type: TravelerType;
};

export type PackingTemplate = {
  id: string;
  name: string;
  created_at: string;
  item_count: number;
  items: PackingTemplateItem[];
};

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function itemKey(item: Pick<PackingTemplateItem, 'category' | 'item_name' | 'traveler_type'>) {
  return `${item.traveler_type}:${item.category.trim().toLowerCase()}:${normalizedName(item.item_name)}`;
}

function normalizeTemplateName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return trimmed || 'Packing template';
}

function normalizeTemplateItem(item: PackingItem): PackingTemplateItem {
  return {
    category: item.category,
    item_name: item.item_name,
    quantity: Math.max(1, Math.min(99, item.quantity || 1)),
    essential: item.essential,
    traveler_type: item.traveler_type,
  };
}

function uniqueTemplateItems(items: PackingTemplateItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = itemKey(item);
    if (!item.item_name.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createPackingTemplateFromList(
  name: string,
  packingList: PackingList,
  now = new Date(),
): PackingTemplate {
  const items = uniqueTemplateItems(packingList.items.map(normalizeTemplateItem));

  return {
    id: `template-${now.getTime()}`,
    name: normalizeTemplateName(name),
    created_at: now.toISOString(),
    item_count: items.length,
    items,
  };
}

export function templateItemsToAdd(
  template: PackingTemplate,
  existingItems: PackingItem[],
): PackingTemplateItem[] {
  const existing = new Set(existingItems.map(itemKey));
  return template.items.filter((item) => !existing.has(itemKey(item)));
}

function normalizeStoredTemplates(value: unknown): PackingTemplate[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((template: unknown): PackingTemplate[] => {
    if (!template || typeof template !== 'object') return [];
    const record = template as Record<string, unknown>;
    const rawItems = Array.isArray(record.items) ? record.items : [];
    const items = rawItems.flatMap((item: unknown): PackingTemplateItem[] => {
      if (!item || typeof item !== 'object') return [];
      const itemRecord = item as Record<string, unknown>;
      if (typeof itemRecord.item_name !== 'string' || typeof itemRecord.category !== 'string') return [];
      const traveler = typeof itemRecord.traveler_type === 'string'
        ? itemRecord.traveler_type as TravelerType
        : 'shared';
      return [{
        category: itemRecord.category,
        item_name: itemRecord.item_name,
        quantity: Math.max(1, Math.min(99, Number(itemRecord.quantity) || 1)),
        essential: Boolean(itemRecord.essential),
        traveler_type: traveler,
      }];
    });

    return [{
      id: typeof record.id === 'string' ? record.id : `template-${Date.now()}`,
      name: typeof record.name === 'string' ? normalizeTemplateName(record.name) : 'Packing template',
      created_at: typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
      item_count: items.length,
      items: uniqueTemplateItems(items),
    }];
  });
}

export async function loadPackingTemplates(): Promise<PackingTemplate[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return normalizeStoredTemplates(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function savePackingTemplate(template: PackingTemplate): Promise<PackingTemplate[]> {
  const templates = await loadPackingTemplates();
  const next = [template, ...templates.filter((item) => item.id !== template.id)].slice(0, 20);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deletePackingTemplate(templateId: string): Promise<PackingTemplate[]> {
  const templates = await loadPackingTemplates();
  const next = templates.filter((template) => template.id !== templateId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
