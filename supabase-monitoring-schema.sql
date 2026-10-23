-- System Telemetry & Datadog Monitoring Schema for Axon
-- Run this script in the Supabase SQL Editor to enable full client telemetry logging.

create table if not exists public.system_telemetry (
  id uuid default gen_random_uuid() primary key,
  event_type text not null default 'page_view',
  path text not null,
  user_id uuid references auth.users(id) on delete set null,
  visitor_id text,
  role text default 'guest',
  device_type text,
  browser text,
  os text,
  load_time_ms numeric default 0,
  status_code integer default 200,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Indices for rapid querying and time-range aggregations
create index if not exists idx_system_telemetry_created_at on public.system_telemetry(created_at desc);
create index if not exists idx_system_telemetry_path on public.system_telemetry(path);
create index if not exists idx_system_telemetry_event_type on public.system_telemetry(event_type);
create index if not exists idx_system_telemetry_user_id on public.system_telemetry(user_id);
create index if not exists idx_system_telemetry_visitor_id on public.system_telemetry(visitor_id);

-- Enable Row Level Security
alter table public.system_telemetry enable row level security;

-- 1. Allow any visitor (guests, students, managers) to record telemetry events
drop policy if exists "Anyone can record telemetry events" on public.system_telemetry;
create policy "Anyone can record telemetry events" on public.system_telemetry
  for insert
  with check (true);

-- 2. Only managers can view telemetry logs and system metrics
drop policy if exists "Managers can read all system telemetry" on public.system_telemetry;
create policy "Managers can read all system telemetry" on public.system_telemetry
  for select
  using (public.is_manager());

-- 3. Optional automated cleanup function for records older than 60 days
create or replace function public.cleanup_old_telemetry(days_to_keep int default 60)
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  delete from public.system_telemetry
  where created_at < now() - (days_to_keep || ' days')::interval;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
