-- Hide the is_admin() helper from the public API, merge duplicate policies,
-- and add the admin panel's user-management function.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Policies reference the function itself, so they keep working after the move
alter function public.is_admin() set schema private;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- One UPDATE policy per table (owner OR admin)
drop policy "Users update their own profile" on public.profiles;
drop policy "Admins update any profile" on public.profiles;
create policy "Users update their own profile; admins any"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()))
  with check ((select auth.uid()) = id or (select private.is_admin()));

drop policy "Hosts update their own spaces" on public.spaces;
drop policy "Admins update any space" on public.spaces;
create policy "Hosts update their own spaces; admins any"
  on public.spaces for update to authenticated
  using (host_id = (select auth.uid()) or (select private.is_admin()))
  with check (host_id = (select auth.uid()) or (select private.is_admin()));

create index reviews_reviewer_idx on public.reviews (reviewer_id);

-- Admin panel: list users with their email (auth.users isn't exposed to the API)
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, first_name text, last_name text, phone text, city text,
  is_verified boolean, is_admin boolean, created_at timestamptz, last_sign_in_at timestamptz,
  spaces_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admins only';
  end if;
  return query
    select p.id, u.email::text, p.first_name, p.last_name, p.phone, p.city,
           p.is_verified, p.is_admin, p.created_at, u.last_sign_in_at,
           (select count(*) from public.spaces s where s.host_id = p.id and s.status = 'Active')
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.created_at desc;
end;
$$;

-- Admin panel: verify a host, or grant/remove admin
create or replace function public.admin_update_user(p_user_id uuid, p_is_verified boolean, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_user_id = auth.uid() and p_is_admin = false then
    raise exception 'You cannot remove your own admin access';
  end if;
  update public.profiles
     set is_verified = coalesce(p_is_verified, is_verified),
         is_admin = coalesce(p_is_admin, is_admin)
   where id = p_user_id;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_update_user(uuid, boolean, boolean) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_user(uuid, boolean, boolean) to authenticated;
