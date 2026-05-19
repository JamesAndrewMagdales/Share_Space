-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER is_active;

-- Create first admin user (email: admin@shareserve.com, password: Admin123!)
UPDATE users SET is_admin = TRUE WHERE email = 'admin@shareserve.com' LIMIT 1;
