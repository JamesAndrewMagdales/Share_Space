import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Inbox, ParkingSquare, Star, UserCog, Plus, Search,
  Clock, MapPin, Car, Pencil, Trash2, Pause, Play, AlertCircle, CheckCircle2, X, Wallet, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createReview, listBookings, listMyReviewedBookingIds, listMySpaces, listReviewsFor,
  removeSpace, updateBookingStatus, updateProfile, updateSpace
} from '../lib/api';
import { VEHICLE_TYPES, formatDuration, formatPrice, formatTime } from '../constants/parking';
import './Dashboard.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bookings', label: 'My bookings', icon: CalendarCheck },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'spaces', label: 'My spaces', icon: ParkingSquare },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'profile', label: 'Profile', icon: UserCog }
];

// Old ?tab= values from the previous dashboard
const TAB_ALIASES = { services: 'spaces', settings: 'profile', marketplace: 'overview' };

const STATUS = {
  Pending: { label: 'Pending', className: 'badge-warning' },
  Accepted: { label: 'Approved', className: 'badge-success' },
  Completed: { label: 'Completed', className: 'badge-primary' },
  Rejected: { label: 'Declined', className: 'badge-danger' },
  Cancelled: { label: 'Cancelled', className: '' }
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
};

const money = (value) => (Number(value) > 0 ? `₱${Number(value).toLocaleString()}` : 'Free');

