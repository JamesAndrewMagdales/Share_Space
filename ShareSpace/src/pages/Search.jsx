import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, MapPin, SlidersHorizontal, X, AlertCircle, ParkingSquare, Umbrella, Cctv, Zap } from 'lucide-react';
import SpaceCard, { SpaceCardSkeleton } from '../components/SpaceCard';
import { PARKING_TYPES, PRICE_TYPES, VEHICLE_TYPES } from '../constants/parking';
import { listSpaces } from '../lib/api';
import './Search.css';

const AMENITIES = [
  { key: 'isCovered', label: 'Covered', icon: Umbrella },
  { key: 'hasCctv', label: 'CCTV / guard', icon: Cctv },
  { key: 'hasEvCharging', label: 'EV charging', icon: Zap }
];

const FILTER_KEYS = ['category', 'vehicleType', 'priceType', 'isCovered', 'hasCctv', 'hasEvCharging', 'minPrice', 'maxPrice'];

const Search = () => {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [where, setWhere] = useState(params.get('location') || '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [result, setResult] = useState({ spaces: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Math.max(1, parseInt(params.get('page')) || 1);
  const sort = params.get('sort') || 'newest';

  // Keep text inputs in sync with the URL (back button, links from the home page)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQ(params.get('q') || '');
    setWhere(params.get('location') || '');
    setMinPrice(params.get('minPrice') || '');
    setMaxPrice(params.get('maxPrice') || '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    listSpaces({
      search: params.get('q'),
      location: params.get('location'),
      typeId: params.get('category'),
      vehicleType: params.get('vehicleType'),
      priceType: params.get('priceType'),
      isCovered: params.get('isCovered') === 'true',
      hasCctv: params.get('hasCctv') === 'true',
      hasEvCharging: params.get('hasEvCharging') === 'true',
      minPrice: params.get('minPrice'),
      maxPrice: params.get('maxPrice'),
      sort,
      page
    })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params, page, sort]);

  const update = (changes, keepPage = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === false) next.delete(key);
      else next.set(key, value);
    });
    if (!keepPage) next.delete('page');
    setParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    update({ q: q.trim(), location: where.trim() });
  };

  const applyPrice = (e) => {
    e.preventDefault();
    update({ minPrice, maxPrice });
  };

  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;
  const clearFilters = () => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));

  return (
    <div className="search-page">
      <div className="search-hero">
        <div className="container">
          <h1>Find parking</h1>
          <form className="search-bar" onSubmit={handleSearch} role="search">
            <div className="input-icon">
              <SearchIcon size={18} aria-hidden="true" />
              <input className="input" aria-label="Keyword" placeholder="Garage, near MRT, condo…"
                value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="input-icon">
              <MapPin size={18} aria-hidden="true" />
              <input className="input" aria-label="City or area" placeholder="City or area"
                value={where} onChange={(e) => setWhere(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg">Search</button>
          </form>
        </div>
      </div>

      <div className="container search-layout">
        <aside className={`filters card ${filtersOpen ? 'open' : ''}`} aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            {activeFilters > 0 && <button className="link-btn" onClick={clearFilters}>Clear all</button>}
            <button className="icon-btn filters-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <X size={18} />
            </button>
          </div>

          <fieldset className="filter-group">
            <legend>Parking type</legend>
            <div className="type-list">
              <button className={`type-option ${!params.get('category') ? 'active' : ''}`} onClick={() => update({ category: '' })}>
                All types
              </button>
              {PARKING_TYPES.map((t) => {
                const active = params.get('category') === String(t.id);
                return (
                  <button key={t.id} className={`type-option ${active ? 'active' : ''}`}
                    aria-pressed={active} onClick={() => update({ category: active ? '' : t.id })}>
                    <t.icon size={16} aria-hidden="true" /> {t.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="f-vehicle">My vehicle</label>
            <select id="f-vehicle" value={params.get('vehicleType') || ''} onChange={(e) => update({ vehicleType: e.target.value })}>
              <option value="">Any vehicle</option>
              {VEHICLE_TYPES.filter((v) => v !== 'Any').map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-rate">Rate</label>
            <select id="f-rate" value={params.get('priceType') || ''} onChange={(e) => update({ priceType: e.target.value })}>
              <option value="">Any rate</option>
              {PRICE_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <form className="field" onSubmit={applyPrice}>
            <span className="field-label">Price (₱)</span>
            <div className="price-range">
              <input type="number" min="0" inputMode="numeric" aria-label="Minimum price" placeholder="Min"
                value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <span aria-hidden="true">–</span>
              <input type="number" min="0" inputMode="numeric" aria-label="Maximum price" placeholder="Max"
                value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              <button type="submit" className="btn btn-secondary btn-sm">Go</button>
            </div>
          </form>

          <fieldset className="filter-group">
            <legend>Amenities</legend>
            <div className="pill-row">
              {AMENITIES.map((a) => (
                <label key={a.key} className="toggle-pill">
                  <input type="checkbox" checked={params.get(a.key) === 'true'}
                    onChange={(e) => update({ [a.key]: e.target.checked ? 'true' : '' })} />
                  <span><a.icon size={15} aria-hidden="true" /> {a.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="btn btn-primary btn-block filters-done" onClick={() => setFiltersOpen(false)}>
            Show {result.total} {result.total === 1 ? 'space' : 'spaces'}
          </button>
        </aside>

        <section className="results" aria-live="polite">
          <div className="results-bar">
            <p className="results-count">
              {loading ? 'Searching…' : `${result.total} parking ${result.total === 1 ? 'space' : 'spaces'}`}
            </p>
            <div className="results-actions">
              <button className="btn btn-secondary btn-sm filters-toggle" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={16} /> Filters{activeFilters > 0 && ` (${activeFilters})`}
              </button>
              <label className="sort">
                <span className="sr-only">Sort by</span>
                <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
                  <option value="newest">Newest first</option>
                  <option value="price">Lowest price</option>
                  <option value="rating">Top-rated hosts</option>
                  <option value="title">Name A–Z</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={18} /><span>Couldn’t load spaces: {error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-grid">
              {Array.from({ length: 6 }).map((_, i) => <SpaceCardSkeleton key={i} />)}
            </div>
          ) : result.spaces.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon"><ParkingSquare size={28} /></div>
              <h3>No parking spaces match</h3>
              <p>Try a nearby area or remove a filter.</p>
              {activeFilters > 0 && <button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
            </div>
          ) : (
            <div className="space-grid">
              {result.spaces.map((space) => <SpaceCard key={space.id} space={space} />)}
            </div>
          )}

          {result.totalPages > 1 && (
            <nav className="pagination" aria-label="Pages">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => update({ page: page - 1 }, true)}>Previous</button>
              <span className="muted small">Page {page} of {result.totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= result.totalPages} onClick={() => update({ page: page + 1 }, true)}>Next</button>
            </nav>
          )}
        </section>
      </div>
      {filtersOpen && <div className="filters-backdrop" onClick={() => setFiltersOpen(false)} />}
    </div>
  );
};

export default Search;
