import { Link } from 'react-router-dom';
import { Search, CalendarCheck, ParkingSquare, ListPlus, CheckCircle2, Wallet, ShieldCheck, Car, Clock, ArrowRight } from 'lucide-react';
import './InfoPages.css';

const FAQ = [
  ['How do I pay?', 'ShareSpace doesn’t take payments yet. Once a host approves your booking, you pay them directly, for example in cash or by e-wallet, as you agree.'],
  ['What if the host doesn’t respond?', 'Your request stays “Pending” until the host answers. You can cancel it any time from My bookings and book another space.'],
  ['Can I list more than one slot?', 'Yes. Set “Available slots” when you list a space, or create separate listings for different locations.'],
  ['Is my exact address public?', 'Drivers see the street or area and city you enter. Share gate codes or exact directions after you approve a booking.'],
  ['How do reviews work?', 'After a booking is marked completed, the driver can rate the host from 1 to 5 stars. Ratings show on every listing.']
];

const About = () => (
  <div className="info-page">
    <section className="info-hero">
      <div className="container container-narrow center">
        <span className="eyebrow">How it works</span>
        <h1>Parking that already exists, shared</h1>
        <p>Garages sit empty during office hours. Driveways stay unused all day. ShareSpace connects those spaces with drivers who need them, so hosts earn and drivers stop circling the block.</p>
      </div>
    </section>

    <section className="container info-section">
      <div className="two-col">
        <div className="card card-pad">
          <div className="role-head"><Car size={22} /><h2>For drivers</h2></div>
          <ol className="role-steps">
            <li><Search size={18} /><div><strong>Search</strong><p>Filter by area, vehicle size, covered parking, CCTV or EV charging.</p></div></li>
            <li><CalendarCheck size={18} /><div><strong>Request</strong><p>Choose a date, arrival time and duration. The total is shown before you send.</p></div></li>
            <li><ParkingSquare size={18} /><div><strong>Park</strong><p>Once approved, drive in. Review the host afterwards.</p></div></li>
          </ol>
          <Link to="/search" className="btn btn-primary">Find parking <ArrowRight size={16} /></Link>
        </div>
        <div className="card card-pad">
          <div className="role-head"><Wallet size={22} /><h2>For hosts</h2></div>
          <ol className="role-steps">
            <li><ListPlus size={18} /><div><strong>List</strong><p>Add your address, slot size, hours, photo and your hourly, daily or monthly rate.</p></div></li>
            <li><CheckCircle2 size={18} /><div><strong>Approve</strong><p>Every request shows the driver’s plate and schedule. You decide.</p></div></li>
            <li><Clock size={18} /><div><strong>Stay in control</strong><p>Pause bookings any time, edit your listing, or remove it.</p></div></li>
          </ol>
          <Link to="/list-space" className="btn btn-secondary">List your space <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>

    <section className="container container-narrow info-section">
      <div className="center">
        <span className="eyebrow"><ShieldCheck size={14} /> Questions</span>
        <h2 className="faq-title">Frequently asked</h2>
      </div>
      <div className="faq">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <p className="center muted" style={{ marginTop: 28 }}>
        Still stuck? <Link to="/contact">Contact us</Link>.
      </p>
    </section>
  </div>
);

export default About;
