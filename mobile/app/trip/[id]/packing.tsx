import { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Checkbox, Chip, FAB, Badge, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { usePackingList, useToggleItemPacked, useGeneratePackingList } from '@/hooks/usePackingList';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { PackingItem } from '@/types';

const CATEGORY_EMOJI: Record<string, string> = {
  Clothing: '👕',
  Electronics: '🔌',
  Documents: '📄',
  Toiletries: '🧴',
  Health: '💊',
  Gear: '🎒',
  Misc: '📦',
  Footwear: '👟',
  default: '📦',
};

export default function PackingScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: packingList, isLoading } = usePackingList(tripId);
  const { mutate: togglePacked } = useToggleItemPacked(tripId);
  const { mutate: regenerate, isPending: isRegenerating } = useGeneratePackingList(tripId);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  const groupedItems = packingList?.categories.map((category) => ({
    category,
    items: packingList.items.filter((i) => i.category === category),
  })) ?? [];

  const packedCount = packingList?.packed_items ?? 0;
  const totalCount = packingList?.total_items ?? 0;
  const progressPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Progress header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {packedCount}/{totalCount} packed ({progressPct}%)
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <FlatList
        data={groupedItems}
        keyExtractor={(g) => g.category}
        contentContainerStyle={styles.list}
        renderItem={({ item: { category, items } }) => (
          <CategorySection
            category={category}
            items={items}
            collapsed={collapsedCategories.has(category)}
            onToggleCollapse={() => toggleCategory(category)}
            onToggleItem={(itemId, packed) => togglePacked({ itemId, packed })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No packing list yet.</Text>
            <Button onPress={() => regenerate()} loading={isRegenerating}>
              Generate Now
            </Button>
          </View>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </View>
  );
}

function CategorySection({
  category, items, collapsed, onToggleCollapse, onToggleItem,
}: {
  category: string;
  items: PackingItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleItem: (id: string, packed: boolean) => void;
}) {
  const emoji = CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.default;
  const packedInCategory = items.filter((i) => i.packed).length;

  return (
    <View style={styles.category}>
      <TouchableOpacity style={styles.categoryHeader} onPress={onToggleCollapse}>
        <Text style={styles.categoryTitle}>
          {emoji} {category}
        </Text>
        <View style={styles.categoryRight}>
          <Text style={styles.categoryCount}>{packedInCategory}/{items.length}</Text>
          <Text style={styles.chevron}>{collapsed ? '›' : '⌄'}</Text>
        </View>
      </TouchableOpacity>

      {!collapsed && items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.item, item.packed && styles.itemPacked]}
          onPress={() => onToggleItem(item.id, !item.packed)}
        >
          <Checkbox.Android
            status={item.packed ? 'checked' : 'unchecked'}
            onPress={() => onToggleItem(item.id, !item.packed)}
            color={Colors.primary}
          />
          <View style={styles.itemContent}>
            <Text style={[styles.itemName, item.packed && styles.itemNamePacked]}>
              {item.item_name}
              {item.quantity > 1 && <Text style={styles.quantity}> ×{item.quantity}</Text>}
            </Text>
            {item.essential && !item.packed && (
              <Text style={styles.essentialBadge}>★</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressHeader: { backgroundColor: Colors.surface, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  progressText: { ...Typography.label, color: Colors.muted, marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
  list: { padding: Spacing.md },
  category: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryTitle: { ...Typography.h3, color: Colors.onSurface },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  categoryCount: { ...Typography.caption, color: Colors.muted },
  chevron: { fontSize: 18, color: Colors.muted },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  itemPacked: { backgroundColor: Colors.background },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  itemName: { ...Typography.body, color: Colors.onSurface, flex: 1 },
  itemNamePacked: { textDecorationLine: 'line-through', color: Colors.muted },
  quantity: { ...Typography.caption, color: Colors.muted },
  essentialBadge: { fontSize: 14, color: Colors.premiumGold },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { ...Typography.body, color: Colors.muted, marginBottom: Spacing.md },
});
