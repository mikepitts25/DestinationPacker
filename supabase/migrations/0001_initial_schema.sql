create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  subscription text not null default 'free'
    check (subscription in ('free', 'premium')),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  latitude double precision,
  longitude double precision,
  country_code text,
  start_date date not null,
  end_date date not null,
  accommodation text not null
    check (accommodation in ('hotel', 'hostel', 'airbnb', 'camping', 'resort', 'cruise', 'friends_family')),
  travel_method text not null
    check (travel_method in ('flight', 'road_trip', 'train', 'cruise', 'backpacking')),
  travelers integer not null default 1 check (travelers >= 1),
  notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.trip_activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  activity_name text not null,
  activity_type text not null
    check (activity_type in (
      'outdoor',
      'water',
      'cultural',
      'nightlife',
      'dining',
      'sports',
      'beach',
      'snow',
      'business',
      'wellness',
      'shopping',
      'souvenirs'
    )),
  description text,
  source text not null default 'suggested',
  external_id text,
  photo_url text,
  selected boolean not null default false
);

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  activity_id uuid references public.trip_activities(id) on delete set null,
  category text not null,
  item_name text not null,
  quantity integer not null default 1 check (quantity >= 1),
  packed boolean not null default false,
  essential boolean not null default false,
  source text not null default 'rule_engine'
    check (source in ('rule_engine', 'ai', 'activity', 'user_added'))
);

create table if not exists public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view'
    check (permission in ('view', 'edit')),
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (trip_id, shared_with)
);

create table if not exists public.api_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_start_date_idx on public.trips(start_date);
create index if not exists packing_items_trip_id_idx on public.packing_items(trip_id);
create index if not exists packing_items_activity_id_idx on public.packing_items(activity_id);
create index if not exists trip_activities_trip_id_idx on public.trip_activities(trip_id);
create index if not exists trip_shares_trip_id_idx on public.trip_shares(trip_id);
create index if not exists trip_shares_shared_with_idx on public.trip_shares(shared_with);
create index if not exists api_cache_expires_at_idx on public.api_cache(expires_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.packing_items enable row level security;
alter table public.trip_activities enable row level security;
alter table public.trip_shares enable row level security;
alter table public.api_cache enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own"
on public.trips for select
using (user_id = auth.uid());

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own"
on public.trips for insert
with check (user_id = auth.uid());

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own"
on public.trips for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own"
on public.trips for delete
using (user_id = auth.uid());

drop policy if exists "packing_items_select_owned_trip" on public.packing_items;
create policy "packing_items_select_owned_trip"
on public.packing_items for select
using (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "packing_items_insert_owned_trip" on public.packing_items;
create policy "packing_items_insert_owned_trip"
on public.packing_items for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "packing_items_update_owned_trip" on public.packing_items;
create policy "packing_items_update_owned_trip"
on public.packing_items for update
using (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "packing_items_delete_owned_trip" on public.packing_items;
create policy "packing_items_delete_owned_trip"
on public.packing_items for delete
using (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_activities_select_owned_trip" on public.trip_activities;
create policy "trip_activities_select_owned_trip"
on public.trip_activities for select
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_activities_insert_owned_trip" on public.trip_activities;
create policy "trip_activities_insert_owned_trip"
on public.trip_activities for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_activities_update_owned_trip" on public.trip_activities;
create policy "trip_activities_update_owned_trip"
on public.trip_activities for update
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_activities_delete_owned_trip" on public.trip_activities;
create policy "trip_activities_delete_owned_trip"
on public.trip_activities for delete
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_shares_select_owned_or_shared" on public.trip_shares;
create policy "trip_shares_select_owned_or_shared"
on public.trip_shares for select
using (
  shared_with = auth.uid()
  or exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_shares_insert_owned_trip" on public.trip_shares;
create policy "trip_shares_insert_owned_trip"
on public.trip_shares for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_shares_update_owned_trip" on public.trip_shares;
create policy "trip_shares_update_owned_trip"
on public.trip_shares for update
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_shares_delete_owned_trip" on public.trip_shares;
create policy "trip_shares_delete_owned_trip"
on public.trip_shares for delete
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = auth.uid()
  )
);