const Dashboard = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab = TABS.some((t) => t.id === (TAB_ALIASES[rawTab] || rawTab)) ? (TAB_ALIASES[rawTab] || rawTab) : 'overview';

  const [bookings, setBookings] = useState({ received: [], mine: [] });
  const [spaces, setSpaces] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewed, setReviewed] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [b, s, r, done] = await Promise.all([
        listBookings(user.id),
        listMySpaces(user.id),
        listReviewsFor(user.id),
        listMyReviewedBookingIds(user.id)
      ]);
      setBookings(b);
      setSpaces(s);
      setReviews(r);
      setReviewed(done);
    } catch (err) {
      setError(`Couldn’t load your dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const goTab = (id) => setParams(id === 'overview' ? {} : { tab: id });
  const flash = (message) => { setNotice(message); setError(''); };

  const act = async (booking, action) => {
    setBusyId(booking.id);
    try {
      flash(await updateBookingStatus(booking.id, action));
      setBookings(await listBookings(user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSpace = async (space) => {
    setBusyId(`s${space.id}`);
    try {
      await updateSpace(space.id, { is_available: !space.is_available });
      setSpaces((list) => list.map((s) => (s.id === space.id ? { ...s, is_available: !s.is_available } : s)));
      flash(space.is_available ? 'Bookings paused for this space' : 'Space is accepting bookings again');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    try {
      await removeSpace(removing.id);
      setSpaces((list) => list.filter((s) => s.id !== removing.id));
      flash('Space removed');
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      upcoming: bookings.mine.filter((b) => ['Pending', 'Accepted'].includes(b.status) && b.preferred_date >= today),
      pending: bookings.received.filter((b) => b.status === 'Pending'),
      earnings: bookings.received.filter((b) => b.status === 'Completed').reduce((sum, b) => sum + Number(b.agreed_price || 0), 0)
    };
  }, [bookings]);

  const firstName = profile?.first_name || 'there';

  const renderBooking = (b, role) => {
    const isHost = role === 'host';
    const busy = busyId === b.id;
    const status = STATUS[b.status] || { label: b.status, className: '' };
    const canReview = !isHost && b.status === 'Completed' && !reviewed.has(b.id);
    return (
      <article key={b.id} className="booking card">
        <div className="booking-date" aria-hidden="true">
          <span>{new Date(`${b.preferred_date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short' })}</span>
          <strong>{new Date(`${b.preferred_date}T00:00:00`).getDate()}</strong>
        </div>
        <div className="booking-info">
          <div className="booking-title">
            <Link to={`/spaces/${b.space_id}`}><h3>{b.service_title}</h3></Link>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>
          <p className="booking-meta">
            <span><Clock size={14} /> {formatDate(b.preferred_date)}, {formatTime(b.preferred_time)} · {formatDuration(b.duration_minutes)}</span>
            <span><Car size={14} /> {b.vehicle_plate}{b.vehicle_type ? ` · ${b.vehicle_type}` : ''}</span>
            {!isHost && b.service_city && <span><MapPin size={14} /> {[b.service_location, b.service_city].filter(Boolean).join(', ')}</span>}
          </p>
          <p className="booking-who">
            {isHost ? `Driver: ${b.requester_name}` : `Host: ${b.provider_name}`} · <strong>{money(b.agreed_price)}</strong>
          </p>
          {b.message && <p className="booking-note">“{b.message}”</p>}
        </div>
        <div className="booking-actions">
          {isHost && b.status === 'Pending' && (
            <>
              <button className="btn btn-success btn-sm" disabled={busy} onClick={() => act(b, 'accept')}>Approve</button>
              <button className="btn btn-danger-soft btn-sm" disabled={busy} onClick={() => act(b, 'reject')}>Decline</button>
            </>
          )}
          {b.status === 'Accepted' && (
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => act(b, 'complete')}>Mark completed</button>
          )}
          {!isHost && ['Pending', 'Accepted'].includes(b.status) && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(b, 'cancel')}>Cancel</button>
          )}
          {canReview && (
            <button className="btn btn-primary btn-sm" onClick={() => setReviewing(b)}><Star size={14} /> Review</button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="container page dashboard">
      <div className="page-head">
        <div>
          <h1>Hi, {firstName}</h1>
          <p>Manage your bookings, requests and parking spaces.</p>
        </div>
        <div className="head-actions">
          <Link to="/search" className="btn btn-secondary"><Search size={16} /> Find parking</Link>
          <Link to="/list-space" className="btn btn-primary"><Plus size={16} /> List a space</Link>
        </div>
      </div>

      <nav className="tabs" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => goTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <t.icon size={17} aria-hidden="true" /> {t.label}
            {t.id === 'requests' && stats.pending.length > 0 && <span className="count">{stats.pending.length}</span>}
          </button>
        ))}
      </nav>

      {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
      {notice && <div className="alert alert-success" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}

      {loading ? (
        <div className="loading" role="status"><div className="spinner" /><span>Loading your dashboard…</span></div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="overview">
              <div className="stat-grid">
                <button className="stat card" onClick={() => goTab('bookings')}>
                  <CalendarCheck size={20} /><strong>{stats.upcoming.length}</strong><span>Upcoming bookings</span>
                </button>
                <button className="stat card" onClick={() => goTab('requests')}>
                  <Inbox size={20} /><strong>{stats.pending.length}</strong><span>Requests to review</span>
                </button>
                <button className="stat card" onClick={() => goTab('spaces')}>
                  <ParkingSquare size={20} /><strong>{spaces.length}</strong><span>Listed spaces</span>
                </button>
                <div className="stat card">
                  <Wallet size={20} /><strong>₱{stats.earnings.toLocaleString()}</strong><span>Earned (completed)</span>
                </div>
              </div>

              <div className="overview-cols">
                <section>
                  <div className="section-title">
                    <h2>Needs your answer</h2>
                    {stats.pending.length > 0 && <button className="link-btn" onClick={() => goTab('requests')}>View all</button>}
                  </div>
                  {stats.pending.length === 0 ? (
                    <div className="card empty compact"><p>No pending requests. New booking requests for your spaces appear here.</p></div>
                  ) : stats.pending.slice(0, 3).map((b) => renderBooking(b, 'host'))}
                </section>
                <section>
                  <div className="section-title">
                    <h2>Your next parking</h2>
                    {stats.upcoming.length > 0 && <button className="link-btn" onClick={() => goTab('bookings')}>View all</button>}
                  </div>
                  {stats.upcoming.length === 0 ? (
                    <div className="card empty compact">
                      <p>No upcoming bookings.</p>
                      <Link to="/search" className="btn btn-secondary btn-sm">Find parking</Link>
                    </div>
                  ) : [...stats.upcoming].sort((a, b) => a.preferred_date.localeCompare(b.preferred_date)).slice(0, 3).map((b) => renderBooking(b, 'driver'))}
                </section>
              </div>
            </div>
          )}

          {tab === 'bookings' && (
            <div className="list">
              {bookings.mine.length === 0 ? (
                <div className="card empty">
                  <div className="empty-icon"><CalendarCheck size={28} /></div>
                  <h3>No bookings yet</h3>
                  <p>When you request a parking space, you can track it here.</p>
                  <Link to="/search" className="btn btn-primary">Find parking</Link>
                </div>
              ) : bookings.mine.map((b) => renderBooking(b, 'driver'))}
            </div>
          )}

          {tab === 'requests' && (
            <div className="list">
              {bookings.received.length === 0 ? (
                <div className="card empty">
                  <div className="empty-icon"><Inbox size={28} /></div>
                  <h3>No booking requests yet</h3>
                  <p>{spaces.length ? 'Drivers’ requests for your spaces will show up here.' : 'List a space to start receiving requests.'}</p>
                  {!spaces.length && <Link to="/list-space" className="btn btn-primary">List a space</Link>}
                </div>
              ) : bookings.received.map((b) => renderBooking(b, 'host'))}
            </div>
          )}

          {tab === 'spaces' && (
            spaces.length === 0 ? (
              <div className="card empty">
                <div className="empty-icon"><ParkingSquare size={28} /></div>
                <h3>You haven’t listed a space</h3>
                <p>Got an empty garage, driveway or condo slot? Earn from it.</p>
                <Link to="/list-space" className="btn btn-primary">List your space</Link>
              </div>
            ) : (
              <div className="my-spaces">
                {spaces.map((s) => (
                  <article key={s.id} className="my-space card">
                    <Link to={`/spaces/${s.id}`} className="my-space-thumb">
                      {s.image ? <img src={s.image} alt="" /> : <ParkingSquare size={28} />}
                    </Link>
                    <div className="my-space-info">
                      <div className="booking-title">
                        <Link to={`/spaces/${s.id}`}><h3>{s.title}</h3></Link>
                        {s.is_available
                          ? <span className="badge badge-success">Accepting bookings</span>
                          : <span className="badge">Paused</span>}
                      </div>
                      <p className="booking-meta">
                        <span><MapPin size={14} /> {s.location}, {s.city}</span>
                        <span>{formatPrice(s.price, s.price_type)}</span>
                        <span><Eye size={14} /> {s.views_count} views</span>
                      </p>
                    </div>
                    <div className="booking-actions">
                      <button className="btn btn-secondary btn-sm" disabled={busyId === `s${s.id}`} onClick={() => toggleSpace(s)}>
                        {s.is_available ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                      </button>
                      <Link to={`/spaces/${s.id}/edit`} className="icon-btn" aria-label={`Edit ${s.title}`}><Pencil size={16} /></Link>
                      <button className="icon-btn danger" onClick={() => setRemoving(s)} aria-label={`Remove ${s.title}`}><Trash2 size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )
          )}

          {tab === 'reviews' && (
            reviews.length === 0 ? (
              <div className="card empty">
                <div className="empty-icon"><Star size={28} /></div>
                <h3>No reviews yet</h3>
                <p>Drivers can review you after a completed booking.</p>
              </div>
            ) : (
              <>
                <p className="rating-summary">
                  <Star size={20} fill="#f59e0b" color="#f59e0b" />
                  <strong>{Number(profile?.rating_avg || 0).toFixed(1)}</strong>
                  <span className="muted">from {profile?.total_reviews || reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
                </p>
                <div className="review-list">
                  {reviews.map((r) => (
                    <figure key={r.id} className="card card-pad">
                      <div className="stars" aria-label={`${r.rating} out of 5`}>
                        {[...Array(5)].map((_, i) => <Star key={i} size={15} fill={i < r.rating ? '#f59e0b' : 'none'} color="#f59e0b" aria-hidden="true" />)}
                      </div>
                      {r.comment && <blockquote>{r.comment}</blockquote>}
                      <figcaption className="muted small">{r.reviewer_name}{r.service_title ? ` · ${r.service_title}` : ''}</figcaption>
                    </figure>
                  ))}
                </div>
              </>
            )
          )}

          {tab === 'profile' && (
            <ProfileForm
              user={user}
              profile={profile}
              onSaved={async () => { await refreshProfile(); flash('Profile saved'); }}
              onError={setError}
            />
          )}
        </>
      )}

      {removing && (
        <div className="modal-backdrop" onClick={() => setRemoving(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="remove-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2 id="remove-title" style={{ fontSize: '1.125rem' }}>Remove this space?</h2></div>
            <div className="modal-body">
              <p><strong>{removing.title}</strong> will disappear from search. Existing bookings stay in your history.</p>
              <p className="muted small" style={{ marginTop: 8 }}>To stop bookings for a while instead, use Pause.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRemoving(null)}>Keep it</button>
              <button className="btn btn-danger" onClick={confirmRemove}>Remove space</button>
            </div>
          </div>
        </div>
      )}

      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewed((set) => new Set(set).add(reviewing.id));
            setReviewing(null);
            flash('Thanks for your review!');
          }}
        />
      )}
    </div>
  );
};

