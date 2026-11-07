-- ShareSpace on Supabase: peer-to-peer parking slot sharing
-- Hosts list parking spaces, drivers request bookings, hosts approve them.
-- Auth is Supabase Auth (auth.users); public.profiles holds the public profile.

-- ============================================================
-- PROFILES (one per auth user, created automatically on sign-up)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  city text,
  bio text,
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  rating_avg numeric(2,1) not null default 0,
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PARKING TYPES
-- ============================================================
create table public.parking_types (
  id smallint primary key,
  name text not null unique,
  description text,
  icon text
);

insert into public.parking_types (id, name, description, icon) values
  (1, 'Garage', 'Enclosed private garage', 'Warehouse'),
  (2, 'Driveway', 'Private driveway in front of a house', 'Home'),
  (3, 'Open Lot', 'Uncovered open-air parking lot', 'SquareParking'),
  (4, 'Covered Carport', 'Roofed carport or shade', 'Umbrella'),
  (5, 'Basement / Building', 'Condo or building basement slot', 'Building2'),
  (6, 'Street-side', 'Legal street-side space in front of property', 'Signpost'),
  (7, 'Motorcycle Slot', 'Space sized for motorcycles and scooters', 'Bike'),
  (8, 'Commercial Lot', 'Business or mall lot with spare slots', 'Store');

-- ============================================================
-- SPACES (parking listings posted by hosts)
-- ============================================================
create table public.spaces (
  id bigint generated always as identity primary key,
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '',
  type_id smallint references public.parking_types (id),
  price numeric(10,2) not null default 0 check (price >= 0),
  price_type text not null default 'Hourly' check (price_type in ('Hourly', 'Daily', 'Monthly', 'Free')),
  location text not null,
  city text not null,
  vehicle_type text not null default 'Car' check (vehicle_type in ('Car', 'Motorcycle', 'SUV/Van', 'Truck', 'Any')),
  slot_count integer not null default 1 check (slot_count between 1 and 100),
  is_covered boolean not null default false,
  has_cctv boolean not null default false,
  has_ev_charging boolean not null default false,
  is_24_7 boolean not null default true,
  available_from time,
  available_to time,
  image_url text,
  is_available boolean not null default true,
  status text not null default 'Active' check (status in ('Active', 'Removed')),
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hours_set_when_not_24_7 check (
    is_24_7 or (available_from is not null and available_to is not null and available_from < available_to)
  )
);

create index spaces_host_idx on public.spaces (host_id);
create index spaces_city_idx on public.spaces (city);
create index spaces_type_idx on public.spaces (type_id);
create index spaces_listing_idx on public.spaces (status, is_available, created_at desc);

-- ============================================================
-- BOOKINGS (driver requests to park at a space)
-- ============================================================
create table public.bookings (
  id bigint generated always as identity primary key,
  space_id bigint not null references public.spaces (id) on delete cascade,
  driver_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  preferred_date date not null,
  preferred_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes between 30 and 43200),
  vehicle_plate text not null check (char_length(vehicle_plate) between 2 and 20),
  vehicle_type text,
  message text,
  agreed_price numeric(10,2) not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index bookings_driver_idx on public.bookings (driver_id, created_at desc);
create index bookings_host_idx on public.bookings (host_id, created_at desc);
create index bookings_space_idx on public.bookings (space_id);

