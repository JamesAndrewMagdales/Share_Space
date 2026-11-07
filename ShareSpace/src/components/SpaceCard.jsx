import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Car, Umbrella, Cctv, Zap, BadgeCheck } from 'lucide-react';
import { formatPrice, formatHours, isTrue } from '../constants/parking';
import ParkingTypeIcon from './ParkingTypeIcon';
import './SpaceCard.css';

// One parking space listing in a grid
const SpaceCard = ({ space }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const slots = Number(space.slot_count) || 1;
  const rating = Number(space.provider_rating) || 0;
  const amenities = [
    isTrue(space.is_covered) && { icon: Umbrella, label: 'Covered' },
    isTrue(space.has_cctv) && { icon: Cctv, label: 'CCTV' },
    isTrue(space.has_ev_charging) && { icon: Zap, label: 'EV' }
  ].filter(Boolean);

  return (
    <Link to={`/spaces/${space.id}`} className="space-card">
      <div className="space-card-media">
        {space.image && !imageFailed ? (
          <img src={space.image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="space-card-placeholder" aria-hidden="true">
            <ParkingTypeIcon name={space.category_name} size={40} strokeWidth={1.6} />
          </div>
        )}
        <span className="space-card-slots">
          <span className="dot" aria-hidden="true" />
          {slots} {slots === 1 ? 'slot' : 'slots'} free
        </span>
      </div>

      <div className="space-card-body">
        <div className="space-card-top">
          <span className="space-card-type">{space.category_name || 'Parking'}</span>
          {rating > 0 && (
            <span className="space-card-rating">
              <Star size={14} fill="currentColor" aria-hidden="true" /> {rating.toFixed(1)}
            </span>
          )}
        </div>

        <h3 className="space-card-title">{space.title}</h3>

        <p className="space-card-loc">
          <MapPin size={14} aria-hidden="true" />
          <span>{[space.location, space.city].filter(Boolean).join(', ')}</span>
        </p>

        <div className="space-card-facts">
          <span><Car size={14} aria-hidden="true" /> {space.vehicle_type === 'Any' ? 'Any vehicle' : space.vehicle_type}</span>
          <span><Clock size={14} aria-hidden="true" /> {formatHours(space)}</span>
        </div>

        <div className="space-card-foot">
          <span className="space-card-price">{formatPrice(space.price, space.price_type)}</span>
          <span className="space-card-amenities">
            {amenities.map((amenity) => (
              <span key={amenity.label} title={amenity.label}>
                <amenity.icon size={14} aria-hidden="true" />
                <span className="sr-only">{amenity.label}</span>
              </span>
            ))}
            {isTrue(space.provider_verified) && (
              <span title="Verified host" className="verified">
                <BadgeCheck size={14} aria-hidden="true" />
                <span className="sr-only">Verified host</span>
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
};

export const SpaceCardSkeleton = () => (
  <div className="space-card skeleton-card" aria-hidden="true">
    <div className="space-card-media skeleton" />
    <div className="space-card-body">
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
      <div className="skeleton" style={{ height: 20, width: '85%', marginTop: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '60%', marginTop: 10 }} />
      <div className="skeleton" style={{ height: 22, width: '35%', marginTop: 22 }} />
    </div>
  </div>
);

export default SpaceCard;
