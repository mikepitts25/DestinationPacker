const NEW_TRIP_COLUMN_NAMES = [
  'children',
  'pets',
  'has_laundry_access',
  'legs',
  'traveler_type',
  'distance_from_center_km',
];

export function describeSupabaseWriteError(message: string): string {
  const normalized = message.toLowerCase();
  const isMissingNewColumn = normalized.includes('could not find') &&
    normalized.includes('column') &&
    NEW_TRIP_COLUMN_NAMES.some((column) => normalized.includes(column));

  if (!isMissingNewColumn) return message;

  return 'Database migration 0005 is required before creating trips with children, pets, laundry, or multiple legs. Apply supabase/migrations/0005_multi_leg_travelers_and_segments.sql and refresh the Supabase schema cache.';
}
