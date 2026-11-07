import { Link } from 'react-router-dom';
import { SquareParking } from 'lucide-react';

const NotFound = () => (
  <div className="container page">
    <div className="card empty">
      <div className="empty-icon"><SquareParking size={28} /></div>
      <h3>This page drove off</h3>
      <p>The link may be old or mistyped.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  </div>
);

export default NotFound;
