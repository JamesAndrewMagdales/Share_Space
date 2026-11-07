import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Plus, LayoutDashboard, LogOut, Shield, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import './Layout.css';

const NAV = [
  { to: '/search', label: 'Find parking' },
  { to: '/list-space', label: 'List your space' },
  { to: '/about', label: 'How it works' }
];

const Layout = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close menus when the page changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onClick = (e) => {
      if (!userMenuRef.current?.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setUserMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'Account';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="layout">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="ShareSpace home">
            <Logo />
          </Link>

          <nav className="main-nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            {user ? (
              <div className="user-menu" ref={userMenuRef}>
                <button
                  className="user-button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar" aria-hidden="true">{initial}</span>
                  <span className="user-name">{firstName}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                {userMenuOpen && (
                  <div className="dropdown" role="menu">
                    <div className="dropdown-head">
                      <strong>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || firstName}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Link to="/dashboard" className="dropdown-item" role="menuitem">
                      <LayoutDashboard size={18} /> Dashboard
                    </Link>
                    <Link to="/dashboard?tab=profile" className="dropdown-item" role="menuitem">
                      <User size={18} /> Profile
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="dropdown-item" role="menuitem">
                        <Shield size={18} /> Admin panel
                      </Link>
                    )}
                    <button className="dropdown-item danger" onClick={handleLogout} role="menuitem">
                      <LogOut size={18} /> Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost header-login">Log in</Link>
                <Link to="/register" className="btn btn-primary">Sign up</Link>
              </>
            )}

            <button
              className="icon-btn menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="mobile-link">
                {item.label}
              </NavLink>
            ))}
            <div className="mobile-divider" />
            {user ? (
              <>
                <NavLink to="/dashboard" className="mobile-link">Dashboard</NavLink>
                {isAdmin && <NavLink to="/admin" className="mobile-link">Admin panel</NavLink>}
                <button className="mobile-link danger" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <NavLink to="/login" className="mobile-link">Log in</NavLink>
            )}
          </nav>
        )}
      </header>

      <main id="main" className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Logo light />
              <p>Turning empty driveways and garages into parking for the community.</p>
              <Link to="/list-space" className="btn btn-white btn-sm">
                <Plus size={16} /> List your space
              </Link>
            </div>
            <div>
              <h4>Drivers</h4>
              <ul>
                <li><Link to="/search">Find parking</Link></li>
                <li><Link to="/dashboard?tab=bookings">My bookings</Link></li>
                <li><Link to="/register">Create an account</Link></li>
              </ul>
            </div>
            <div>
              <h4>Hosts</h4>
              <ul>
                <li><Link to="/list-space">List a space</Link></li>
                <li><Link to="/dashboard?tab=spaces">My spaces</Link></li>
                <li><Link to="/dashboard?tab=requests">Booking requests</Link></li>
              </ul>
            </div>
            <div>
              <h4>ShareSpace</h4>
              <ul>
                <li><Link to="/about">How it works</Link></li>
                <li><Link to="/contact">Contact us</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} ShareSpace. All rights reserved.</span>
            <span>Made in the Philippines</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
