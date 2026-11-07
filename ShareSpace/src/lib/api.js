import { supabase } from './supabase';

// All database access for the app. Supabase Row Level Security enforces who
// may read or change what; these helpers just shape the data for the UI.

const SPACE_COLUMNS = `
  *,
  type:parking_types ( id, name ),
  host:profiles!spaces_host_id_fkey ( id, first_name, last_name, rating_avg, total_reviews, is_verified, bio )
`;

const fullName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'ShareSpace host';

// Flatten a spaces row into the fields the cards and pages use
export const toSpace = (row) => ({
  ...row,
  category_id: row.type_id,
  category_name: row.type?.name || null,
  image: row.image_url,
  provider_id: row.host_id,
  provider_name: fullName(row.host),
  provider_rating: Number(row.host?.rating_avg || 0),
  provider_total_reviews: row.host?.total_reviews || 0,
  provider_verified: !!row.host?.is_verified,
  provider_bio: row.host?.bio || ''
});

const unwrap = ({ data, error, count }) => {
  if (error) throw new Error(error.message);
  return { data, count };
};

// Escape characters that have meaning inside PostgREST filter strings
const safeLike = (text) => `%${text.replace(/[%,()*]/g, ' ').trim()}%`;

export const PAGE_SIZE = 12;

export async function listParkingTypes() {
  const { data } = unwrap(await supabase.from('parking_types').select('id, name').order('id'));
  return data;
}

export async function listSpaces(filters = {}) {
  const {
    search, location, typeId, vehicleType, priceType,
    isCovered, hasCctv, hasEvCharging, minPrice, maxPrice, minRating,
    sort = 'newest', page = 1
  } = filters;

  let query = supabase
    .from('spaces')
    .select(SPACE_COLUMNS, { count: 'exact' })
    .eq('status', 'Active')
    .eq('is_available', true);

  // Keyword and location are each "any of these columns"; combine them in one filter
  const groups = [];
  if (search?.trim()) {
    const term = safeLike(search);
    groups.push(`or(title.ilike.${term},description.ilike.${term},location.ilike.${term},city.ilike.${term})`);
  }
  if (location?.trim()) {
    const term = safeLike(location);
    groups.push(`or(city.ilike.${term},location.ilike.${term})`);
  }
  if (groups.length) query = query.or(`and(${groups.join(',')})`);
  if (typeId) query = query.eq('type_id', Number(typeId));
  if (vehicleType) query = query.in('vehicle_type', [vehicleType, 'Any']);
  if (priceType) query = query.eq('price_type', priceType);
  if (isCovered) query = query.eq('is_covered', true);
  if (hasCctv) query = query.eq('has_cctv', true);
  if (hasEvCharging) query = query.eq('has_ev_charging', true);
  if (minPrice) query = query.gte('price', Number(minPrice));
  if (maxPrice) query = query.lte('price', Number(maxPrice));

  if (sort === 'price') query = query.order('price', { ascending: true });
  else if (sort === 'title') query = query.order('title', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count } = unwrap(await query);
  let spaces = data.map(toSpace);
  // Host rating lives on the joined profile, so filter/sort it here
  if (minRating) spaces = spaces.filter((s) => s.provider_rating >= Number(minRating));
  if (sort === 'rating') spaces.sort((a, b) => b.provider_rating - a.provider_rating);

  return { spaces, total: count ?? spaces.length, totalPages: Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)) };
}

export async function getSpace(id) {
  const { data } = unwrap(await supabase.from('spaces').select(SPACE_COLUMNS).eq('id', id).maybeSingle());
  if (!data) return null;
  supabase.rpc('increment_space_views', { p_space_id: Number(id) }).then(() => {});
  return toSpace(data);
}

export async function listMySpaces(userId) {
  const { data } = unwrap(
    await supabase.from('spaces').select(SPACE_COLUMNS)
      .eq('host_id', userId).eq('status', 'Active')
      .order('created_at', { ascending: false })
  );
  return data.map(toSpace);
}

// Only send columns the database lets hosts write
const SPACE_FIELDS = ['title', 'description', 'type_id', 'price', 'price_type', 'location', 'city',
  'vehicle_type', 'slot_count', 'is_covered', 'has_cctv', 'has_ev_charging', 'is_24_7',
  'available_from', 'available_to', 'image_url', 'is_available'];

const pickSpaceFields = (input) => {
  const out = {};
  SPACE_FIELDS.forEach((key) => {
    if (input[key] !== undefined) out[key] = input[key];
  });
  if (out.price_type === 'Free') out.price = 0;
  if (out.is_24_7) {
    out.available_from = null;
    out.available_to = null;
  }
  return out;
};

