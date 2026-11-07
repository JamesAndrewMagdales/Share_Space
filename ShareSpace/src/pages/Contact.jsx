import { useState } from 'react';
import { Mail, MessageSquare, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendContactMessage } from '../lib/api';
import './InfoPages.css';

const Contact = () => {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
    email: user?.email || '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim()
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="info-page">
      <section className="info-hero">
        <div className="container container-narrow center">
          <span className="eyebrow">Contact</span>
          <h1>We’re here to help</h1>
          <p>Questions about a booking, your listing, or ShareSpace in general? Send us a message.</p>
        </div>
      </section>

      <section className="container info-section contact-grid">
        <aside className="contact-side">
          <div className="card card-pad">
            <MessageSquare size={22} className="side-icon" />
            <h3>About a booking?</h3>
            <p className="muted small">Include the space name and date so we can find it quickly.</p>
          </div>
          <div className="card card-pad">
            <Mail size={22} className="side-icon" />
            <h3>We reply by email</h3>
            <p className="muted small">Usually within one or two working days.</p>
          </div>
        </aside>

        <div className="card card-pad">
          {sent ? (
            <div className="empty">
              <div className="empty-icon"><CheckCircle2 size={28} /></div>
              <h3>Message sent</h3>
              <p>Thanks, {form.name.split(' ')[0] || 'there'}! We’ll reply to {form.email}.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
              <div className="field-row">
                <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" value={form.name} onChange={onChange} required maxLength={120} /></div>
                <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required /></div>
              </div>
              <div className="field"><label htmlFor="subject">Subject <span className="optional">(optional)</span></label><input id="subject" name="subject" value={form.subject} onChange={onChange} maxLength={200} /></div>
              <div className="field"><label htmlFor="message">Message</label><textarea id="message" name="message" rows={6} value={form.message} onChange={onChange} required maxLength={5000} /></div>
              <button type="submit" className="btn btn-primary btn-lg" disabled={sending}>
                {sending ? <><span className="spinner" /> Sending…</> : <><Send size={18} /> Send message</>}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default Contact;