const ProfileForm = ({ user, profile, onSaved, onError }) => {
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    bio: profile?.bio || ''
  });
  const [vehicle, setVehicle] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vehicle')) || { plate: '', type: 'Car' }; } catch { return { plate: '', type: 'Car' }; }
  });
  const [saving, setSaving] = useState(false);
  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(user.id, form);
      try { localStorage.setItem('vehicle', JSON.stringify(vehicle)); } catch { /* ignore */ }
      await onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="profile-grid" onSubmit={submit}>
      <section className="card card-pad">
        <h2 className="card-title">Your details</h2>
        <div className="field-row">
          <div className="field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" value={form.first_name} onChange={onChange} required /></div>
          <div className="field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" value={form.last_name} onChange={onChange} required /></div>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" value={user?.email || ''} disabled />
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="phone">Mobile</label><input id="phone" name="phone" type="tel" value={form.phone} onChange={onChange} /></div>
          <div className="field"><label htmlFor="city">City</label><input id="city" name="city" value={form.city} onChange={onChange} /></div>
        </div>
        <div className="field">
          <label htmlFor="bio">About you</label>
          <textarea id="bio" name="bio" rows={4} placeholder="Tell drivers a bit about yourself and your space." value={form.bio} onChange={onChange} />
          <span className="hint">Shown to drivers on your listings.</span>
        </div>
      </section>
      <section className="card card-pad">
        <h2 className="card-title">My vehicle</h2>
        <p className="muted small" style={{ marginBottom: 16 }}>Filled in automatically when you book. Saved on this device.</p>
        <div className="field"><label htmlFor="plate">Plate number</label><input id="plate" value={vehicle.plate || ''} maxLength={20} onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value.toUpperCase() })} /></div>
        <div className="field">
          <label htmlFor="vtype">Vehicle type</label>
          <select id="vtype" value={vehicle.type || 'Car'} onChange={(e) => setVehicle({ ...vehicle, type: e.target.value })}>
            {VEHICLE_TYPES.filter((v) => v !== 'Any').map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving && <span className="spinner" />} {saving ? 'Saving…' : 'Save changes'}
        </button>
      </section>
    </form>
  );
};

const ReviewModal = ({ booking, onClose, onDone }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createReview(booking.id, rating, comment.trim(), anonymous);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2 id="review-title" style={{ fontSize: '1.125rem' }}>Review {booking.provider_name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error"><AlertCircle size={18} /><span>{error}</span></div>}
          <p className="muted small" style={{ marginBottom: 12 }}>{booking.service_title}</p>
          <div className="star-picker" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}>
                <Star size={32} fill={n <= rating ? '#f59e0b' : 'none'} color="#f59e0b" />
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="comment">How was it?</label>
            <textarea id="comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Easy to find? Safe? Would you park here again?" />
          </div>
          <label className="check"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Post without my name</label>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post review'}</button>
        </div>
      </form>
    </div>
  );
};

export default Dashboard;