export async function createSpace(input) {
  const { data } = unwrap(await supabase.from('spaces').insert(pickSpaceFields(input)).select('id').single());
  return data;
}

export async function updateSpace(id, input) {
  unwrap(await supabase.from('spaces').update(pickSpaceFields(input)).eq('id', id));
}

export async function removeSpace(id) {
  unwrap(await supabase.from('spaces').update({ status: 'Removed', is_available: false }).eq('id', id));
}

export async function uploadSpacePhoto(userId, file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('space-photos').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from('space-photos').getPublicUrl(path).data.publicUrl;
}

const BOOKING_COLUMNS = `
  *,
  space:spaces ( id, title, location, city, price_type ),
  driver:profiles!bookings_driver_id_fkey ( id, first_name, last_name ),
  host:profiles!bookings_host_id_fkey ( id, first_name, last_name )
`;

const toBooking = (row) => ({
  ...row,
  service_id: row.space_id,
  service_title: row.space?.title || 'Removed space',
  service_location: row.space?.location,
  service_city: row.space?.city,
  requester_name: fullName(row.driver),
  provider_name: fullName(row.host)
});

export async function createBooking(input) {
  const { data } = unwrap(await supabase.from('bookings').insert({
    space_id: input.space_id,
    preferred_date: input.preferred_date,
    preferred_time: input.preferred_time,
    duration_minutes: Number(input.duration_minutes),
    vehicle_plate: input.vehicle_plate,
    vehicle_type: input.vehicle_type,
    message: input.message || null
  }).select('id, agreed_price, status').single());
  return data;
}

export async function listBookings(userId) {
  const { data } = unwrap(
    await supabase.from('bookings').select(BOOKING_COLUMNS)
      .or(`driver_id.eq.${userId},host_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100)
  );
  const bookings = data.map(toBooking);
  return {
    received: bookings.filter((b) => b.host_id === userId),
    mine: bookings.filter((b) => b.driver_id === userId)
  };
}

const ACTION_MESSAGES = {
  accept: 'Booking approved',
  reject: 'Booking declined',
  complete: 'Booking marked as completed',
  cancel: 'Booking cancelled'
};

export async function updateBookingStatus(bookingId, action) {
  unwrap(await supabase.rpc('update_booking_status', { p_booking_id: bookingId, p_action: action }));
  return ACTION_MESSAGES[action];
}

export async function listReviewsFor(userId) {
  const { data } = unwrap(
    await supabase.from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey ( first_name, last_name ), booking:bookings ( space:spaces ( title ) )')
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
  );
  return data.map((r) => ({
    ...r,
    reviewer_first_name: r.reviewer?.first_name,
    reviewer_last_name: r.reviewer?.last_name,
    reviewer_name: r.is_anonymous ? 'Anonymous driver' : fullName(r.reviewer),
    service_title: r.booking?.space?.title
  }));
}

export async function createReview(bookingId, rating, comment, isAnonymous = false) {
  unwrap(await supabase.from('reviews').insert({
    booking_id: bookingId, rating, comment: comment || null, is_anonymous: isAnonymous
  }));
}

export async function listMyReviewedBookingIds(userId) {
  const { data } = unwrap(await supabase.from('reviews').select('booking_id').eq('reviewer_id', userId));
  return new Set(data.map((r) => r.booking_id));
}

export async function updateProfile(userId, fields) {
  const allowed = ['first_name', 'last_name', 'phone', 'city', 'bio'];
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  unwrap(await supabase.from('profiles').update(update).eq('id', userId));
}

// Admin panel
export async function adminListUsers() {
  const { data } = unwrap(await supabase.rpc('admin_list_users'));
  return data;
}

export async function adminUpdateUser(userId, { isVerified, isAdmin }) {
  unwrap(await supabase.rpc('admin_update_user', {
    p_user_id: userId,
    p_is_verified: isVerified ?? null,
    p_is_admin: isAdmin ?? null
  }));
}

export async function adminListSpaces() {
  const { data } = unwrap(
    await supabase.from('spaces').select(SPACE_COLUMNS).order('created_at', { ascending: false }).limit(200)
  );
  return data.map(toSpace);
}

export async function platformStats() {
  const [spaces, bookings, profiles] = await Promise.all([
    supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
  ]);
  return { spaces: spaces.count || 0, bookings: bookings.count || 0, users: profiles.count || 0 };
}

export async function sendContactMessage({ name, email, subject, message }) {
  unwrap(await supabase.from('contact_messages').insert({ name, email, subject: subject || null, message }));
}
