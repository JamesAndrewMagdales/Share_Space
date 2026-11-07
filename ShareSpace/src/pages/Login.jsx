import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AuthShell from '../components/AuthShell';
import './Auth.css';

const friendlyError = (message = '') => {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for the link we sent.';
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  return message || 'Something went wrong. Please try again.';
};

// mode: 'login' | 'forgot' | 'recover' (set a new password from the email link)
const Login = () => {
  const { signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  const [mode, setMode] = useState(() =>
    window.location.hash.includes('type=recovery') ? 'recover' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recover');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Already logged in (and not resetting a password): go straight on
  useEffect(() => {
    if (user && mode === 'login') navigate(redirectTo, { replace: true });
  }, [user, mode, navigate, redirectTo]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        navigate(redirectTo, { replace: true });
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setNotice('If that email has an account, a password reset link is on its way.');
      } else {
        if (password.length < 8) throw new Error('Use at least 8 characters.');
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        window.history.replaceState(null, '', '/login');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    login: ['Welcome back', 'Log in to manage your bookings and spaces.'],
    forgot: ['Reset your password', "Enter your email and we'll send you a reset link."],
    recover: ['Choose a new password', 'Pick something you haven’t used before.']
  };

  return (
    <AuthShell>
      <div className="auth-card">
        {mode !== 'login' && mode !== 'recover' && (
          <button type="button" className="auth-back" onClick={() => switchMode('login')}>
            <ArrowLeft size={16} /> Back to log in
          </button>
        )}
        <h1>{titles[mode][0]}</h1>
        <p className="auth-sub">{titles[mode][1]}</p>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} /><span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="alert alert-success" role="status">
            <CheckCircle size={18} /><span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate={false}>
          {mode !== 'recover' && (
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-icon">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="field">
              <div className="label-row">
                <label htmlFor="password">{mode === 'recover' ? 'New password' : 'Password'}</label>
                {mode === 'login' && (
                  <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-icon password-field">
                <Lock size={18} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'recover' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'recover' ? 'At least 8 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === 'recover' ? 8 : undefined}
                  required
                />
                <button
                  type="button"
                  className="reveal-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy && <span className="spinner" />}
            {mode === 'login' && (busy ? 'Logging in…' : 'Log in')}
            {mode === 'forgot' && (busy ? 'Sending…' : 'Send reset link')}
            {mode === 'recover' && (busy ? 'Saving…' : 'Save new password')}
          </button>
        </form>

        {mode === 'login' && (
          <p className="auth-switch">
            New to ShareSpace? <Link to="/register" state={location.state}>Create an account</Link>
          </p>
        )}
      </div>
    </AuthShell>
  );
};

export default Login;
