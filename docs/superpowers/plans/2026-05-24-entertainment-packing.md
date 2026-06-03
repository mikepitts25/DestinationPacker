# Entertainment Packing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Entertainment category to generated packing lists.

**Architecture:** Add the category as always-present, non-essential rule-engine recommendations. Keep mobile and backend item names aligned so locally generated and server-generated packing lists match. The packing UI only needs category metadata so generated Entertainment items render with a distinct tile and can be selected manually in the add-item modal.

**Tech Stack:** Expo React Native, TypeScript/Jest, FastAPI/Python, pytest.

---

### Task 1: Mobile Rule Engine Entertainment Items

**Files:**
- Modify: `mobile/lib/packing/__tests__/ruleEngine.test.ts`
- Modify: `mobile/lib/packing/ruleEngine.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `mobile/lib/packing/__tests__/ruleEngine.test.ts` after the existing "always includes passport or ID and phone charger" test:

```typescript
  it('adds optional entertainment items for downtime', () => {
    const items = generatePackingList(baseTrip);

    const book = items.find((item) => item.item_name === 'Favorite book or e-reader');
    const game = items.find((item) => item.item_name === 'Travel-size game / deck of cards');
    const downloads = items.find((item) => item.item_name === 'Downloaded movies, podcasts, or playlists');

    expect(book).toMatchObject({
      category: 'Entertainment',
      quantity: 1,
      essential: false,
      source: 'rule_engine',
      traveler_type: 'shared',
    });
    expect(game).toMatchObject({ category: 'Entertainment', essential: false });
    expect(downloads).toMatchObject({ category: 'Entertainment', essential: false });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npm test -- --runTestsByPath lib/packing/__tests__/ruleEngine.test.ts --runInBand`

Expected: FAIL because `Favorite book or e-reader` is undefined in generated recommendations.

- [ ] **Step 3: Write minimal implementation**

In `mobile/lib/packing/ruleEngine.ts`, add these optional shared rules to `ALWAYS_RULES` after `Small day bag / backpack`:

```typescript
  ['Entertainment', 'Favorite book or e-reader', 1, false],
  ['Entertainment', 'Travel-size game / deck of cards', 1, false],
  ['Entertainment', 'Downloaded movies, podcasts, or playlists', 1, false],
  ['Entertainment', 'Journal or sketchbook', 1, false],
  ['Entertainment', 'Pen', 1, false],
  ['Entertainment', 'Offline maps / saved trip notes', 1, false],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npm test -- --runTestsByPath lib/packing/__tests__/ruleEngine.test.ts --runInBand`

Expected: PASS.

### Task 2: Backend Rule Engine Entertainment Items

**Files:**
- Modify: `backend/tests/test_rule_engine.py`
- Modify: `backend/app/services/rule_engine.py`

- [ ] **Step 1: Write the failing test**

Add this test in `backend/tests/test_rule_engine.py` after `test_always_items_present`:

```python
    def test_optional_entertainment_items_present(self):
        trip = make_trip()
        items = generate_packing_list(trip)
        by_name = {i.item_name: i for i in items}

        book = by_name["Favorite book or e-reader"]
        game = by_name["Travel-size game / deck of cards"]
        downloads = by_name["Downloaded movies, podcasts, or playlists"]

        assert book.category == "Entertainment"
        assert book.quantity == 1
        assert book.essential is False
        assert book.source == "rule_engine"
        assert game.category == "Entertainment"
        assert game.essential is False
        assert downloads.category == "Entertainment"
        assert downloads.essential is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_rule_engine.py -q`

Expected: FAIL with `KeyError: 'Favorite book or e-reader'`.

- [ ] **Step 3: Write minimal implementation**

In `backend/app/services/rule_engine.py`, add these optional rules to `ALWAYS_RULES` after `Small day bag / backpack`:

```python
    ("Entertainment", "Favorite book or e-reader", 1, False),
    ("Entertainment", "Travel-size game / deck of cards", 1, False),
    ("Entertainment", "Downloaded movies, podcasts, or playlists", 1, False),
    ("Entertainment", "Journal or sketchbook", 1, False),
    ("Entertainment", "Pen", 1, False),
    ("Entertainment", "Offline maps / saved trip notes", 1, False),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_rule_engine.py -q`

Expected: PASS.

### Task 3: Packing UI Category Metadata

**Files:**
- Modify: `mobile/app/trip/[id]/packing.tsx`

- [ ] **Step 1: Add UI category support**

In `mobile/app/trip/[id]/packing.tsx`, add Entertainment to `CATEGORY_EMOJI`:

```typescript
  Entertainment: '🎲',
```

Add Entertainment to the `allCategories` fallback list:

```typescript
  const allCategories = [...new Set([...categories, 'Clothing', 'Electronics', 'Documents', 'Toiletries', 'Health', 'Gear', 'Footwear', 'Entertainment', 'Misc'])];
```

- [ ] **Step 2: Run mobile packing tests**

Run: `cd mobile && npm test -- --runTestsByPath lib/packing/__tests__/ruleEngine.test.ts lib/packing/__tests__/listUi.test.ts --runInBand`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- Verify: `mobile/lib/packing/ruleEngine.ts`
- Verify: `backend/app/services/rule_engine.py`
- Verify: `mobile/app/trip/[id]/packing.tsx`

- [ ] **Step 1: Run focused mobile tests**

Run: `cd mobile && npm test -- --runTestsByPath lib/packing/__tests__/ruleEngine.test.ts lib/packing/__tests__/listUi.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 2: Run focused backend tests**

Run: `cd backend && pytest tests/test_rule_engine.py -q`

Expected: PASS.

- [ ] **Step 3: Review diff**

Run: `git diff -- mobile/lib/packing/ruleEngine.ts mobile/lib/packing/__tests__/ruleEngine.test.ts backend/app/services/rule_engine.py backend/tests/test_rule_engine.py 'mobile/app/trip/[id]/packing.tsx'`

Expected: Diff only contains Entertainment category items, tests, and UI metadata.
