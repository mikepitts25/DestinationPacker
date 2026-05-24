# Entertainment Packing Category Design

## Goal

Add an optional Entertainment category to generated packing lists so travelers remember small items that make downtime, transit, and evenings more enjoyable. These items should complement the existing essentials without making the list feel mandatory or safety-critical.

## Behavior

The rule engine will add a small always-present set of non-essential shared recommendations:

- Favorite book or e-reader
- Travel-size game or deck of cards
- Downloaded movies, podcasts, or playlists
- Journal or sketchbook
- Pen
- Offline maps / saved trip notes

These items appear for all trips because downtime can happen during flights, trains, road trips, hotel evenings, beach days, and unexpected delays. They are all optional, with quantity `1`, and use the existing `rule_engine` source.

## UI

The packing screen will show Entertainment as a normal packing category when generated items include it. The category tile will use a distinct icon and the add-item category picker will include Entertainment alongside the existing categories.

No new screen, onboarding step, preference toggle, or modal is required.

## Data Flow

The mobile rule engine is the primary generator for the current app flow. The backend rule engine will be updated with the same category and item names so server-generated lists remain consistent.

Generated items will continue to deduplicate by item name using the existing merge logic. Since the new item names do not overlap with current rules, no special merge behavior is needed.

## Testing

Add focused assertions to the mobile and backend rule-engine tests proving generated packing lists include Entertainment items and that they are optional. Existing category grouping behavior already covers display of arbitrary category names.

## Non-Goals

Do not add personalization, entertainment preferences, activity-specific entertainment rules, or separate per-traveler entertainment quantities in this change.
