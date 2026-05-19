alter table public.trips
  add column if not exists children integer not null default 0 check (children >= 0),
  add column if not exists pets integer not null default 0 check (pets >= 0),
  add column if not exists has_laundry_access boolean not null default false,
  add column if not exists legs jsonb not null default '[]'::jsonb;

update public.trips
set legs = jsonb_build_array(jsonb_build_object(
  'destination', destination,
  'latitude', latitude,
  'longitude', longitude,
  'country_code', country_code,
  'start_date', start_date,
  'end_date', end_date,
  'travel_method', travel_method,
  'accommodation', accommodation
))
where legs = '[]'::jsonb;

alter table public.packing_items
  add column if not exists traveler_type text not null default 'shared';

alter table public.packing_items
  drop constraint if exists packing_items_traveler_type_check,
  add constraint packing_items_traveler_type_check
    check (traveler_type in ('male', 'female', 'child', 'pet', 'shared'));

alter table public.trip_activities
  add column if not exists distance_from_center_km numeric;

alter table public.trip_activities
  drop constraint if exists trip_activities_activity_type_check,
  add constraint trip_activities_activity_type_check
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
      'souvenirs',
      'family',
      'adventure'
    ));
