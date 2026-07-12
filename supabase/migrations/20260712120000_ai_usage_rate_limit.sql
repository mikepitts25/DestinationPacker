-- Per-user daily usage tracking for the ai-packing Edge Function so a single
-- account cannot run unlimited Gemini calls.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_service_role_only" on public.ai_usage;
create policy "ai_usage_service_role_only"
on public.ai_usage
for all
to service_role
using (true)
with check (true);

-- Atomically increments today's counter and reports whether the caller is
-- still within the daily limit. Called only by service-role Edge Functions.
create or replace function public.increment_ai_usage(p_user_id uuid, p_daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage (user_id, usage_date, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set
    request_count = public.ai_usage.request_count + 1,
    updated_at = now()
  returning request_count into new_count;

  return new_count <= p_daily_limit;
end;
$$;

revoke execute on function public.increment_ai_usage(uuid, integer) from public;
revoke execute on function public.increment_ai_usage(uuid, integer) from anon;
revoke execute on function public.increment_ai_usage(uuid, integer) from authenticated;
