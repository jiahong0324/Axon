-- Manager account support for Axon.
-- Run in the Supabase SQL Editor before using manager routes.

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  role text default 'student',
  university text,
  course text,
  student_id text,
  avatar_color text default '#3B82F6',
  is_active boolean default true,
  created_at timestamp with time zone default now()
);
alter table profiles enable row level security;

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

drop policy if exists "Managers can read all profiles" on profiles;
create policy "Managers can read all profiles" on profiles
  for select using (public.is_manager());

drop policy if exists "Users can manage own profile" on profiles;
create policy "Users can manage own profile" on profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Managers can update student profiles" on profiles;
create policy "Managers can update student profiles" on profiles
  for update using (public.is_manager() and role = 'student')
  with check (public.is_manager() and role = 'student');

drop policy if exists "Managers can read all classes" on classes;
create policy "Managers can read all classes" on classes
  for select using (public.is_manager());

drop policy if exists "Managers can read all assignments" on assignments;
create policy "Managers can read all assignments" on assignments
  for select using (public.is_manager());

drop policy if exists "Managers can read all exams" on exams;
create policy "Managers can read all exams" on exams
  for select using (public.is_manager());

drop policy if exists "Managers can read all reminders" on reminders;
create policy "Managers can read all reminders" on reminders
  for select using (public.is_manager());

create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,
  manager_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
alter table announcements enable row level security;

drop policy if exists "Managers can manage announcements" on announcements;
create policy "Managers can manage announcements" on announcements
  for all using (public.is_manager())
  with check (public.is_manager());

drop policy if exists "Students can read announcements" on announcements;
create policy "Students can read announcements" on announcements
  for select using (auth.uid() is not null);

create table if not exists exam_results (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references exams(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  score numeric,
  grade text,
  remarks text,
  entered_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  unique (exam_id, student_id)
);
alter table exam_results enable row level security;

drop policy if exists "Managers can manage exam results" on exam_results;
create policy "Managers can manage exam results" on exam_results
  for all using (public.is_manager())
  with check (public.is_manager());

drop policy if exists "Students can read own results" on exam_results;
create policy "Students can read own results" on exam_results
  for select using (auth.uid() = student_id);

create table if not exists activity_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_name text,
  created_at timestamp with time zone default now()
);
alter table activity_log enable row level security;

drop policy if exists "Managers can read all activity" on activity_log;
create policy "Managers can read all activity" on activity_log
  for select using (public.is_manager());

drop policy if exists "Users can log own activity" on activity_log;
create policy "Users can log own activity" on activity_log
  for insert with check (auth.uid() = user_id);
