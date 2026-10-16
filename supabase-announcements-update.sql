-- =========================================================================
-- Axon Announcement & Notification Center Schema Update
-- Run this migration in your Supabase SQL Editor.
-- =========================================================================

-- 1. Extend announcements table for audience targeting and channel flags
alter table if exists public.announcements 
  add column if not exists target_type text default 'all',
  add column if not exists target_ids text[] default null,
  add column if not exists target_group text default null,
  add column if not exists channels jsonb default '{"in_app": true, "push": true, "email": false}'::jsonb;

-- 2. Create announcement_reads table to track read/dismissed status per student
create table if not exists public.announcement_reads (
  id uuid default gen_random_uuid() primary key,
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamp with time zone default now(),
  unique (announcement_id, user_id)
);

-- Enable Row Level Security
alter table public.announcement_reads enable row level security;

-- 3. Row Level Security Policies for announcement_reads
drop policy if exists "Users can view own announcement reads" on public.announcement_reads;
create policy "Users can view own announcement reads" on public.announcement_reads
  for select using (auth.uid() = user_id);

drop policy if exists "Users can mark announcements as read" on public.announcement_reads;
create policy "Users can mark announcements as read" on public.announcement_reads
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own announcement reads" on public.announcement_reads;
create policy "Users can update own announcement reads" on public.announcement_reads
  for update using (auth.uid() = user_id);

drop policy if exists "Managers can view all announcement reads" on public.announcement_reads;
create policy "Managers can view all announcement reads" on public.announcement_reads
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- 4. Update announcements read policy so students can view announcements intended for them
drop policy if exists "Students can read announcements" on public.announcements;
create policy "Students can read announcements" on public.announcements
  for select using (
    auth.uid() is not null
    and (
      target_type is null 
      or target_type = 'all'
      or (target_type = 'individual' and auth.uid()::text = any(target_ids))
      or (
        target_type = 'group'
        and exists (
          select 1 from public.profiles
          where id = auth.uid()
            and (course = target_group or university = target_group)
        )
      )
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'manager'
      )
    )
  );
