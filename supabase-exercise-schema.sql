-- Axon Exercise Feature Database Migration
-- Adds profiles columns and creates exercise_logs table with RLS

alter table public.profiles add column if not exists weekly_exercise_goal integer default 4;
alter table public.profiles add column if not exists xp_total integer default 0;
alter table public.profiles add column if not exists streak_freezes_available integer default 1;

create table if not exists public.exercise_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null,
  activity_type text default 'Gym',
  xp_earned integer default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_log_date unique (user_id, log_date)
);

alter table public.exercise_logs enable row level security;

create policy "Users can insert their own exercise logs."
  on public.exercise_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own exercise logs."
  on public.exercise_logs for select
  using (auth.uid() = user_id);

create policy "Users can update their own exercise logs."
  on public.exercise_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own exercise logs."
  on public.exercise_logs for delete
  using (auth.uid() = user_id);

create or replace function public.check_is_manager(user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'manager'
  );
$$;

create policy "Managers can view all exercise logs."
  on public.exercise_logs for select
  using (public.check_is_manager() or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));
