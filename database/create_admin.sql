-- Create admin user for testing
-- Email: admin@shareserve.com
-- Password: Admin123!

INSERT INTO users (email, password_hash, first_name, last_name, city, state, country, is_active, is_verified, is_admin) 
VALUES ('admin@shareserve.com', '$2a$12$7oljult/bsxUbhYKsNN.oeo1KL6JUeAELwrTo3uvglPpojuzXYkw2', 'Admin', 'User', 'Manila', 'Metro Manila', 'Philippines', 1, 1, 1)
ON DUPLICATE KEY UPDATE is_admin = 1;
