-- ==============================================================================
-- Axon Feedback Image Support Migration
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wyvwflunwzdbluqrwyuz/sql
-- ==============================================================================

-- 1. Ensure feedback table has image_url, name, and email columns
alter table public.feedback add column if not exists image_url text;
alter table public.feedback add column if not exists name text;
alter table public.feedback add column if not exists email text;
alter table public.feedback alter column user_id drop not null;

-- 2. Enable Row Level Security (RLS)
alter table public.feedback enable row level security;

-- 3. Reset existing policies to avoid duplicate errors
drop policy if exists "Users can insert their own feedback." on public.feedback;
drop policy if exists "Anyone can insert feedback." on public.feedback;
drop policy if exists "Users can view their own feedback." on public.feedback;
drop policy if exists "Managers can view all feedback." on public.feedback;
drop policy if exists "Managers can update feedback." on public.feedback;
drop policy if exists "Managers can delete feedback." on public.feedback;

-- 4. Create RLS policies
-- Allow all users (authenticated students and guests) to submit feedback
create policy "Anyone can insert feedback."
  on public.feedback for insert
  with check (true);

-- Allow students to view only their own feedback
create policy "Users can view their own feedback."
  on public.feedback for select
  using (auth.uid() = user_id);

-- Allow managers to view all student feedback
create policy "Managers can view all feedback."
  on public.feedback for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

-- Allow managers to update status (pending / reviewed / resolved)
create policy "Managers can update feedback."
  on public.feedback for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

-- Allow managers to delete feedback
create policy "Managers can delete feedback."
  on public.feedback for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

-- 5. Set up Supabase Storage Bucket for feedback attachments (Optional if using Supabase Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-images',
  'feedback-images',
  true,
  10485760, -- 10MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Storage bucket RLS policies
drop policy if exists "Public Access for Feedback Images" on storage.objects;
create policy "Public Access for Feedback Images"
  on storage.objects for select
  using (bucket_id = 'feedback-images');

drop policy if exists "Anyone can upload feedback images" on storage.objects;
create policy "Anyone can upload feedback images"
  on storage.objects for insert
  with check (bucket_id = 'feedback-images');
