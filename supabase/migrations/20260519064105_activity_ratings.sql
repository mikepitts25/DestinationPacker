alter table public.trip_activities
  add column if not exists rating numeric(2,1),
  add column if not exists review_count integer check (review_count is null or review_count >= 0),
  add column if not exists rating_source text;
