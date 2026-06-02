create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.feedback enable row level security;

create policy "Users can insert their own feedback."
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own feedback."
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "Managers can view all feedback."
  on public.feedback for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));

create policy "Managers can update feedback."
  on public.feedback for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'manager'));
