-- Repairs `implementer_members.identifier` after 0001, and makes the database keep it pointing at
-- a profile.
--
-- `identifier` holds the id of the member's profile, in the table that `role` selects. It has no
-- foreign key, so when 0001 rewrote the hand-typed profile ids (`26P2_HC_01`, `OPS_2025_01`) the
-- memberships kept the old ids and their role pages stopped loading. Only hub coordinator,
-- clinical lead, clinical team and operations memberships had such ids.
--
-- Nothing here touches `implementer_members.updated_at`: the most recently updated membership is
-- the person's active one.

-- 1. A hub coordinator's old id is its `visible_id`, which is unique.
UPDATE implementer_members m
SET identifier = h.id
FROM hub_coordinators h
WHERE m.role = 'HUB_COORDINATOR'
  AND h.visible_id = m.identifier
  AND h.implementer_id = m.implementer_id
  AND NOT EXISTS (SELECT 1 FROM hub_coordinators x WHERE x.id = m.identifier);--> statement-breakpoint

-- 2. Production memberships the email match below cannot settle: 26P2_CL_03's email is on two
--    profiles, and 26P1_CL_01's profile has another email. Both profiles were read from the backup
--    of 2026-09-22, before 0001, and matched by created_at and email. A copy of production taken
--    before 0001 has the same memberships but other profile ids, so a row applies only where its
--    profile exists.
UPDATE implementer_members m
SET identifier = fix.profile_id
FROM (
  VALUES
    (2276, '26P2_CL_03', 'clinicallead_01kr18v9a3fn3sm1mjzegxfjnz'),
    (1649, '26P1_CL_01', 'clinicallead_01kg7041yeempaf4w4x0y3z92a')
) AS fix (membership_id, old_identifier, profile_id)
WHERE m.id = fix.membership_id
  AND m.identifier = fix.old_identifier
  AND EXISTS (SELECT 1 FROM clinical_leads c WHERE c.id = fix.profile_id);--> statement-breakpoint

-- 3. Clinical lead, clinical team and operations profiles have the member's email. Point the
--    membership at the profile with that email in its implementer, when there is exactly one.
WITH profile AS (
  SELECT 'CLINICAL_LEAD'::implementer_roles AS role, id, implementer_id, lower(trim(clinical_lead_email)) AS email
  FROM clinical_leads
  UNION ALL
  SELECT 'CLINICAL_TEAM', id, implementer_id, lower(trim(email)) FROM clinical_teams
  UNION ALL
  SELECT 'OPERATIONS', id, implementer_id, lower(trim(email)) FROM ops_users
),
match AS (
  SELECT m.id AS membership_id, min(p.id) AS profile_id
  FROM implementer_members m
  JOIN users u ON u.id = m.user_id
  JOIN profile p
    ON p.role = m.role AND p.implementer_id = m.implementer_id AND p.email = lower(trim(u.email))
  WHERE m.identifier IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profile x WHERE x.role = m.role AND x.id = m.identifier)
  GROUP BY m.id
  HAVING count(*) = 1
)
UPDATE implementer_members m
SET identifier = match.profile_id
FROM match
WHERE m.id = match.membership_id;--> statement-breakpoint

-- 4. From here on the database rejects a membership whose identifier has no profile, and a
--    profile id change or delete that leaves a membership without one. The checks run at commit,
--    so one transaction can rename a profile and update its memberships in either order.
CREATE FUNCTION implementer_members_identifier_exists() RETURNS trigger AS $$
DECLARE
  membership implementer_members%ROWTYPE;
BEGIN
  SELECT * INTO membership FROM implementer_members WHERE id = NEW.id;
  IF NOT FOUND OR membership.identifier IS NULL OR (CASE membership.role
    WHEN 'ADMIN' THEN EXISTS (SELECT 1 FROM admin_users WHERE id = membership.identifier)
    WHEN 'HUB_COORDINATOR' THEN EXISTS (SELECT 1 FROM hub_coordinators WHERE id = membership.identifier)
    WHEN 'SUPERVISOR' THEN EXISTS (SELECT 1 FROM supervisors WHERE id = membership.identifier)
    WHEN 'FELLOW' THEN EXISTS (SELECT 1 FROM fellows WHERE id = membership.identifier)
    WHEN 'CLINICAL_LEAD' THEN EXISTS (SELECT 1 FROM clinical_leads WHERE id = membership.identifier)
    WHEN 'CLINICAL_TEAM' THEN EXISTS (SELECT 1 FROM clinical_teams WHERE id = membership.identifier)
    WHEN 'OPERATIONS' THEN EXISTS (SELECT 1 FROM ops_users WHERE id = membership.identifier)
  END) THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'implementer_members % points at % %, which does not exist',
    membership.id, membership.role, membership.identifier
    USING ERRCODE = 'foreign_key_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER implementer_members_identifier_exists
AFTER INSERT OR UPDATE OF identifier, role ON implementer_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION implementer_members_identifier_exists();--> statement-breakpoint

-- The trigger argument is the membership role whose identifier points at the table.
CREATE FUNCTION profile_keeps_memberships() RETURNS trigger AS $$
DECLARE
  profile_still_exists boolean;
BEGIN
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1)', TG_TABLE_NAME)
    INTO profile_still_exists USING OLD.id;
  IF profile_still_exists OR NOT EXISTS (
    SELECT 1 FROM implementer_members
    WHERE role = TG_ARGV[0]::implementer_roles AND identifier = OLD.id
  ) THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION '% % is the identifier of a % membership; update implementer_members.identifier too',
    TG_TABLE_NAME, OLD.id, TG_ARGV[0]
    USING ERRCODE = 'foreign_key_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER admin_users_keeps_memberships AFTER UPDATE OF id OR DELETE ON admin_users
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('ADMIN');--> statement-breakpoint
CREATE CONSTRAINT TRIGGER hub_coordinators_keeps_memberships AFTER UPDATE OF id OR DELETE ON hub_coordinators
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('HUB_COORDINATOR');--> statement-breakpoint
CREATE CONSTRAINT TRIGGER supervisors_keeps_memberships AFTER UPDATE OF id OR DELETE ON supervisors
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('SUPERVISOR');--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fellows_keeps_memberships AFTER UPDATE OF id OR DELETE ON fellows
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('FELLOW');--> statement-breakpoint
CREATE CONSTRAINT TRIGGER clinical_leads_keeps_memberships AFTER UPDATE OF id OR DELETE ON clinical_leads
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('CLINICAL_LEAD');--> statement-breakpoint
CREATE CONSTRAINT TRIGGER clinical_teams_keeps_memberships AFTER UPDATE OF id OR DELETE ON clinical_teams
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('CLINICAL_TEAM');--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ops_users_keeps_memberships AFTER UPDATE OF id OR DELETE ON ops_users
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('OPERATIONS');
