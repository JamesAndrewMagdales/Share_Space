-- Messages sent from the Contact page. Anyone can send; only admins can read
-- (view them in the Supabase table editor).
create table public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  subject text check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 5000),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index contact_messages_user_idx on public.contact_messages (user_id);

alter table public.contact_messages enable row level security;

create policy "Anyone can send a contact message"
  on public.contact_messages for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create policy "Admins read contact messages"
  on public.contact_messages for select to authenticated
  using ((select private.is_admin()));

revoke update, delete on public.contact_messages from anon, authenticated;
