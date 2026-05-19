import { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import {
  usePackingList,
  useToggleItemPacked,
  useGeneratePackingList,
  useAddPackingItem,
  useDeletePackingItem,
  useRestorePackingItem,
  useSetPackingItemsPacked,
  useUpdatePackingItem,
} from '@/hooks/usePackingList';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { buildPackingGroups, itemToRestoreInput, normalizeQuantityInput } from '@/lib/packing/listUi';
import type { PackingItem } from '@/types';

const CATEGORY_EMOJI: Record<string, string> = {
  Clothing: '👕', Electronics: '🔌', Documents: '📄', Toiletries: '🧴',
  Health: '💊', Gear: '🎒', Misc: '📦', Footwear: '👟', default: '📦',
};

export default function PackingScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { data: packingList, isLoading } = usePackingList(tripId);
  const { mutate: togglePacked } = useToggleItemPacked(tripId);
  const { mutate: regenerate, isPending: isRegenerating } = useGeneratePackingList(tripId);
  const { mutate: addItem, isPending: isAdding } = useAddPackingItem(tripId);
  const { mutate: deleteItem } = useDeletePackingItem(tripId);
  const { mutate: restoreItem, isPending: isRestoring } = useRestorePackingItem(tripId);
  const { mutate: setItemsPacked } = useSetPackingItemsPacked(tripId);
  const { mutate: updateItem, isPending: isUpdatingItem } = useUpdatePackingItem(tripId);

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [hidePacked, setHidePacked] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState<PackingItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Misc');
  const [newItemQty, setNewItemQty] = useState('1');

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleDeleteItem = (item: PackingItem) => {
    Alert.alert('Remove Item', `Remove "${item.item_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem(item.id, { onSuccess: () => setRecentlyDeleted(item) }) },
    ]);
  };

  const handleRestoreDeleted = () => {
    if (!recentlyDeleted) return;
    restoreItem(itemToRestoreInput(recentlyDeleted), { onSuccess: () => setRecentlyDeleted(null) });
  };

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    addItem({ category: newItemCategory, item_name: name, quantity: normalizeQuantityInput(newItemQty), essential: false }, {
      onSuccess: () => { setNewItemName(''); setNewItemQty('1'); setShowAddModal(false); },
    });
  };

  const categories = packingList?.categories ?? [];
  const allCategories = [...new Set([...categories, 'Clothing', 'Electronics', 'Documents', 'Toiletries', 'Health', 'Gear', 'Footwear', 'Misc'])];
  const groupedItems = packingList ? buildPackingGroups(packingList.categories, packingList.items, hidePacked) : [];
  const packedCount = packingList?.packed_items ?? 0;
  const totalCount = packingList?.total_items ?? 0;
  const progressPct = totalCount > 0 ? packedCount / totalCount : 0;

  return (
    <View style={styles.container}>
      {/* Progress card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressLabel}>{packedCount} of {totalCount} items packed</Text>
          <Text style={styles.progressPct}>{Math.round(progressPct * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
        <TouchableOpacity style={styles.hidePackedRow} onPress={() => setHidePacked(v => !v)}>
          <View style={[styles.miniCheck, hidePacked && styles.miniCheckActive]}>
            {hidePacked && <Text style={styles.miniCheckMark}>✓</Text>}
          </View>
          <Text style={styles.hidePackedText}>Hide packed items</Text>
        </TouchableOpacity>
      </View>

      {/* AI banner */}
      <TouchableOpacity onPress={() => regenerate()} style={styles.aiBannerWrap} activeOpacity={0.85}>
        <LinearGradient colors={[Colors.gold, Colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiBanner}>
          <Text style={styles.aiBannerText}>✨ AI Smart Packing</Text>
          <View style={styles.aiBannerBtn}>
            {isRegenerating
              ? <ActivityIndicator size={14} color={Colors.gold} />
              : <Text style={styles.aiBannerBtnText}>Regenerate</Text>
            }
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {recentlyDeleted && (
        <View style={styles.undoBanner}>
          <Text style={styles.undoText} numberOfLines={1}>Removed {recentlyDeleted.item_name}</Text>
          <Button compact onPress={handleRestoreDeleted} loading={isRestoring} textColor={Colors.primary}>Undo</Button>
        </View>
      )}

      <FlatList
        data={groupedItems}
        keyExtractor={(g) => g.category}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: { category, visibleItems, allItems, packedCount: packedInCat } }) => (
          <CategorySection
            category={category}
            visibleItems={visibleItems}
            allItems={allItems}
            packedCount={packedInCat}
            collapsed={collapsedCategories.has(category)}
            onToggleCollapse={() => toggleCategory(category)}
            onToggleItem={(itemId, packed) => togglePacked({ itemId, packed })}
            onSetCategoryPacked={(packed) => setItemsPacked({ itemIds: allItems.map(i => i.id), packed })}
            onUpdateQuantity={(item, qty) => updateItem({ itemId: item.id, quantity: normalizeQuantityInput(String(qty)) })}
            onDeleteItem={handleDeleteItem}
            quantityDisabled={isUpdatingItem}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{hidePacked && totalCount > 0 ? 'Everything is packed! 🎉' : 'No packing list yet.'}</Text>
            {!hidePacked && <Button onPress={() => regenerate()} loading={isRegenerating} textColor={Colors.primary}>Generate List</Button>}
          </View>
        }
        ListFooterComponent={<View style={{ height: 90 }} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <LinearGradient colors={[Colors.gold, Colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

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
            <TextInput style={[styles.textInput, { width: 70 }]} keyboardType="number-pad" value={newItemQty} onChangeText={setNewItemQty} />
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
  category, visibleItems, allItems, packedCount, collapsed,
  onToggleCollapse, onToggleItem, onSetCategoryPacked, onUpdateQuantity, onDeleteItem, quantityDisabled,
}: {
  category: string; visibleItems: PackingItem[]; allItems: PackingItem[]; packedCount: number;
  collapsed: boolean; onToggleCollapse: () => void; onToggleItem: (id: string, packed: boolean) => void;
  onSetCategoryPacked: (packed: boolean) => void; onUpdateQuantity: (item: PackingItem, qty: number) => void;
  onDeleteItem: (item: PackingItem) => void; quantityDisabled: boolean;
}) {
  const emoji = CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.default;
  const allPacked = allItems.length > 0 && packedCount === allItems.length;

  return (
    <View style={styles.catCard}>
      <TouchableOpacity style={styles.catHeader} onPress={onToggleCollapse} activeOpacity={0.8}>
        <Text style={styles.catTitle}>{emoji} {category}</Text>
        <View style={styles.catRight}>
          <TouchableOpacity
            style={styles.packAllBtn}
            onPress={(e) => { e.stopPropagation(); onSetCategoryPacked(!allPacked); }}
          >
            <Text style={styles.packAllText}>{allPacked ? 'Unpack' : 'Pack all'}</Text>
          </TouchableOpacity>
          <Text style={styles.catCount}>{packedCount}/{allItems.length}</Text>
          <Text style={styles.chevron}>{collapsed ? '›' : '⌄'}</Text>
        </View>
      </TouchableOpacity>

      {!collapsed && visibleItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.itemRow, item.packed && styles.itemRowPacked]}
          onPress={() => onToggleItem(item.id, !item.packed)}
          onLongPress={() => onDeleteItem(item)}
          activeOpacity={0.75}
        >
          {/* Custom gold/teal checkbox */}
          <View style={[styles.checkbox, item.packed ? styles.checkboxPacked : styles.checkboxUnpacked]}>
            {item.packed && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemName, item.packed && styles.itemNamePacked]}>
              {item.item_name}
              {item.quantity > 1 && <Text style={styles.qty}> ×{item.quantity}</Text>}
            </Text>
            {item.essential && !item.packed && <Text style={styles.essentialStar}>★</Text>}
          </View>
          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={() => onUpdateQuantity(item, item.quantity - 1)}
              disabled={quantityDisabled || item.quantity <= 1}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQuantity(item, item.quantity + 1)} disabled={quantityDisabled}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => onDeleteItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 16,
    padding: Spacing.md,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  progressPct: { fontSize: 13, fontWeight: '700', color: Colors.gold },
  progressTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  hidePackedRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: 8 },
  miniCheck: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  miniCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  miniCheckMark: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  hidePackedText: { fontSize: 13, color: Colors.onSurface },
  aiBannerWrap: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: 12, overflow: 'hidden' },
  aiBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  aiBannerText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  aiBannerBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  aiBannerBtnText: { fontSize: 12, fontWeight: '700', color: Colors.gold },
  undoBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(10,147,150,0.08)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md, borderRadius: 10, marginBottom: Spacing.xs,
  },
  undoText: { fontSize: 13, color: Colors.onSurface, flex: 1 },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  catCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  packAllBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: Spacing.sm, paddingVertical: 3, backgroundColor: Colors.background,
  },
  packAllText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  catCount: { fontSize: 12, color: Colors.muted },
  chevron: { fontSize: 18, color: Colors.muted },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.background, minHeight: 48 },
  itemRowPacked: { backgroundColor: '#F8FAFB' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, marginLeft: Spacing.md, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxPacked: { backgroundColor: Colors.gold, borderWidth: 0 },
  checkboxUnpacked: { borderWidth: 1.5, borderColor: Colors.border, backgroundColor: 'transparent' },
  checkMark: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12 },
  itemName: { fontSize: 14, color: Colors.onSurface, flex: 1 },
  itemNamePacked: { textDecorationLine: 'line-through', color: Colors.muted },
  qty: { fontSize: 12, color: Colors.muted },
  essentialStar: { fontSize: 14, color: Colors.gold },
  qtyControls: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, overflow: 'hidden', marginLeft: Spacing.sm,
  },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  qtyVal: { width: 26, textAlign: 'center', fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  deleteBtn: { padding: Spacing.sm },
  deleteText: { fontSize: 13, color: Colors.muted },
  fab: {
    position: 'absolute', bottom: 20, right: Spacing.lg,
    borderRadius: 28, overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabGradient: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  fabText: { fontSize: 28, color: '#FFFFFF', fontWeight: '300', lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, marginBottom: 4, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: Spacing.sm, fontSize: 15, color: Colors.onSurface, backgroundColor: Colors.background,
  },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  categoryOption: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  categoryOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryOptionText: { fontSize: 12, color: Colors.onSurface },
  categoryOptionTextSelected: { color: Colors.surface },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelBtnText: { fontSize: 15, color: Colors.muted },
  addBtn: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 15, color: Colors.surface, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: 15, color: Colors.muted, marginBottom: Spacing.md },
});
