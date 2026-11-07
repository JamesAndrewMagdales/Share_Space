import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ParkingSquare, CalendarCheck, Search, BadgeCheck, Shield, AlertCircle, CheckCircle2, X, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminListSpaces, adminListUsers, adminUpdateUser, platformStats, removeSpace } from '../lib/api';
import { formatPrice } from '../constants/parking';
import './Admin.css';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

// Admin panel: verify hosts, manage admins, moderate listings.
// Every action is checked again in the database (admin-only functions).
const Admin = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [u, s, st] = await Promise.all([adminListUsers(), adminListSpaces(), platformStats()]);
      setUsers(u);
      setSpaces(s);
      setStats(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (target, field) => {
    setBusy(`${target.id}-${field}`);
    setError('');
    try {
      const next = !target[field];
      await adminUpdateUser(target.id, field === 'is_verified' ? { isVerified: next } : { isAdmin: next });
      setUsers((list) => list.map((u) => (u.id === target.id ? { ...u, [field]: next } : u)));
      setNotice(`${target.first_name || target.email} updated`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const takeDown = async (space) => {
    if (!window.confirm(`Remove “${space.title}” from ShareSpace?`)) return;
    setBusy(`space-${space.id}`);
    try {
      await removeSpace(space.id);
      setSpaces((list) => list.map((s) => (s.id === space.id ? { ...s, status: 'Removed', is_available: false } : s)));
      setNotice('Listing removed');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filteredUsers = useMemo(() => users.filter((u) =>
    !q || `${u.first_name} ${u.last_name} ${u.email} ${u.city || ''}`.toLowerCase().includes(q)), [users, q]);
  const filteredSpaces = useMemo(() => spaces.filter((s) =>
    !q || `${s.title} ${s.city} ${s.location} ${s.provider_name}`.toLowerCase().includes(q)), [spaces, q]);

  return (
    <div className="container page admin">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Shield size={14} /> Admin</span>
          <h1>Admin panel</h1>
        </div>
      </div>

      {stats && (
        <div className="stat-grid admin-stats">
          <div className="stat card"><Users size={20} /><strong>{stats.users}</strong><span>Users</span></div>
          <div className="stat card"><ParkingSquare size={20} /><strong>{stats.spaces}</strong><span>Active spaces</span></div>
          <div className="stat card"><CalendarCheck size={20} /><strong>{stats.bookings}</strong><span>Bookings</span></div>
        </div>
      )}

      <div className="admin-toolbar">
        <nav className="tabs" aria-label="Admin sections">
          <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}><Users size={17} /> Users</button>
          <button className={`tab ${tab === 'spaces' ? 'active' : ''}`} onClick={() => setTab('spaces')}><ParkingSquare size={17} /> Listings</button>
        </nav>
        <div className="input-icon admin-search">
          <Search size={18} aria-hidden="true" />
          <input className="input" placeholder={tab === 'users' ? 'Search name, email, city' : 'Search title, city, host'}
            aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
      {notice && <div className="alert alert-success" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Loading…</span></div>
      ) : tab === 'users' ? (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>User</th><th>City</th><th>Spaces</th><th>Joined</th><th>Last login</th><th>Verified host</th><th>Admin</th></tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar" aria-hidden="true">{(u.first_name || u.email).charAt(0).toUpperCase()}</span>
                      <div>
                        <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}{u.id === user.id && <span className="badge" style={{ marginLeft: 6 }}>You</span>}</strong>
                        <span>{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{u.city || '—'}</td>
                  <td>{u.spaces_count}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDate(u.last_sign_in_at)}</td>
                  <td>
                    <button className={`switch ${u.is_verified ? 'on' : ''}`} role="switch" aria-checked={u.is_verified}
                      aria-label={`Verified host: ${u.email}`} disabled={busy === `${u.id}-is_verified`} onClick={() => toggle(u, 'is_verified')}>
                      <span />
                    </button>
                  </td>
                  <td>
                    <button className={`switch ${u.is_admin ? 'on' : ''}`} role="switch" aria-checked={u.is_admin}
                      aria-label={`Admin: ${u.email}`} disabled={busy === `${u.id}-is_admin` || u.id === user.id} onClick={() => toggle(u, 'is_admin')}>
                      <span />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={7} className="muted center">No users found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Listing</th><th>Host</th><th>Rate</th><th>Views</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {filteredSpaces.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="user-cell">
                      <div>
                        <strong><Link to={`/spaces/${s.id}`}>{s.title}</Link></strong>
                        <span>{s.category_name || 'Parking'} · {s.city}</span>
                      </div>
                    </div>
                  </td>
                  <td>{s.provider_name}{s.provider_verified && <BadgeCheck size={14} className="verified-icon" aria-label="Verified" />}</td>
                  <td>{formatPrice(s.price, s.price_type)}</td>
                  <td><span className="inline-icon"><Eye size={14} /> {s.views_count}</span></td>
                  <td>
                    {s.status === 'Removed'
                      ? <span className="badge badge-danger">Removed</span>
                      : s.is_available ? <span className="badge badge-success">Live</span> : <span className="badge">Paused</span>}
                  </td>
                  <td>
                    {s.status !== 'Removed' && (
                      <button className="icon-btn danger" disabled={busy === `space-${s.id}`} onClick={() => takeDown(s)} aria-label={`Remove ${s.title}`}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSpaces.length === 0 && <tr><td colSpan={6} className="muted center">No listings found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Admin;
