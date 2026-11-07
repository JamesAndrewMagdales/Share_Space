import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Car, Clock, Umbrella, Cctv, Zap, ParkingSquare, Star,
  BadgeCheck, CalendarCheck, AlertCircle, CheckCircle2, Pencil, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createBooking, getSpace, listReviewsFor } from '../lib/api';
import {
  BOOKING_DURATIONS, VEHICLE_TYPES, estimateCost, formatHours, formatPrice, isTrue
} from '../constants/parking';
import ParkingTypeIcon from '../components/ParkingTypeIcon';
import './SpaceDetails.css';

const todayISO = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const savedVehicle = () => {
  try {
    return JSON.parse(localStorage.getItem('vehicle')) || {};
  } catch {
    return {};
  }
};

const SpaceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [space, setSpace] = useState(undefined);
  const [reviews, setReviews] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const vehicle = useMemo(savedVehicle, []);
  const [booking, setBooking] = useState({
    preferred_date: todayISO(),
    preferred_time: '08:00',
    duration_minutes: 120,
    vehicle_plate: vehicle.plate || '',
    vehicle_type: vehicle.type || 'Car',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSpace(id)
      .then(async (data) => {
        if (cancelled) return;
        setSpace(data);
        if (data) setReviews(await listReviewsFor(data.host_id).catch(() => []));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message);
          setSpace(null);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  const onChange = (e) => setBooking((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await createBooking({ space_id: Number(id), ...booking });
      try {
        localStorage.setItem('vehicle', JSON.stringify({ plate: booking.vehicle_plate, type: booking.vehicle_type }));
      } catch { /* private mode: ignore */ }
      setSent(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (space === undefined) {
    return (
      <div className="loading" role="status"><div className="spinner" /><span>Loading parking space…</span></div>
    );
  }

  if (!space) {
    return (
      <div className="container page">
        <div className="card empty">
          <div className="empty-icon"><ParkingSquare size={28} /></div>
          <h3>Parking space not found</h3>
          <p>{loadError || 'It may have been removed by the host.'}</p>
          <Link to="/search" className="btn btn-primary">Find other spaces</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === space.host_id;
  const slots = Number(space.slot_count) || 1;
  const rating = Number(space.provider_rating) || 0;
  const cost = estimateCost(space.price, space.price_type, Number(booking.duration_minutes));
  const available = isTrue(space.is_available) && space.status === 'Active';
  const amenities = [
    { flag: space.is_covered, icon: Umbrella, label: 'Covered / roofed' },
    { flag: space.has_cctv, icon: Cctv, label: 'CCTV or guard' },
    { flag: space.has_ev_charging, icon: Zap, label: 'EV charging' }
  ];

  return (
    <div className="container page space-page">
      <button className="btn btn-ghost btn-sm back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="space-layout">
        <div className="space-main">
          <div className="space-photo">
            {space.image && !imageFailed ? (
              <img src={space.image} alt={space.title} onError={() => setImageFailed(true)} />
            ) : (
              <div className="space-photo-empty" aria-hidden="true">
                <ParkingTypeIcon name={space.category_name} size={64} strokeWidth={1.4} />
              </div>
            )}
          </div>

          <header className="space-head">
            <div className="space-badges">
              {space.category_name && <span className="badge badge-primary">{space.category_name}</span>}
              {available
                ? <span className="badge badge-success">Accepting bookings</span>
                : <span className="badge">Not taking bookings right now</span>}
            </div>
            <h1>{space.title}</h1>
            <p className="space-address"><MapPin size={18} /> {[space.location, space.city].filter(Boolean).join(', ')}</p>
          </header>

          <div className="facts">
            <div className="fact"><ParkingSquare size={20} /><div><strong>{slots}</strong><span>{slots === 1 ? 'slot' : 'slots'}</span></div></div>
            <div className="fact"><Car size={20} /><div><strong>{space.vehicle_type === 'Any' ? 'Any' : space.vehicle_type}</strong><span>fits</span></div></div>
            <div className="fact"><Clock size={20} /><div><strong>{formatHours(space)}</strong><span>hours</span></div></div>
            <div className="fact"><Eye size={20} /><div><strong>{space.views_count || 0}</strong><span>views</span></div></div>
          </div>

          <section className="space-section">
            <h2>About this space</h2>
            <p className="space-desc">{space.description || 'The host hasn’t added a description yet.'}</p>
          </section>

          <section className="space-section">
            <h2>Amenities</h2>
            <ul className="amenities">
              {amenities.map((a) => (
                <li key={a.label} className={isTrue(a.flag) ? 'yes' : 'no'}>
                  <a.icon size={18} aria-hidden="true" />
                  <span>{a.label}</span>
                  <span className="sr-only">{isTrue(a.flag) ? 'included' : 'not included'}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-section">
            <h2>Your host</h2>
            <div className="host">
              <span className="avatar avatar-lg" aria-hidden="true">{space.provider_name.charAt(0)}</span>
              <div>
                <h3>
                  {space.provider_name}
                  {isTrue(space.provider_verified) && <span className="badge badge-success"><BadgeCheck size={13} /> Verified</span>}
                </h3>
                <p className="muted small host-rating">
                  <Star size={15} fill="#f59e0b" color="#f59e0b" />
                  {rating > 0 ? `${rating.toFixed(1)} · ${space.provider_total_reviews} ${space.provider_total_reviews === 1 ? 'review' : 'reviews'}` : 'New host'}
                </p>
                {space.provider_bio && <p className="host-bio">{space.provider_bio}</p>}
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="reviews">
                {reviews.slice(0, 4).map((r) => (
                  <figure key={r.id} className="review">
                    <div className="stars" aria-label={`${r.rating} out of 5`}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < r.rating ? '#f59e0b' : 'none'} color="#f59e0b" aria-hidden="true" />
                      ))}
                    </div>
                    {r.comment && <blockquote>{r.comment}</blockquote>}
                    <figcaption>{r.reviewer_name}{r.service_title ? ` · ${r.service_title}` : ''}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="book card">
          <div className="book-price">
            <strong>{formatPrice(space.price, space.price_type)}</strong>
            {space.price_type !== 'Free' && <span className="muted small">{space.price_type.toLowerCase()} rate</span>}
          </div>

          {isOwner ? (
            <div className="book-owner">
              <p className="muted">This is your listing.</p>
              <Link to={`/spaces/${space.id}/edit`} className="btn btn-secondary btn-block"><Pencil size={16} /> Edit space</Link>
              <Link to="/dashboard?tab=requests" className="btn btn-primary btn-block">See booking requests</Link>
            </div>
          ) : sent ? (
            <div className="book-sent" role="status">
              <div className="empty-icon"><CheckCircle2 size={28} /></div>
              <h3>Request sent!</h3>
              <p className="muted">
                The host will approve or decline your booking. Total: <strong>{Number(sent.agreed_price) > 0 ? `₱${Number(sent.agreed_price).toLocaleString()}` : 'Free'}</strong>.
              </p>
              <Link to="/dashboard?tab=bookings" className="btn btn-primary btn-block">Track my booking</Link>
            </div>
          ) : !available ? (
            <p className="muted">The host has paused bookings for this space. Check back later or browse other spaces.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

              <div className="field-row tight">
                <div className="field">
                  <label htmlFor="preferred_date">Date</label>
                  <input type="date" id="preferred_date" name="preferred_date" min={todayISO()}
                    value={booking.preferred_date} onChange={onChange} required />
                </div>
                <div className="field">
                  <label htmlFor="preferred_time">Arrival</label>
                  <input type="time" id="preferred_time" name="preferred_time"
                    value={booking.preferred_time} onChange={onChange} required />
                </div>
              </div>

              <div className="field">
                <label htmlFor="duration_minutes">How long</label>
                <select id="duration_minutes" name="duration_minutes" value={booking.duration_minutes} onChange={onChange}>
                  {BOOKING_DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div className="field-row tight">
                <div className="field">
                  <label htmlFor="vehicle_plate">Plate number</label>
                  <input id="vehicle_plate" name="vehicle_plate" placeholder="ABC 1234" maxLength={20}
                    autoCapitalize="characters" value={booking.vehicle_plate} onChange={onChange} required />
                </div>
                <div className="field">
                  <label htmlFor="vehicle_type">Vehicle</label>
                  <select id="vehicle_type" name="vehicle_type" value={booking.vehicle_type} onChange={onChange}>
                    {VEHICLE_TYPES.filter((v) => v !== 'Any').map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="message">Note to host <span className="optional">(optional)</span></label>
                <textarea id="message" name="message" rows={3} placeholder="e.g., I’ll leave before 6 PM."
                  value={booking.message} onChange={onChange} />
              </div>

              <div className="book-total">
                <span>Total</span>
                <strong>{cost === 0 ? 'Free' : `₱${cost.toLocaleString()}`}</strong>
              </div>

              {user ? (
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Sending…</> : <><CalendarCheck size={18} /> Request booking</>}
                </button>
              ) : (
                <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary btn-lg btn-block">
                  <CalendarCheck size={18} /> Log in to book
                </Link>
              )}
              <p className="book-note">No payment here. You pay the host once they approve.</p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SpaceDetails;