-- ============================================================
-- REVIEWS (left by a driver after a completed booking)
-- ============================================================
create table public.reviews (
  id bigint generated always as identity primary key,
  booking_id bigint not null references public.bookings (id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reviewed_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create index reviews_reviewed_idx on public.reviews (reviewed_id, created_at desc);

-- ============================================================
-- TRIGGERS / BUSINESS RULES
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger spaces_updated_at before update on public.spaces
  for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Same pricing rule the frontend shows as the estimate
create or replace function public.estimate_price(p_price numeric, p_type text, p_minutes integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'Free' then 0
    when 'Hourly' then round(p_price * greatest(p_minutes / 60.0, 1), 2)
    when 'Daily' then p_price * greatest(ceil(p_minutes / 1440.0), 1)
    when 'Monthly' then p_price * greatest(ceil(p_minutes / 43200.0), 1)
    else p_price
  end;
$$;

-- New bookings: the server sets host, price and status (clients can't fake them)
create or replace function public.prepare_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space public.spaces%rowtype;
begin
  select * into v_space from public.spaces where id = new.space_id;

  if not found or v_space.status <> 'Active' or not v_space.is_available then
    raise exception 'This parking space is not available for booking';
  end if;
  if v_space.host_id = new.driver_id then
    raise exception 'You cannot book your own parking space';
  end if;
  if new.preferred_date < current_date then
    raise exception 'Choose today or a future date';
  end if;

  new.host_id := v_space.host_id;
  new.agreed_price := public.estimate_price(v_space.price, v_space.price_type, new.duration_minutes);
  new.vehicle_plate := upper(trim(new.vehicle_plate));
  new.status := 'Pending';
  new.completed_at := null;
  return new;
end;
$$;

create trigger bookings_prepare before insert on public.bookings
  for each row execute function public.prepare_booking();

-- Booking status changes go through this function:
--   host:   Pending -> Accepted | Rejected
--   either: Accepted -> Completed, Pending/Accepted -> Cancelled
create or replace function public.update_booking_status(p_booking_id bigint, p_action text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_uid uuid := auth.uid();
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_uid is null or v_uid not in (v_booking.driver_id, v_booking.host_id) then
    raise exception 'Booking not found';
  end if;

  if p_action = 'accept' and v_uid = v_booking.host_id and v_booking.status = 'Pending' then
    v_booking.status := 'Accepted';
  elsif p_action = 'reject' and v_uid = v_booking.host_id and v_booking.status = 'Pending' then
    v_booking.status := 'Rejected';
  elsif p_action = 'complete' and v_booking.status = 'Accepted' then
    v_booking.status := 'Completed';
  elsif p_action = 'cancel' and v_booking.status in ('Pending', 'Accepted') then
    v_booking.status := 'Cancelled';
  else
    raise exception 'This booking cannot be changed that way';
  end if;

  update public.bookings
     set status = v_booking.status,
         completed_at = case when v_booking.status = 'Completed' then now() else completed_at end
   where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

-- Reviews: only the driver of a completed booking, about the host
create or replace function public.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if not found or v_booking.status <> 'Completed' or v_booking.driver_id <> new.reviewer_id then
    raise exception 'You can only review a parking session you completed';
  end if;
  new.reviewed_id := v_booking.host_id;
  return new;
end;
$$;

create trigger reviews_prepare before insert on public.reviews
  for each row execute function public.prepare_review();

create or replace function public.refresh_host_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(new.reviewed_id, old.reviewed_id);
begin
  update public.profiles p
     set rating_avg = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.reviewed_id = v_user), 0),
         total_reviews = (select count(*) from public.reviews r where r.reviewed_id = v_user)
   where p.id = v_user;
  return null;
end;
$$;

create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_host_rating();

-- View counter that anyone can bump without update rights on spaces
create or replace function public.increment_space_views(p_space_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.spaces set views_count = views_count + 1
   where id = p_space_id and status = 'Active';
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.parking_types enable row level security;
alter table public.spaces enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

-- Helper for admin-only policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Profiles: public names/ratings; users edit only their own non-privileged fields
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Admins update any profile"
  on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke update on public.profiles from anon, authenticated;
grant update (first_name, last_name, phone, city, bio) on public.profiles to authenticated;

-- Parking types: read-only
create policy "Parking types are viewable by everyone"
  on public.parking_types for select using (true);

-- Spaces
create policy "Active spaces are public; hosts see their own"
  on public.spaces for select
  using (status = 'Active' or host_id = (select auth.uid()) or (select public.is_admin()));
create policy "Hosts create their own spaces"
  on public.spaces for insert to authenticated
  with check (host_id = (select auth.uid()) and status = 'Active' and views_count = 0);
create policy "Hosts update their own spaces"
  on public.spaces for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "Admins update any space"
  on public.spaces for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke update on public.spaces from anon, authenticated;
grant update (title, description, type_id, price, price_type, location, city, vehicle_type,
              slot_count, is_covered, has_cctv, has_ev_charging, is_24_7, available_from,
              available_to, image_url, is_available, status)
  on public.spaces to authenticated;

-- Bookings: visible to the driver and the host; created by drivers;
-- status changes only through update_booking_status()
create policy "Drivers and hosts see their bookings"
  on public.bookings for select to authenticated
  using ((select auth.uid()) in (driver_id, host_id) or (select public.is_admin()));
create policy "Drivers create bookings"
  on public.bookings for insert to authenticated
  with check (driver_id = (select auth.uid()));

revoke update, delete on public.bookings from anon, authenticated;

-- Reviews
create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);
create policy "Drivers review completed bookings"
  on public.reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()));

revoke update, delete on public.reviews from anon, authenticated;

-- Functions callable from the app
revoke execute on function public.update_booking_status(bigint, text) from public, anon;
grant execute on function public.update_booking_status(bigint, text) to authenticated;
grant execute on function public.increment_space_views(bigint) to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prepare_booking() from public, anon, authenticated;
revoke execute on function public.prepare_review() from public, anon, authenticated;
revoke execute on function public.refresh_host_rating() from public, anon, authenticated;

-- ============================================================
-- STORAGE: listing photos (public read, hosts upload into their own folder)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('space-photos', 'space-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'space-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update their own photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'space-photos' and owner_id = (select auth.uid())::text);
create policy "Users delete their own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'space-photos' and owner_id = (select auth.uid())::text);
