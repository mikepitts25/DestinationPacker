# Tailored Activity Plans Design

## Goal

The AI-generated things-to-do experience should feel like a tailored trip plan, not a generic activity database. The Activities screen should open with a suggested plan that explains what to do, when it fits, and why it matches the trip, while preserving the current ability to select activities so packing-list items update automatically.

## Current Behavior

The Activities screen displays selectable activity cards grouped by destination and activity type. Cards show source, type, rating, distance, and description. This is useful for packing integration, but it reads like a list of records rather than a plan.

Fallback activity generation can also produce generic labels such as old town route, food market, local shops, or maker workshop. These are better than empty results, but they still ask the traveler to do planning work instead of giving a confident recommendation.

## Recommended Experience

The Activities screen should have two stacked areas:

1. Suggested Plan
2. Build Your Trip

Suggested Plan appears first. It turns the available activity pool into a short plan with time-of-day blocks such as Morning, Afternoon, Evening, and Flexible. Each block should show a concrete activity title, the relevant destination, a reason it fits the trip, and a practical note. Tapping a plan item should select the underlying activity and keep the existing packing-list update behavior.

Build Your Trip keeps the full selectable activity pool below the plan. It should no longer group only by raw activity type. Instead, it should use traveler-facing groups that imply planning intent:

- Start With These
- Local Food & Drink
- Worth Booking
- Bring Home
- Easy Fillers
- Outdoor / Weather Dependent

## Suggested Plan Rules

The first implementation should derive the plan from existing `Activity[]` rows and trip context. It should not require a database migration.

The planner should prefer:

- Selected activities first, so the plan reflects choices already made.
- Higher-signal rows with ratings, review counts, photos, local-guide source, or AI-curated source.
- Local food, book-ahead experiences, souvenirs, outdoor/weather-dependent activities, and cultural anchors.
- A mix of activity types instead of repeating the same category.
- Per-destination balance for multi-destination trips.

Each generated plan block should include:

- Time label: Morning, Afternoon, Evening, or Flexible.
- Activity id.
- Title.
- Destination.
- Short reason text.
- Practical note.
- Group label used by the lower activity list.

Reason text should explain the recommendation in terms of available context, such as trip interests, destination specificity, local-guide coverage, rating, distance, selected state, or packing impact. It should avoid vague copy like "great activity" or "popular thing to do."

## Activity List UI

Activity cards should be redesigned to support decision-making:

- Let activity names wrap to two lines instead of truncating after one line.
- Show the destination-specific reason or description as the main supporting copy.
- Move source, rating, distance, and type into smaller metadata.
- Use a clear selected state with the label "Added to trip."
- Keep photos when available and use stable placeholder visuals when not.
- Avoid oversized cards and nested card layouts.

The screen header should tell the user what the page does in one sentence: choose the plan items that match the trip, and packing updates from those choices.

## Genericness Cleanup

Known local suggestions should stay specific. Generic fallback labels should be rewritten to sound like concrete planning prompts rather than placeholders.

Examples:

- Replace "old town, landmark, or historic building route" with "Build a history walk around the old center and landmark streets."
- Replace "food market or tasting walk" with "Use a market tasting walk as the food anchor."
- Replace "maker, cooking, or craft workshop" with "Book one hands-on food or craft session."
- Replace "park, garden, viewpoint, or waterfront break" with "Add a low-friction viewpoint or waterfront reset."

When the app recognizes a destination through existing local suggestion dictionaries, it should continue using named foods, products, workshops, and customs. For unrecognized destinations, fallback copy should be honest but still decisive.

## Data Flow

Add a pure helper in `mobile/lib/activities/plan.ts`.

Inputs:

- Activities for the trip.
- Destination count.
- Optional trip interests if already available to the screen without adding heavy fetches.

Outputs:

- Suggested plan blocks.
- Activity grouping metadata for Build Your Trip.

The screen should keep using `useActivities`, `useFetchActivities`, and `useToggleActivity`. Selecting from the plan should call the same toggle mutation as selecting from a card.

## Testing

Add focused tests for:

- Plan generation prefers selected and high-signal activities.
- Plan generation produces mixed time blocks and avoids duplicate activity ids.
- Multi-destination activities stay labeled with their destination.
- Activity grouping maps food, souvenirs, booking-worthy, outdoor, and general items into the expected groups.
- Generic fallback names and descriptions no longer contain placeholder phrasing.

## Out Of Scope

- Persisting generated day plans.
- Calendar scheduling, maps routing, opening hours, or live ticket availability.
- A full AI itinerary-generation backend.
- Replacing the existing activity selection and packing-list integration.
