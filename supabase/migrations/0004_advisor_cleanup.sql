revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

revoke execute on function public.prevent_client_subscription_update() from public;
revoke execute on function public.prevent_client_subscription_update() from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(pg_proc.oid) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end $$;

drop policy if exists "api_cache_service_role_only" on public.api_cache;
create policy "api_cache_service_role_only"
on public.api_cache
for all
to service_role
using (true)
with check (true);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own"
on public.trips for select
using (user_id = (select auth.uid()));

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own"
on public.trips for insert
with check (user_id = (select auth.uid()));

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own"
on public.trips for update
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own"
on public.trips for delete
using (user_id = (select auth.uid()));

drop policy if exists "packing_items_select_owned_trip" on public.packing_items;
create policy "packing_items_select_owned_trip"
on public.packing_items for select
using (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "packing_items_insert_owned_trip" on public.packing_items;
create policy "packing_items_insert_owned_trip"
on public.packing_items for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "packing_items_update_owned_trip" on public.packing_items;
create policy "packing_items_update_owned_trip"
on public.packing_items for update
using (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "packing_items_delete_owned_trip" on public.packing_items;
create policy "packing_items_delete_owned_trip"
on public.packing_items for delete
using (
  exists (
    select 1 from public.trips
    where trips.id = packing_items.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_activities_select_owned_trip" on public.trip_activities;
create policy "trip_activities_select_owned_trip"
on public.trip_activities for select
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_activities_insert_owned_trip" on public.trip_activities;
create policy "trip_activities_insert_owned_trip"
on public.trip_activities for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_activities_update_owned_trip" on public.trip_activities;
create policy "trip_activities_update_owned_trip"
on public.trip_activities for update
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_activities_delete_owned_trip" on public.trip_activities;
create policy "trip_activities_delete_owned_trip"
on public.trip_activities for delete
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_activities.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_shares_select_owned_or_shared" on public.trip_shares;
create policy "trip_shares_select_owned_or_shared"
on public.trip_shares for select
using (
  shared_with = (select auth.uid())
  or exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_shares_insert_owned_trip" on public.trip_shares;
create policy "trip_shares_insert_owned_trip"
on public.trip_shares for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_shares_update_owned_trip" on public.trip_shares;
create policy "trip_shares_update_owned_trip"
on public.trip_shares for update
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "trip_shares_delete_owned_trip" on public.trip_shares;
create policy "trip_shares_delete_owned_trip"
on public.trip_shares for delete
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_shares.trip_id
      and trips.user_id = (select auth.uid())
  )
);
