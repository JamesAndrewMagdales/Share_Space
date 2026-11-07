import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/home';

// Other pages load on demand so the first visit stays fast
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Search = lazy(() => import('./pages/Search'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SpaceForm = lazy(() => import('./pages/SpaceForm'));
const SpaceDetails = lazy(() => import('./pages/SpaceDetails'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoading = () => (
  <div className="loading" role="status"><div className="spinner" /><span>Loading…</span></div>
);

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="search" element={<Search />} />
            <Route path="spaces/:id" element={<SpaceDetails />} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="list-space" element={<ProtectedRoute><SpaceForm /></ProtectedRoute>} />
            <Route path="spaces/:id/edit" element={<ProtectedRoute><SpaceForm /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

            {/* Old links */}
            <Route path="create-service" element={<Navigate to="/list-space" replace />} />
            <Route path="services/:id" element={<SpaceDetails />} />
            <Route path="messages" element={<Navigate to="/dashboard?tab=bookings" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
