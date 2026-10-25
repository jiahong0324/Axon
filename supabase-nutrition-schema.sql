-- Axon Nutrition & Diet Tracking Feature Database Migration
-- Run this in the Supabase SQL Editor

-- 1. Daily Nutrition Goals Table
create table if not exists public.nutrition_goals (
  user_id uuid references auth.users(id) on delete cascade primary key,
  calories integer default 2000 not null,
  protein numeric default 120 not null,
  carbs numeric default 250 not null,
  fats numeric default 65 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.nutrition_goals enable row level security;

create policy "Users can view their own nutrition goals"
  on public.nutrition_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own nutrition goals"
  on public.nutrition_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own nutrition goals"
  on public.nutrition_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own nutrition goals"
  on public.nutrition_goals for delete
  using (auth.uid() = user_id);

-- 2. Nutrition & Food Logs Table
create table if not exists public.nutrition_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null,
  meal_type text default 'Lunch' not null,
  name text not null,
  calories numeric default 0 not null,
  protein numeric default 0 not null,
  carbs numeric default 0 not null,
  fats numeric default 0 not null,
  notes text default '',
  meal_time text default '',
  image_url text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_nutrition_logs_user_date on public.nutrition_logs(user_id, log_date);

-- Ensure meal_time exists for existing tables
alter table public.nutrition_logs add column if not exists meal_time text default '';

alter table public.nutrition_logs enable row level security;

create policy "Users can view their own nutrition logs"
  on public.nutrition_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own nutrition logs"
  on public.nutrition_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own nutrition logs"
  on public.nutrition_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own nutrition logs"
  on public.nutrition_logs for delete
  using (auth.uid() = user_id);

-- Manager Policies
create policy "Managers can view all nutrition logs"
  on public.nutrition_logs for select
  using (public.check_is_manager() or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));
