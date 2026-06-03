import { describeSupabaseWriteError } from '../errors';

describe('Supabase error descriptions', () => {
  it('points missing new trip columns at the multi-leg migration', () => {
    expect(describeSupabaseWriteError('Could not find the children column in the schema cache')).toBe(
      'Database migration 0005 is required before creating trips with children, pets, laundry, or multiple legs. Apply supabase/migrations/0005_multi_leg_travelers_and_segments.sql and refresh the Supabase schema cache.',
    );
  });

  it('keeps unrelated Supabase messages unchanged', () => {
    expect(describeSupabaseWriteError('permission denied for table trips')).toBe('permission denied for table trips');
  });
});
