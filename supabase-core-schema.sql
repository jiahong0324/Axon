-- Complete Core Academic Tables & Row Level Security (RLS) for Axon.
-- Run this in the Supabase SQL Editor to ensure student & manager policies remain intact.

-- Ensure schema & table privileges exist for signed-in users
grant usage on schema public to authenticated;

-- 1. Core Academic Tables (non-destructive if they already exist)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  day text,
  start_time text,
  end_time text,
  lecturer text,
  classroom text,
  class_type text,
  color text,
  is_replacement boolean default false,
  date text,
  created_at timestamp with time zone default now()
);

create table if not exists public.assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  subject text,
  deadline text,
  priority text default 'Medium',
  notes text default '',
  status text default 'Pending',
  created_at timestamp with time zone default now()
);

create table if not exists public.exams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  exam_date text,
  start_time text,
  end_time text,
  exam_type text default 'Final',
  venue text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists public.reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  reminder_time text,
  repeat_type text default 'once',
  is_active boolean default true,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

grant select, insert, update, delete on
  public.profiles,
  public.classes,
  public.assignments,
  public.exams,
  public.reminders
to authenticated;

-- 2. Manager helper function (security definer avoids RLS recursion on profiles)
create or replace function public.is_manager(user_id uuid default auth.uid())
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

-- 3. Enable RLS & Restore Both Student + Manager Policies

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Managers can read all profiles" on public.profiles;
create policy "Managers can read all profiles" on public.profiles
  for select to authenticated
  using (public.is_manager());

drop policy if exists "Managers can update student profiles" on public.profiles;
create policy "Managers can update student profiles" on public.profiles
  for update to authenticated
  using (public.is_manager() and role = 'student')
  with check (public.is_manager() and role = 'student');

-- classes
alter table public.classes enable row level security;
drop policy if exists "Users can manage own classes" on public.classes;
create policy "Users can manage own classes" on public.classes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read all classes" on public.classes;
create policy "Managers can read all classes" on public.classes
  for select to authenticated
  using (public.is_manager());

-- assignments
alter table public.assignments enable row level security;
drop policy if exists "Users can manage own assignments" on public.assignments;
create policy "Users can manage own assignments" on public.assignments
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read all assignments" on public.assignments;
create policy "Managers can read all assignments" on public.assignments
  for select to authenticated
  using (public.is_manager());

-- exams
alter table public.exams enable row level security;
drop policy if exists "Users can manage own exams" on public.exams;
create policy "Users can manage own exams" on public.exams
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read all exams" on public.exams;
create policy "Managers can read all exams" on public.exams
  for select to authenticated
  using (public.is_manager());

-- reminders
alter table public.reminders enable row level security;
drop policy if exists "Users can manage own reminders" on public.reminders;
create policy "Users can manage own reminders" on public.reminders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read all reminders" on public.reminders;
create policy "Managers can read all reminders" on public.reminders
  for select to authenticated
  using (public.is_manager());
