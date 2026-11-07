import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Trash2, AlertCircle, CheckCircle2, Umbrella, Cctv, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createSpace, getSpace, updateSpace, uploadSpacePhoto } from '../lib/api';
import { PARKING_TYPES, PRICE_TYPES, VEHICLE_TYPES } from '../constants/parking';
import './SpaceForm.css';

const EMPTY = {
  title: '',
  description: '',
  type_id: '',
  location: '',
  city: '',
  vehicle_type: 'Car',
  slot_count: 1,
  is_covered: false,
  has_cctv: false,
  has_ev_charging: false,
  is_24_7: true,
  available_from: '06:00',
  available_to: '22:00',
  price_type: 'Hourly',
  price: '',
  image_url: null,
  is_available: true
};

// List a new parking space (/list-space) or edit one (/spaces/:id/edit)
const SpaceForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInput = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getSpace(id)
      .then((space) => {
        if (!space || space.host_id !== user?.id) {
          setError('You can only edit your own parking spaces.');
          return;
        }
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, space[k] ?? EMPTY[k]])),
          available_from: space.available_from?.slice(0, 5) || '06:00',
          available_to: space.available_to?.slice(0, 5) || '22:00',
          type_id: space.type_id ?? ''
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, user?.id]);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      set('image_url', await uploadSpacePhoto(user.id, file));
    } catch (err) {
      setError(`Photo upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.is_24_7 && form.available_from >= form.available_to) {
      setError('Closing time must be later than opening time.');
      return;
    }
    if (form.price_type !== 'Free' && !(Number(form.price) > 0)) {
      setError('Enter a price, or choose “Free”.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        type_id: form.type_id ? Number(form.type_id) : null,
        slot_count: Number(form.slot_count) || 1,
        price: form.price_type === 'Free' ? 0 : Number(form.price),
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        city: form.city.trim()
      };
      if (isEdit) {
        await updateSpace(id, payload);
        navigate(`/spaces/${id}`);
      } else {
        const created = await createSpace(payload);
        setDone(true);
        setTimeout(() => navigate(`/spaces/${created.id}`), 900);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading" role="status"><div className="spinner" /><span>Loading…</span></div>;
  }

  const isFree = form.price_type === 'Free';
  const rateLabel = PRICE_TYPES.find((p) => p.value === form.price_type)?.label.toLowerCase();

  return (
    <div className="container container-narrow page">
      <Link to={isEdit ? `/spaces/${id}` : '/dashboard?tab=spaces'} className="btn btn-ghost btn-sm back-link">
        <ArrowLeft size={16} /> {isEdit ? 'Back to space' : 'Back to my spaces'}
      </Link>

      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit parking space' : 'List your parking space'}</h1>
          <p>{isEdit ? 'Changes show up for drivers right away.' : 'Share an unused slot with drivers nearby. It takes about two minutes.'}</p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
      {done && <div className="alert alert-success" role="status"><CheckCircle2 size={18} /><span>Your space is live! Opening it…</span></div>}

      <form onSubmit={handleSubmit} className="space-form">
        <section className="card form-card">
          <h2><span>1</span> The basics</h2>
          <div className="field">
            <label htmlFor="title">Listing title</label>
            <input id="title" name="title" minLength={3} maxLength={120} required
              placeholder="e.g., Covered garage near Ayala Triangle" value={form.title} onChange={onChange} />
          </div>
          <div className="field">
            <label htmlFor="type_id">Parking type</label>
            <select id="type_id" name="type_id" value={form.type_id} onChange={onChange} required>
              <option value="">Choose a type</option>
              {PARKING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={5} required
              placeholder="Size of the slot, how to get in, nearby landmarks, house rules…"
              value={form.description} onChange={onChange} />
            <span className="hint">Clear directions mean fewer questions from drivers.</span>
          </div>
        </section>

        <section className="card form-card">
          <h2><span>2</span> Location</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="location">Street / area</label>
              <input id="location" name="location" required autoComplete="address-line1"
                placeholder="e.g., 123 Paseo de Roxas" value={form.location} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" required autoComplete="address-level2"
                placeholder="e.g., Makati" value={form.city} onChange={onChange} />
            </div>
          </div>
          <p className="hint">Drivers search by city and area. Share the exact gate details after you approve a booking.</p>
        </section>

        <section className="card form-card">
          <h2><span>3</span> The space</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="vehicle_type">Fits vehicle</label>
              <select id="vehicle_type" name="vehicle_type" value={form.vehicle_type} onChange={onChange}>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v === 'Any' ? 'Any vehicle' : v}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="slot_count">Available slots</label>
              <input id="slot_count" name="slot_count" type="number" min={1} max={100}
                value={form.slot_count} onChange={onChange} />
            </div>
          </div>
          <span className="field-label">Amenities</span>
          <div className="pill-row amenity-pills">
            <label className="toggle-pill"><input type="checkbox" name="is_covered" checked={form.is_covered} onChange={onChange} /><span><Umbrella size={15} /> Covered</span></label>
            <label className="toggle-pill"><input type="checkbox" name="has_cctv" checked={form.has_cctv} onChange={onChange} /><span><Cctv size={15} /> CCTV / guard</span></label>
            <label className="toggle-pill"><input type="checkbox" name="has_ev_charging" checked={form.has_ev_charging} onChange={onChange} /><span><Zap size={15} /> EV charging</span></label>
          </div>

          <span className="field-label">Photo</span>
          <div className="photo-picker">
            {form.image_url ? (
              <div className="photo-preview">
                <img src={form.image_url} alt="Your parking space" />
                <div className="photo-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()}>Replace</button>
                  <button type="button" className="icon-btn danger" onClick={() => set('image_url', null)} aria-label="Remove photo"><Trash2 size={16} /></button>
                </div>
              </div>
            ) : (
              <button type="button" className="photo-drop" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <span className="spinner" /> : <ImagePlus size={28} />}
                <strong>{uploading ? 'Uploading…' : 'Add a photo'}</strong>
                <span>JPG, PNG or WebP, up to 5 MB. Show the entrance and the slot.</span>
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPhoto} />
          </div>
        </section>

        <section className="card form-card">
          <h2><span>4</span> Hours and price</h2>
          <label className="check">
            <input type="checkbox" name="is_24_7" checked={form.is_24_7} onChange={onChange} />
            Open 24/7
          </label>
          {!form.is_24_7 && (
            <div className="field-row hours-row">
              <div className="field">
                <label htmlFor="available_from">Opens</label>
                <input id="available_from" name="available_from" type="time" value={form.available_from} onChange={onChange} required />
              </div>
              <div className="field">
                <label htmlFor="available_to">Closes</label>
                <input id="available_to" name="available_to" type="time" value={form.available_to} onChange={onChange} required />
              </div>
            </div>
          )}

          <div className="rate-options" role="radiogroup" aria-label="Rate">
            {PRICE_TYPES.map((p) => (
              <label key={p.value} className={`rate-option ${form.price_type === p.value ? 'active' : ''}`}>
                <input type="radio" name="price_type" value={p.value} checked={form.price_type === p.value} onChange={onChange} />
                {p.label}
              </label>
            ))}
          </div>
          {!isFree && (
            <div className="field price-field">
              <label htmlFor="price">Price {rateLabel}</label>
              <div className="input-icon peso">
                <span aria-hidden="true">₱</span>
                <input id="price" name="price" type="number" min="1" step="0.01" inputMode="decimal"
                  placeholder="50" value={form.price} onChange={onChange} required />
              </div>
            </div>
          )}

          {isEdit && (
            <label className="check">
              <input type="checkbox" name="is_available" checked={form.is_available} onChange={onChange} />
              Accepting new bookings
            </label>
          )}
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving || uploading || done}>
            {saving && <span className="spinner" />}
            {isEdit ? (saving ? 'Saving…' : 'Save changes') : (saving ? 'Publishing…' : 'Publish space')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SpaceForm;
