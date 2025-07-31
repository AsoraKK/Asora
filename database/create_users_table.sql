-- Asora Users Table Definition
-- Run this once in pgAdmin or Azure Data Studio

-- Create users table for identity management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  reputation_score INT DEFAULT 0 CHECK (reputation_score >= 0),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Core user identity and profile data for Asora platform';
COMMENT ON COLUMN users.id IS 'Unique user identifier (auto-incrementing)';
COMMENT ON COLUMN users.email IS 'User email address (unique, used for authentication)';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user account was created';
COMMENT ON COLUMN users.role IS 'User role: user, moderator, or admin';
COMMENT ON COLUMN users.reputation_score IS 'User reputation points (gamification)';
COMMENT ON COLUMN users.tier IS 'User subscription tier: free, premium, or enterprise';

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
