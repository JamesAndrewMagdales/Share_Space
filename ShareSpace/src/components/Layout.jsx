import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  User, 
  MessageCircle,
  PlusCircle,
  LogIn,
  UserPlus,
  Mail,
  Info,
  Shield,
  LogOut
} from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    setIsLoggedIn(!!token);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsAdmin(user.is_admin === true);
      } catch (e) {
        setIsAdmin(false);
      }
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/');
  };

  const navigation = [];

  const userNavigation = [
    { name: 'Login', path: '/login', icon: LogIn },
    { name: 'Register', path: '/register', icon: UserPlus },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-text">ShareSpace</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="header-actions">
            {isLoggedIn ? (
              <Link to="/dashboard" className="auth-btn dashboard">
                <Home size={20} />
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="auth-btn login">
                  <LogIn size={20} />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="auth-btn register">
                  <UserPlus size={20} />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          ))}
          <div className="mobile-nav-divider"></div>
          {isLoggedIn ? (
            <>
              <Link
                to="/dashboard"
                className={`mobile-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </Link>
              <button
                className="mobile-nav-link logout-btn"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            userNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>ShareSpace</h3>
              <p>Empowering communities through shared skills and services.</p>
            </div>
            
            <div className="footer-section">
              <h4>Platform</h4>
              <ul>
                <li><Link to="/search">Search Services</Link></li>
                <li><Link to="/register">Get Started</Link></li>
                <li><Link to="/create-service">Create Service</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>For Providers</h4>
              <ul>
                <li><Link to="/register">Get Started</Link></li>
                <li><Link to="/create-service">Create Service</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/messages">Messages</Link></li>
              </ul>
            </div>

            {isAdmin && (
              <div className="footer-section">
                <h4>Administration</h4>
                <ul>
                  <li><Link to="/admin">Admin Panel</Link></li>
                </ul>
              </div>
            )}

            <div className="footer-section">
              <h4>Contact</h4>
              <ul>
                <li>Email: info@sharespace.com</li>
                <li>Phone: +63 123 456 7890</li>
                <li>Address: 123 Tech Street, Manila</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 ShareSpace. All rights reserved.</p>
            <div className="footer-social">
              <Link to="#">Facebook</Link>
              <Link to="#">Twitter</Link>
              <Link to="#">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;