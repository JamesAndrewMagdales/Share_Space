import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Sends logged-out visitors to /login and brings them back afterwards
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (adminOnly && user && !profile)) {
    return (
      <div className="loading" role="status">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (adminOnly && !profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
