-- Repairs admin profiles so ADMIN memberships resolve to a profile of their own implementer, and
-- gives each implementer that has admins a super admin.
--
-- It removes a duplicate ADMIN membership, points memberships whose identifier has no profile at
-- the profile with the member's email, creates a profile for members who still have none (members
-- without an email are skipped), deletes profiles no ADMIN membership uses, sets `implementer_id`
-- on the rest, makes the oldest ADMIN membership's profile the super admin when the implementer
-- has none, and then makes `implementer_id` NOT NULL.
--
-- Older data can have ADMIN memberships that point at no profile, a person with two ADMIN
-- memberships in one implementer, and profiles that no membership uses. A profile takes the
-- implementer of the membership that points at it, so this assumes no profile is shared across
-- implementers, whether memberships already point at it or match it by email. A shared profile
-- would go to one implementer, and the person's memberships in the others would not match it.
-- Neither this migration nor 0012 splits a shared profile, so check before applying that no ADMIN
-- `identifier` appears in more than one implementer.
--
-- Nothing here touches `implementer_members.updated_at`: the most recently updated membership is
-- the person's active one.

-- 1. A person keeps one ADMIN membership per implementer: the one that already points at a
--    profile, otherwise the first created (the lowest id).
WITH ranked AS (
  SELECT
    m.id,
    row_number() OVER (
      PARTITION BY m.implementer_id, m.user_id
      ORDER BY (a.id IS NULL), m.id
    ) AS position
  FROM implementer_members m
  LEFT JOIN admin_users a ON a.id = m.identifier
  WHERE m.role = 'ADMIN'
)
DELETE FROM implementer_members
WHERE id IN (SELECT id FROM ranked WHERE position > 1);--> statement-breakpoint

-- 2. Point each ADMIN membership that has no profile at the profile with the member's email.
UPDATE implementer_members m
SET identifier = (
  SELECT a.id
  FROM admin_users a
  WHERE lower(trim(a.email)) = lower(trim(u.email))
  ORDER BY a.created_at, a.id
  LIMIT 1
)
FROM users u
WHERE u.id = m.user_id
  AND m.role = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.id = m.identifier)
  AND EXISTS (
    SELECT 1 FROM admin_users a WHERE lower(trim(a.email)) = lower(trim(u.email))
  );--> statement-breakpoint

-- 3. Create a profile for each ADMIN member who still has none, and point the membership at it.
--    The id has the shape of the ones the app makes (`admin_` and 26 characters), but is random,
--    as SQL cannot make a typeid.
WITH missing AS MATERIALIZED (
  SELECT
    m.id AS membership_id,
    m.implementer_id,
    lower(trim(u.email)) AS email,
    coalesce(u.name, u.email) AS name,
    'admin_0' || substr(md5(random()::text || clock_timestamp()::text || m.id::text), 1, 25) AS new_id
  FROM implementer_members m
  JOIN users u ON u.id = m.user_id
  WHERE m.role = 'ADMIN'
    AND u.email IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.id = m.identifier)
),
created AS (
  INSERT INTO admin_users (id, email, name, updated_at)
  SELECT new_id, email, name, CURRENT_TIMESTAMP FROM missing
)
UPDATE implementer_members m
SET identifier = missing.new_id
FROM missing
WHERE m.id = missing.membership_id;--> statement-breakpoint

-- 4. Remove the profiles that no ADMIN membership points at. Their people cannot sign in as admins,
--    and a leftover row would make "Add new user" reject the same email.
DELETE FROM admin_users a
WHERE NOT EXISTS (
  SELECT 1 FROM implementer_members m WHERE m.role = 'ADMIN' AND m.identifier = a.id
);--> statement-breakpoint

-- 5. A profile belongs to the implementer of the membership that points at it.
UPDATE admin_users a
SET implementer_id = m.implementer_id
FROM implementer_members m
WHERE m.role = 'ADMIN'
  AND m.identifier = a.id
  AND a.implementer_id IS NULL;--> statement-breakpoint

-- 6. An implementer without a super admin gets one: the profile of its oldest ADMIN membership.
UPDATE admin_users a
SET is_super_admin = true
WHERE a.id IN (
    SELECT DISTINCT ON (m.implementer_id) m.identifier
    FROM implementer_members m
    JOIN admin_users p ON p.id = m.identifier AND p.implementer_id = m.implementer_id
    WHERE m.role = 'ADMIN'
    ORDER BY m.implementer_id, m.created_at, m.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM admin_users s
    WHERE s.implementer_id = a.implementer_id AND s.is_super_admin
  );--> statement-breakpoint

-- 7. Every profile now has an implementer, so the column can require one.
ALTER TABLE "admin_users" ALTER COLUMN "implementer_id" SET NOT NULL;
