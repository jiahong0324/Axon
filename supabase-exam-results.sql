-- TAR UMT Exam Results & CGPA Schema for Axon
-- Run this in the Supabase SQL Editor

create table if not exists student_semesters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now()
);
alter table student_semesters enable row level security;

drop policy if exists "Users can manage own semesters" on student_semesters;
create policy "Users can manage own semesters" on student_semesters
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read student semesters" on student_semesters;
create policy "Managers can read student semesters" on student_semesters
  for select using (public.is_manager());

create table if not exists student_semester_courses (
  id uuid default gen_random_uuid() primary key,
  semester_id uuid references student_semesters(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_code text default '',
  course_name text not null,
  credit_hours numeric default 3 not null,
  grade text not null,
  created_at timestamp with time zone default now()
);
alter table student_semester_courses enable row level security;

drop policy if exists "Users can manage own semester courses" on student_semester_courses;
create policy "Users can manage own semester courses" on student_semester_courses
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read student semester courses" on student_semester_courses;
create policy "Managers can read student semester courses" on student_semester_courses
  for select using (public.is_manager());
