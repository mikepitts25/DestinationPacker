alter table public.trips
  add column if not exists male_travelers integer not null default 0 check (male_travelers >= 0),
  add column if not exists female_travelers integer not null default 0 check (female_travelers >= 0),
  add column if not exists activity_interests text[] not null default '{}'::text[];
