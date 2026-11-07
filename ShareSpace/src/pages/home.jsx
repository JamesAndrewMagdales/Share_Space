import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  ArrowRight,
  CalendarCheck,
  ParkingSquare,
  ShieldCheck,
  Wallet,
  Clock,
  ListPlus,
  CheckCircle2,
  Car
} from 'lucide-react';
import SpaceCard, { SpaceCardSkeleton } from '../components/SpaceCard';
import { PARKING_TYPES } from '../constants/parking';
import { listSpaces } from '../lib/api';
import './Home.css';

const DRIVER_STEPS = [
  { icon: Search, title: 'Search where you’re going', text: 'Filter by area, vehicle size, covered parking, CCTV or EV charging.' },
  { icon: CalendarCheck, title: 'Request a booking', text: 'Pick a date, arrival time and how long you’ll stay. You see the total before you send.' },
  { icon: ParkingSquare, title: 'Park and go', text: 'Once the host approves, drive in. Leave a review afterwards to help other drivers.' }
];

const HOST_STEPS = [
  { icon: ListPlus, title: 'List your space', text: 'Add the address, slot size, hours and your rate: hourly, daily, monthly or free.' },
  { icon: CheckCircle2, title: 'Approve requests', text: 'You see each driver’s plate number and schedule, and you decide who parks.' },
  { icon: Wallet, title: 'Earn from idle space', text: 'Your garage or driveway pays for itself while you’re at work or away.' }
];

const Home = () => {
  const navigate = useNavigate();
  const [where, setWhere] = useState('');
  const [typeId, setTypeId] = useState('');
  const [latest, setLatest] = useState(null);
  const [audience, setAudience] = useState('drivers');
  const [rate, setRate] = useState(40);
  const [hours, setHours] = useState(8);

  useEffect(() => {
    listSpaces({ page: 1 })
      .then(({ spaces }) => setLatest(spaces.slice(0, 8)))
      .catch(() => setLatest([]));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (where.trim()) params.set('location', where.trim());
    if (typeId) params.set('category', typeId);
    navigate(`/search?${params.toString()}`);
  };

  const steps = audience === 'drivers' ? DRIVER_STEPS : HOST_STEPS;
  const monthly = Math.round(rate * hours * 22);

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="pulse" aria-hidden="true" /> Parking, shared by neighbors</span>
            <h1>Stop circling the block. <span>Park in a neighbor’s spot.</span></h1>
            <p className="hero-lead">
              Book unused garages, driveways and condo slots near where you’re going, or list
              your own empty space and earn from it.
            </p>

            <form className="hero-search" onSubmit={handleSearch} role="search">
              <label className="hero-field">
                <span>Where</span>
                <div className="input-icon">
                  <MapPin size={18} aria-hidden="true" />
                  <input
                    className="input"
                    placeholder="City, area or landmark"
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                  />
                </div>
              </label>
              <label className="hero-field">
                <span>Type</span>
                <select className="input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                  <option value="">Any parking</option>
                  {PARKING_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary btn-lg">
                <Search size={18} /> Find parking
              </button>
            </form>

            <ul className="hero-points">
              <li><ShieldCheck size={18} /> Host-approved bookings</li>
              <li><Clock size={18} /> Hourly, daily or monthly</li>
            </ul>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="lot">
              {['taken', 'free', 'taken', 'taken', 'taken', 'free', 'taken', 'free'].map((state, i) => (
                <div key={i} className={`bay ${state}`}>
                  {state === 'taken' ? <Car size={30} strokeWidth={1.5} /> : <span>P</span>}
                </div>
              ))}
            </div>
            <div className="hero-ticket">
              <div className="ticket-top">
                <span className="badge badge-success">Approved</span>
                <span className="ticket-price">₱150</span>
              </div>
              <strong>Covered garage · Makati</strong>
              <span>Tomorrow, 8:00 AM · 3 hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow">How it works</span>
            <h2>Simple for drivers and hosts</h2>
            <div className="segmented" role="tablist" aria-label="Who is this for">
              <button role="tab" aria-selected={audience === 'drivers'} className={audience === 'drivers' ? 'active' : ''} onClick={() => setAudience('drivers')}>
                I need parking
              </button>
              <button role="tab" aria-selected={audience === 'hosts'} className={audience === 'hosts' ? 'active' : ''} onClick={() => setAudience('hosts')}>
                I have a space
              </button>
            </div>
          </div>
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={step.title} className="step">
                <div className="step-num">{i + 1}</div>
                <step.icon size={26} className="step-icon" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Parking types */}
      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Browse</span>
              <h2>Every kind of parking</h2>
            </div>
            <Link to="/search" className="btn btn-secondary">All spaces <ArrowRight size={16} /></Link>
          </div>
          <div className="type-grid">
            {PARKING_TYPES.map((type) => (
              <Link key={type.id} to={`/search?category=${type.id}`} className="type-tile">
                <span className="type-icon"><type.icon size={22} /></span>
                <span>{type.name}</span>
                <ArrowRight size={16} className="type-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest spaces */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Just listed</span>
              <h2>Latest parking spaces</h2>
            </div>
            {latest?.length > 0 && (
              <Link to="/search" className="btn btn-secondary">See all <ArrowRight size={16} /></Link>
            )}
          </div>

          {latest === null ? (
            <div className="space-grid">
              {Array.from({ length: 4 }).map((_, i) => <SpaceCardSkeleton key={i} />)}
            </div>
          ) : latest.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon"><ParkingSquare size={28} /></div>
              <h3>No spaces listed yet</h3>
              <p>Be the first host in your area. It takes about two minutes.</p>
              <Link to="/list-space" className="btn btn-primary">List your space</Link>
            </div>
          ) : (
            <div className="space-grid">
              {latest.map((space) => <SpaceCard key={space.id} space={space} />)}
            </div>
          )}
        </div>
      </section>

      {/* Host earnings */}
      <section className="section">
        <div className="container">
          <div className="host-band">
            <div className="host-copy">
              <span className="eyebrow">For hosts</span>
              <h2>Your empty slot could pay for itself</h2>
              <p>Most garages and driveways sit empty during office hours. Set your own rate and schedule, and approve every booking yourself.</p>
              <Link to="/list-space" className="btn btn-white btn-lg">
                List your space <ArrowRight size={18} />
              </Link>
            </div>
            <div className="calc">
              <div className="calc-row">
                <label htmlFor="calc-rate">Hourly rate</label>
                <output>₱{rate}</output>
              </div>
              <input id="calc-rate" type="range" min="10" max="150" step="5" value={rate}
                onChange={(e) => setRate(Number(e.target.value))} />
              <div className="calc-row">
                <label htmlFor="calc-hours">Hours booked per weekday</label>
                <output>{hours} h</output>
              </div>
              <input id="calc-hours" type="range" min="1" max="12" value={hours}
                onChange={(e) => setHours(Number(e.target.value))} />
              <div className="calc-total">
                <span>Estimated per month</span>
                <strong>₱{monthly.toLocaleString()}</strong>
                <small>Based on 22 weekdays. Actual earnings depend on demand.</small>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
