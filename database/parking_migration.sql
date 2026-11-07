-- ShareSpace: convert the skill marketplace into parking slot sharing
-- Run this ONCE on an existing `shareserve` database (phpMyAdmin > Import).
-- A fresh install from schema.sql already includes these changes.
--
-- Table names stay the same so the API keeps working:
--   services            -> a parking space listing posted by a host
--   service_categories  -> parking types (Garage, Driveway, ...)
--   service_requests    -> booking requests from drivers

-- 1. Parking details on each listing
ALTER TABLE services
    ADD COLUMN vehicle_type ENUM('Car', 'Motorcycle', 'SUV/Van', 'Truck', 'Any') DEFAULT 'Car' AFTER city,
    ADD COLUMN slot_count INT DEFAULT 1 AFTER vehicle_type,
    ADD COLUMN is_covered BOOLEAN DEFAULT FALSE AFTER slot_count,
    ADD COLUMN has_cctv BOOLEAN DEFAULT FALSE AFTER is_covered,
    ADD COLUMN has_ev_charging BOOLEAN DEFAULT FALSE AFTER has_cctv,
    ADD COLUMN is_24_7 BOOLEAN DEFAULT TRUE AFTER has_ev_charging,
    ADD COLUMN available_from TIME NULL AFTER is_24_7,
    ADD COLUMN available_to TIME NULL AFTER available_from;

-- 2. Parking rates: Hourly / Daily / Monthly / Free
--    (widen the enum first so old values can be converted safely)
ALTER TABLE services MODIFY COLUMN price_type
    ENUM('Fixed', 'Hourly', 'Negotiable', 'Free', 'Daily', 'Monthly') DEFAULT 'Hourly';
UPDATE services SET price_type = 'Daily' WHERE price_type IN ('Fixed', 'Negotiable');
ALTER TABLE services MODIFY COLUMN price_type
    ENUM('Hourly', 'Daily', 'Monthly', 'Free') DEFAULT 'Hourly';

-- 3. Booking requests record the driver's vehicle
ALTER TABLE service_requests
    ADD COLUMN vehicle_plate VARCHAR(20) NULL AFTER message,
    ADD COLUMN vehicle_type VARCHAR(20) NULL AFTER vehicle_plate;

-- 4. Replace skill categories with parking types
--    (old listings keep their data; their category becomes empty)
DELETE FROM service_categories;
ALTER TABLE service_categories AUTO_INCREMENT = 1;
INSERT INTO service_categories (name, description, icon) VALUES
('Garage', 'Enclosed private garage', 'Warehouse'),
('Driveway', 'Private driveway in front of a house', 'Home'),
('Open Lot', 'Uncovered open-air parking lot', 'SquareParking'),
('Covered Carport', 'Roofed carport or shade', 'Umbrella'),
('Basement / Building', 'Condo or building basement slot', 'Building2'),
('Street-side', 'Legal street-side space in front of property', 'Signpost'),
('Motorcycle Slot', 'Space sized for motorcycles and scooters', 'Bike'),
('Commercial Lot', 'Business or mall lot with spare slots', 'Store');

-- 5. Old skill listings no longer make sense as parking spaces: hide them
UPDATE services SET status = 'Inactive', is_available = 0 WHERE category_id IS NULL;

SELECT 'ShareSpace parking migration completed' AS status;
