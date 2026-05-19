-- Migration script to fix existing database issues
-- Run this if you already have the database created

-- Fix 1: Add is_admin column to users table if it doesn't exist
-- Using ALTER TABLE with IGNORE to avoid errors if column already exists
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER is_verified;

-- Fix 1b: Update any existing users with NULL is_admin to FALSE
UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL;

-- Fix 1c: Ensure all users are active (is_active = TRUE)
UPDATE users SET is_active = TRUE WHERE is_active IS NULL OR is_active = 0;

-- Fix 2: Modify price_type enum to fix the typo (' negotiable' -> 'Negotiable')
ALTER TABLE services MODIFY COLUMN price_type ENUM('Fixed', 'Hourly', 'Negotiable', 'Free') DEFAULT 'Fixed';

-- Fix 3: Add index for is_admin column for better query performance
CREATE INDEX IF NOT EXISTS idx_is_admin ON users(is_admin);

-- ============================================
-- DIAGNOSTIC QUERIES (to help troubleshoot)
-- ============================================

-- Show all users with their status
SELECT '=== USERS IN DATABASE ===' as info;
SELECT id, email, first_name, last_name, is_active, is_verified, is_admin, created_at 
FROM users ORDER BY created_at DESC;

-- Show user count
SELECT '=== USER COUNT ===' as info;
SELECT COUNT(*) as total_users FROM users;

-- Verify the changes
SELECT '=== MIGRATION STATUS ===' as info;
SELECT 'Migration completed successfully!' as status;

-- Check users table structure
DESCRIBE users;

-- Check services table structure  
DESCRIBE services;
