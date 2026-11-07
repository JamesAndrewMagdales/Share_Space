import { createElement } from 'react';
import { getParkingTypeIcon } from '../constants/parking';

// Icon for a parking type name ("Garage", "Driveway", ...)
const ParkingTypeIcon = ({ name, ...props }) => createElement(getParkingTypeIcon(name), props);

export default ParkingTypeIcon;
