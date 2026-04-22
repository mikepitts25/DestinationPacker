import { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Text, Checkbox, FAB, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { usePackingList, useToggleItemPacked, useGeneratePackingList, useAddPackingItem, useDeletePackingItem } from '@/hooks/usePackingList';
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
  const { mutate: addItem, isPending: isAdding } = useAddPackingItem(tripId);
  const { mutate: deleteItem } = useDeletePackingItem(tripId);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Misc');
  const [newItemQty, setNewItemQty] = useState('1');

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

  const handleDeleteItem = (item: PackingItem) => {
    Alert.alert('Remove Item', `Remove "${item.item_name}" from packing list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem(item.id) },
    ]);
  };

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    addItem(
      { category: newItemCategory, item_name: name, quantity: parseInt(newItemQty) || 1, essential: false },
      {
        onSuccess: () => {
          setNewItemName('');
          setNewItemQty('1');
          setShowAddModal(false);
        },
      },
    );
  };

  const categories = packingList?.categories ?? [];
  const allCategories = [...new Set([...categories, 'Clothing', 'Electronics', 'Documents', 'Toiletries', 'Health', 'Gear', 'Footwear', 'Misc'])];

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
            onDeleteItem={handleDeleteItem}
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

      <FAB icon="plus" style={styles.fab} onPress={() => setShowAddModal(true)} color={Colors.surface} />

      {/* Add Item Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item</Text>

            <Text style={styles.inputLabel}>Item name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Power adapter"
              placeholderTextColor={Colors.muted}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPicker}>
              {allCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryOption, newItemCategory === cat && styles.categoryOptionSelected]}
                  onPress={() => setNewItemCategory(cat)}
                >
                  <Text style={[styles.categoryOptionText, newItemCategory === cat && styles.categoryOptionTextSelected]}>
                    {CATEGORY_EMOJI[cat] ?? '📦'} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={[styles.textInput, { width: 60 }]}
              keyboardType="number-pad"
              value={newItemQty}
              onChangeText={setNewItemQty}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, (!newItemName.trim() || isAdding) && styles.addBtnDisabled]}
                onPress={handleAddItem}
                disabled={!newItemName.trim() || isAdding}
              >
                <Text style={styles.addBtnText}>{isAdding ? 'Adding...' : 'Add Item'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CategorySection({
  category, items, collapsed, onToggleCollapse, onToggleItem, onDeleteItem,
}: {
  category: string;
  items: PackingItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleItem: (id: string, packed: boolean) => void;
  onDeleteItem: (item: PackingItem) => void;
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
          onLongPress={() => onDeleteItem(item)}
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
          <TouchableOpacity
            onPress={() => onDeleteItem(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteItemBtn}
          >
            <Text style={styles.deleteItemText}>✕</Text>
          </TouchableOpacity>
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
  deleteItemBtn: { padding: Spacing.sm },
  deleteItemText: { fontSize: 14, color: Colors.muted },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, color: Colors.muted, marginBottom: 4, marginTop: Spacing.sm },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: 16,
    color: Colors.onSurface,
    backgroundColor: Colors.background,
  },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  categoryOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: { fontSize: 12, color: Colors.onSurface },
  categoryOptionTextSelected: { color: Colors.surface },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelBtnText: { ...Typography.body, color: Colors.muted },
  addBtn: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { ...Typography.body, color: Colors.surface, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { ...Typography.body, color: Colors.muted, marginBottom: Spacing.md },
});
