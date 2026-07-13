-- AI Helper Chat Messages Schema for Axon
-- Run this in the Supabase SQL Editor if you want AI Helper chat history synced across devices (Laptop & Mobile)

create table if not exists student_ai_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null,
  content text not null,
  image text,
  is_manager boolean default false,
  created_at timestamp with time zone default now()
);

alter table student_ai_chats enable row level security;

drop policy if exists "Users can manage own ai chats" on student_ai_chats;
create policy "Users can manage own ai chats" on student_ai_chats
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Managers can read student ai chats" on student_ai_chats;
create policy "Managers can read student ai chats" on student_ai_chats
  for select using (public.is_manager());
