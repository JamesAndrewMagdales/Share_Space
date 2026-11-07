import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, AlertCircle, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import './Auth.css';

const friendlyError = (message = '') => {
  if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Try logging in instead.';
  if (/rate limit/i.test(message)) return 'Too many sign-ups from this network. Please wait a minute and try again.';
  if (/password/i.test(message)) return message;
  return message || 'Could not create your account. Please try again.';
};

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', city: '', password: '', confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmEmail, setConfirmEmail] = useState('');

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = 'Enter your first name';
    if (!form.lastName.trim()) errors.lastName = 'Enter your last name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
    if (form.password.length < 8) errors.password = 'Use at least 8 characters';
    if (form.confirm !== form.password) errors.confirm = "Passwords don't match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const result = await signUp({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null
      });
      if (result.needsConfirmation) {
        setConfirmEmail(form.email.trim());
      } else {
        navigate(location.state?.from || '/dashboard', { replace: true });
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setBusy(false);
    }
  };

  if (confirmEmail) {
    return (
      <AuthShell>
        <div className="auth-card auth-done">
          <div className="empty-icon"><MailCheck size={28} /></div>
          <h1>Check your email</h1>
          <p className="auth-sub">
            We sent a confirmation link to <strong>{confirmEmail}</strong>. Open it to activate your
            account, then log in.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg btn-block">Go to log in</Link>
          <p className="auth-switch small">Didn’t get it? Check your spam folder.</p>
        </div>
      </AuthShell>
    );
  }

  const fieldError = (name) => fieldErrors[name] && (
    <span className="field-error" id={`${name}-error`}>{fieldErrors[name]}</span>
  );

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-sub">Book parking near you, or earn from the slot you don’t use.</p>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-row">
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <div className="input-icon">
                <User size={18} aria-hidden="true" />
                <input id="firstName" name="firstName" autoComplete="given-name" value={form.firstName}
                  onChange={update} aria-invalid={!!fieldErrors.firstName} aria-describedby="firstName-error" />
              </div>
              {fieldError('firstName')}
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" autoComplete="family-name" value={form.lastName}
                onChange={update} aria-invalid={!!fieldErrors.lastName} aria-describedby="lastName-error" />
              {fieldError('lastName')}
            </div>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="input-icon">
              <Mail size={18} aria-hidden="true" />
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
                value={form.email} onChange={update} aria-invalid={!!fieldErrors.email} aria-describedby="email-error" />
            </div>
            {fieldError('email')}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="phone">Mobile <span className="optional">(optional)</span></label>
              <div className="input-icon">
                <Phone size={18} aria-hidden="true" />
                <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="09XX XXX XXXX"
                  value={form.phone} onChange={update} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="city">City <span className="optional">(optional)</span></label>
              <div className="input-icon">
                <MapPin size={18} aria-hidden="true" />
                <input id="city" name="city" autoComplete="address-level2" placeholder="e.g., Makati"
                  value={form.city} onChange={update} />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-icon password-field">
              <Lock size={18} aria-hidden="true" />
              <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" placeholder="At least 8 characters" value={form.password}
                onChange={update} aria-invalid={!!fieldErrors.password} aria-describedby="password-error" />
              <button type="button" className="reveal-btn" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldError('password')}
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <div className="input-icon">
              <Lock size={18} aria-hidden="true" />
              <input id="confirm" name="confirm" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" value={form.confirm} onChange={update}
                aria-invalid={!!fieldErrors.confirm} aria-describedby="confirm-error" />
            </div>
            {fieldError('confirm')}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy && <span className="spinner" />}
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <p className="auth-terms">By signing up you agree to treat hosts’ spaces and drivers’ vehicles with care.</p>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login" state={location.state}>Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Register;
