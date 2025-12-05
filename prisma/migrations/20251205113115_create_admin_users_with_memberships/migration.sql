-- Migration: Create Admin Users, User Records, and Implementer Memberships
-- 
-- This migration creates admin users, their corresponding user records, and implementer member records.
-- 
-- CONFIGURATION:
-- 1. Modify the 'admin_users_data' CTE to add/remove admin users
-- 2. Modify the 'implementer_ids' CTE to specify which implementers to create memberships for
--
-- Usage:
--   - Add admin users in the admin_users_data CTE with email and name
--   - Specify implementer visible_ids in the implementer_ids CTE
--   - The migration will create AdminUser, User, and ImplementerMember records automatically
--   - If users already exist, they will be skipped (ON CONFLICT DO NOTHING)
--   - Each admin user will get an ImplementerMember record for each specified implementer

-- Step 1: Define admin users to create
WITH admin_users_data AS (
  SELECT 
    email,
    name
  FROM (VALUES
    -- Add your admin users here
    -- Format: ('email@example.com', 'Admin Name'),
    ('wambugu.davis@shamiri.institute', 'Davis Wambugu'),
    ('shadrack.lilan@shamiri.institute', 'Shadrack Lilan'),
    ('stanley.george@shamiri.institute', 'Stanley George'),
    ('brandon.mochama@shamiri.institute', 'Brandon Mochama'),
    ('benny@shamiri.institute', 'Benny H. Otieno')
    -- Add more admin users as needed (remove trailing comma from last entry)
  ) AS t(email, name)
),

-- Step 2: Define which implementers to create memberships for
implementer_ids AS (
  SELECT id, visible_id
  FROM implementers
  WHERE visible_id IN (
    -- Specify implementer visible_ids here
    -- Format: 'SHA', 'IMP_1', etc.
    'Imp_1'  -- Example: Shamiri Institute
    -- Add more implementer visible_ids as needed
  )
),

-- Step 3: Check for existing users and admin users, prepare IDs
admin_users_with_existing AS (
  SELECT 
    aud.email,
    aud.name,
    COALESCE(au.id, gen_random_uuid()::text) AS admin_id,
    COALESCE(u.id, gen_random_uuid()::text) AS user_id
  FROM admin_users_data aud
  LEFT JOIN admin_users au ON au.email = aud.email
  LEFT JOIN users u ON u.email = aud.email
),

-- Step 4: Insert or update AdminUser records
inserted_admin_users AS (
  INSERT INTO admin_users (id, created_at, updated_at, email, name)
  SELECT 
    admin_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    email,
    name
  FROM admin_users_with_existing
  ON CONFLICT (email) DO UPDATE SET
    -- If admin user exists, update the name but keep existing id
    name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, email
),

-- Step 5: Insert or update User records
inserted_users AS (
  INSERT INTO users (id, created_at, updated_at, name, email)
  SELECT 
    user_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    name,
    email
  FROM admin_users_with_existing
  ON CONFLICT (email) DO UPDATE SET
    -- If user exists, update the name but keep existing id
    name = EXCLUDED.name,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, email
),

-- Step 6: Create cross product of users and implementers for memberships
user_implementer_pairs AS (
  SELECT 
    u.id AS user_id,
    u.email AS user_email,
    i.id AS implementer_id,
    i.visible_id AS implementer_visible_id
  FROM inserted_users u
  CROSS JOIN implementer_ids i
),

-- Step 7: Get admin user IDs for identifier field
user_admin_pairs AS (
  SELECT 
    uip.user_id,
    uip.implementer_id,
    uip.implementer_visible_id,
    au.id AS admin_user_id
  FROM user_implementer_pairs uip
  LEFT JOIN inserted_admin_users au ON au.email = uip.user_email
)

-- Step 8: Insert ImplementerMember records
-- Skip if membership already exists (same user_id + implementer_id + role)
INSERT INTO implementer_members (
  created_at,
  updated_at,
  user_id,
  implementer_id,
  role,
  identifier
)
SELECT 
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  user_id,
  implementer_id,
  'ADMIN'::implementer_roles,
  admin_user_id
FROM user_admin_pairs
WHERE NOT EXISTS (
  SELECT 1 
  FROM implementer_members im
  WHERE im.user_id = user_admin_pairs.user_id
    AND im.implementer_id = user_admin_pairs.implementer_id
    AND im.role = 'ADMIN'::implementer_roles
);

