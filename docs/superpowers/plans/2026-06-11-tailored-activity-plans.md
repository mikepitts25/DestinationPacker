# Tailored Activity Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plan-first Activities screen that turns generated things to do into a tailored suggested plan while preserving selectable activity cards and packing-list updates.

**Architecture:** Add a pure activity planner helper that scores, groups, and annotates existing `Activity[]` rows without changing persistence. Update the Activities route to render a Suggested Plan section above a grouped Build Your Trip list, with both paths using the existing toggle mutation. Tighten fallback suggestion wording so unrecognized destinations still produce decisive, non-placeholder prompts.

**Tech Stack:** Expo Router, React Native, React Native Paper, TypeScript, Jest.

---

### Task 1: Activity Planner Helper

**Files:**
- Create: `mobile/lib/activities/plan.ts`
- Create: `mobile/lib/activities/__tests__/plan.test.ts`

- [ ] **Step 1: Write failing tests**

Create `mobile/lib/activities/__tests__/plan.test.ts` with tests that call `buildActivityPlan` and `groupActivitiesForPlanning`. Cover selected/high-signal preference, unique time blocks, destination labels, and grouping into `Start With These`, `Local Food & Drink`, `Worth Booking`, `Bring Home`, `Easy Fillers`, and `Outdoor / Weather Dependent`.

- [ ] **Step 2: Run tests to verify red**

Run: `cd mobile && npm test -- lib/activities/__tests__/plan.test.ts --runInBand`

Expected: FAIL because `../plan` does not exist.

- [ ] **Step 3: Implement helper**

Create `mobile/lib/activities/plan.ts` exporting:

- `ActivityPlanBlock`
- `ActivityPlanningGroup`
- `buildActivityPlan(activities: Activity[], options?: { maxBlocks?: number }): ActivityPlanBlock[]`
- `groupActivitiesForPlanning(activities: Activity[]): ActivityPlanningGroup[]`
- `activityPlanningInsight(activity: Activity): string`

Keep the helper deterministic, pure, and independent of React.

- [ ] **Step 4: Run tests to verify green**

Run: `cd mobile && npm test -- lib/activities/__tests__/plan.test.ts --runInBand`

Expected: PASS.

### Task 2: Generic Fallback Cleanup

**Files:**
- Modify: `mobile/lib/activities/suggestions.ts`
- Modify: `mobile/lib/activities/__tests__/suggestions.test.ts`

- [ ] **Step 1: Write failing tests**

Extend `suggestions.test.ts` so generated fallback names and descriptions do not contain placeholder phrases such as `or`, `look for`, `local market and independent shops`, and `old town, landmark`.

- [ ] **Step 2: Run tests to verify red**

Run: `cd mobile && npm test -- lib/activities/__tests__/suggestions.test.ts --runInBand`

Expected: FAIL against the current generic fallback wording.

- [ ] **Step 3: Rewrite fallback labels**

Update base and interest fallbacks to use decisive planning prompts while keeping destination interpolation and existing activity types.

- [ ] **Step 4: Run tests to verify green**

Run: `cd mobile && npm test -- lib/activities/__tests__/suggestions.test.ts --runInBand`

Expected: PASS.

### Task 3: Activities Screen Layout

**Files:**
- Modify: `mobile/app/trip/[id]/activities.tsx`

- [ ] **Step 1: Wire planner data**

Import the planner helper, compute `planBlocks` and planning groups from `activities ?? []`, and use the same `toggleActivity` mutation from both plan rows and activity cards.

- [ ] **Step 2: Render Suggested Plan**

Add a list header section with a concise page explanation, a Suggested Plan title, and compact plan rows showing time label, title, destination, reason, practical note, and selected state.

- [ ] **Step 3: Render Build Your Trip groups**

Replace raw activity-type sections with planner groups. Preserve current SectionList behavior, refresh action, empty state, and selection banner.

- [ ] **Step 4: Redesign cards**

Allow names to wrap to two lines, make the insight/description the primary support text, demote metadata, and show `Added to trip` for selected rows.

### Task 4: Verification

**Files:**
- Check: `mobile/lib/activities/__tests__/plan.test.ts`
- Check: `mobile/lib/activities/__tests__/suggestions.test.ts`
- Check: TypeScript project

- [ ] **Step 1: Run focused tests**

Run: `cd mobile && npm test -- lib/activities/__tests__/plan.test.ts lib/activities/__tests__/suggestions.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 2: Run type check**

Run: `cd mobile && npm run type-check`

Expected: PASS.

- [ ] **Step 3: Inspect diff**

Run: `git diff -- mobile/lib/activities mobile/app/trip/[id]/activities.tsx docs/superpowers/plans/2026-06-11-tailored-activity-plans.md`

Expected: Diff is limited to the planner, activity suggestions, Activities UI, and this plan.
