import {
  Warehouse,
  Home,
  SquareParking,
  Umbrella,
  Building2,
  Signpost,
  Bike,
  Store
} from 'lucide-react';

// Parking types. Ids match the rows seeded in database/schema.sql
// (service_categories), so they also work when the API is offline.
export const PARKING_TYPES = [
  { id: 1, name: 'Garage', icon: Warehouse },
  { id: 2, name: 'Driveway', icon: Home },
  { id: 3, name: 'Open Lot', icon: SquareParking },
  { id: 4, name: 'Covered Carport', icon: Umbrella },
  { id: 5, name: 'Basement / Building', icon: Building2 },
  { id: 6, name: 'Street-side', icon: Signpost },
  { id: 7, name: 'Motorcycle Slot', icon: Bike },
  { id: 8, name: 'Commercial Lot', icon: Store }
];

export const getParkingTypeIcon = (name) =>
  PARKING_TYPES.find((type) => type.name === name)?.icon || SquareParking;

export const VEHICLE_TYPES = ['Car', 'Motorcycle', 'SUV/Van', 'Truck', 'Any'];

export const PRICE_TYPES = [
  { value: 'Hourly', label: 'Per hour', suffix: '/hr' },
  { value: 'Daily', label: 'Per day', suffix: '/day' },
  { value: 'Monthly', label: 'Per month', suffix: '/mo' },
  { value: 'Free', label: 'Free', suffix: '' }
];

export const BOOKING_DURATIONS = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
  { value: 4320, label: '3 days' },
  { value: 10080, label: '1 week' },
  { value: 43200, label: '1 month' }
];

export const formatPrice = (price, type) => {
  if (type === 'Free' || Number(price) === 0) return 'Free';
  const suffix = PRICE_TYPES.find((p) => p.value === type)?.suffix || '';
  return `₱${Number(price || 0).toLocaleString()}${suffix}`;
};

// "08:00:00" -> "8:00 AM"
export const formatTime = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const formatHours = (space) => {
  if (space.is_24_7 === undefined || space.is_24_7 === null || Number(space.is_24_7) === 1 || space.is_24_7 === true) {
    return 'Open 24/7';
  }
  if (!space.available_from || !space.available_to) return 'Ask host for hours';
  return `${formatTime(space.available_from)} – ${formatTime(space.available_to)}`;
};

export const formatDuration = (minutes) => {
  const preset = BOOKING_DURATIONS.find((d) => d.value === Number(minutes));
  if (preset) return preset.label;
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} days`;
  return `${Math.round(minutes / 60)} hours`;
};

// Same rule the backend uses to price a booking
export const estimateCost = (price, type, minutes) => {
  const rate = Number(price) || 0;
  const hours = minutes / 60;
  switch (type) {
    case 'Free': return 0;
    case 'Hourly': return Math.round(rate * Math.max(hours, 1) * 100) / 100;
    case 'Daily': return rate * Math.max(Math.ceil(hours / 24), 1);
    case 'Monthly': return rate * Math.max(Math.ceil(hours / (24 * 30)), 1);
    default: return rate;
  }
};

export const isTrue = (value) => value === true || value === 1 || value === '1';
