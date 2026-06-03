alter table public.trip_activities
  add column if not exists destination text;

update public.trip_activities
set destination = trips.destination
from public.trips
where trip_activities.trip_id = trips.id
  and trip_activities.destination is null;

create index if not exists trip_activities_trip_destination_idx
  on public.trip_activities(trip_id, destination);
