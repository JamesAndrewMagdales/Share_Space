import { CheckCircle } from 'lucide-react';

// Two-column frame for the login / sign-up pages
const AuthShell = ({ children }) => (
  <div className="auth-page">
    <aside className="auth-aside" aria-hidden="true">
      <div className="auth-aside-inner">
        <span className="eyebrow">ShareSpace</span>
        <h2>Parking that’s already there, shared by your neighbors.</h2>
        <ul>
          <li><CheckCircle size={20} /> Book garages, driveways and condo slots</li>
          <li><CheckCircle size={20} /> Hosts approve every booking</li>
          <li><CheckCircle size={20} /> Earn from the slot you don’t use</li>
        </ul>
        <div className="lot-lines">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={i === 2 ? 'free' : ''}>{i === 2 ? 'P' : ''}</span>
          ))}
        </div>
      </div>
    </aside>
    <div className="auth-main">{children}</div>
  </div>
);

export default AuthShell;
