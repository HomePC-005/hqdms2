-- Migration script to update users table to use IC Number instead of email
-- Run this script to update existing database

-- Add ic_number column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ic_number VARCHAR(20);

-- Remove the unique constraint on email temporarily
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Make email column nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add unique constraint on ic_number
ALTER TABLE users ADD CONSTRAINT users_ic_number_key UNIQUE (ic_number);

-- Create index on ic_number
CREATE INDEX IF NOT EXISTS idx_users_ic_number ON users(ic_number);

-- Note: You will need to manually populate ic_number for existing users
-- Example for existing users (replace with actual IC numbers):
-- UPDATE users SET ic_number = '123456789012' WHERE email = 'admin@example.com';
-- UPDATE users SET ic_number = '987654321098' WHERE email = 'user@example.com';

-- After populating ic_number for all users, you can make it NOT NULL:
-- ALTER TABLE users ALTER COLUMN ic_number SET NOT NULL;

