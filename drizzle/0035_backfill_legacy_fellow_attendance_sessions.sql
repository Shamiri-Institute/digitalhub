SET LOCAL lock_timeout = '5s';--> statement-breakpoint
-- ENG-2397. Gives every legacy fellow_attendances row a session, so the school copy can go.
-- Each step must touch exactly the audited prod count, or nothing on a database without the legacy data.
DO $$
DECLARE
  touched integer;
BEGIN
  -- Sessions, notes and ratings created by the supervisor trainings on 2023-12-13 and 2024-01-18,
  -- plus 4 staff test sessions from the same weeks. Nothing else references them.
  CREATE TEMP TABLE training_session (id varchar PRIMARY KEY) ON COMMIT DROP;
  INSERT INTO training_session (id) VALUES
    ('isess_01hge3vbhmetbbyrv330dggw3k'), ('isess_01hgj1w9tff5f9e6kajvctjs4s'), ('isess_01hhgyywvafgk88rh8rc9vsbvq'),
    ('isess_01hhh4skbcee59w1jx3f0bdcs8'), ('isess_01hhh4tr7zecrbbjx32dx0qmaj'), ('isess_01hhhfv4fxem68341yxa9zhmqz'),
    ('isess_01hhhfvhc3fxdst01ta6yyfhpp'), ('isess_01hhhfvnrme5xrz1sheqg1amrm'), ('isess_01hhhfw2kaf5tsca0aa0y4kbsz'),
    ('isess_01hhhfw4tyf4t9weqqk665rzhm'), ('isess_01hhhfw5qsfq1rje10mpc395tb'), ('isess_01hhhfw7j5f6nrj239rghwm1kc'),
    ('isess_01hhhfwhrdftsb9ceff34s11cf'), ('isess_01hhhfx8gnff5sbebkv808fxwe'), ('isess_01hhhfxdg2f8w8mdgv16n0b1jk'),
    ('isess_01hhhfxgvveg58e63m21m20k6m'), ('isess_01hhhfxjj1em7b8mj8ws9qcwzh'), ('isess_01hhhfxk5eexc9tqvy65d8695y'),
    ('isess_01hhhfxnrgeh0ac3a8hnyyvmd2'), ('isess_01hhhfxqvcf9zrhttg3sehg1w2'), ('isess_01hhhfxsewerarjw5sy6s0fvpm'),
    ('isess_01hhhfxsykf3xrgqa3hj17ke4f'), ('isess_01hhhfxt5pfv7a44as4w1aep0x'), ('isess_01hhhfxz2ffhf83b4aw9tx51dc'),
    ('isess_01hhhfyy50fkvvd7jvx4p3qrsa'), ('isess_01hhhg2sggempbfzv30ev92kgj'), ('isess_01hhhg3cw9f2bszaya5250thdm'),
    ('isess_01hhhg3mqwe7ebh3xy4hx1a92p'), ('isess_01hhhg3wyhfspa4x3h288fym2x'), ('isess_01hhhg4hnte8t8tdskwkecdfv9'),
    ('isess_01hhhg4qa4e46sh784t79n8p2p'), ('isess_01hhhg6c38fgfasvjxj76wmmxh'), ('isess_01hhhg6m3bfgga7prfe9vcw9d3'),
    ('isess_01hm5p9rvsezxb5q005kfbazpy'), ('isess_01hme6hqqjedrsjswcfgdzrwp9'), ('isess_01hme6hrykf0d94sk7yxwj0knw'),
    ('isess_01hme6hvv6ezfr8qxfv6x23t34'), ('isess_01hme6jd6dfh0afcrtvv9yzvt9'), ('isess_01hme6jznte9ytxpsn93trynw3'),
    ('isess_01hme6k3wpfmh84r64rjtjdp57'), ('isess_01hme6k7nee4h9gj4qwenqe5r5'), ('isess_01hme6k8bte1wrzyrjkw4y2bm3'),
    ('isess_01hme6k997fm69adnwpdtarvv9'), ('isess_01hme6kacgevebvztn71f4saa5'), ('isess_01hme6kezgfaf96jx0mqtmb7fa'),
    ('isess_01hme6kffsfz6re61tch0p3yeb'), ('isess_01hme6kjf3f8csgd3scb3hpqzf'), ('isess_01hme6kmgnfz4svpsvwpnjj97b'),
    ('isess_01hme6kt5mfre8m6jtspseehhe'), ('isess_01hme6ps6ae1ms899esnmwz4vg'), ('isess_01hme6sqfkfzabcjdagydn7hyd'),
    ('isess_01hme6tp6pfakvza8ps2nm9z9e'), ('isess_01hme6v7t6e5ttkh9m75knbj4p'), ('isess_01hme6wdsjf2zb8pzhrcps43ce'),
    ('isess_01hme6wqzpe5ftc2ym0grjhebh'), ('isess_01hme6wsy1f1saqxxfbnrg95bh'), ('isess_01hme6wxdvfry9p8wnaxw2c0m5'),
    ('isess_01hme6xee6epha3vx3az2r2f94'), ('isess_01hme6z5dxff2tvqezjr121vkb'), ('isess_01hme6zb8fe4pvqfk557vadnwm'),
    ('isess_01hme6zj9zfkc9v3aa9dgyv8eh'), ('isess_01hme6zjwjf74t7hfgxnzfkfz0'), ('isess_01hme6znesegwb2yepaq3xvx4c'),
    ('isess_01hme6zqxneyss58513aha7anb'), ('isess_01hme6zta8ff3v0n14mg7k4yd0'), ('isess_01hme6zvqje3svsva0m1tzgkqd'),
    ('isess_01hme6zwybfnvt9vczzen07x1c'), ('isess_01hme6zyeqe9793dndp55t1ey7'), ('isess_01hme70ar4fwhrraxptmf20ydj'),
    ('isess_01hme70rrqf7g9f8542j7892zv'), ('isess_01hn8hrs2df19sv71z1nbzy98v');

  DELETE FROM intervention_session_notes WHERE session_id IN (SELECT id FROM training_session);
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 87) THEN RAISE EXCEPTION 'training notes: expected 87, deleted %', touched; END IF;

  DELETE FROM intervention_session_ratings WHERE session_id IN (SELECT id FROM training_session);
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 36) THEN RAISE EXCEPTION 'training ratings: expected 36, deleted %', touched; END IF;

  DELETE FROM intervention_sessions WHERE id IN (SELECT id FROM training_session);
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 71) THEN RAISE EXCEPTION 'training sessions: expected 71, deleted %', touched; END IF;

  -- Rows the January 2024 app wrote without a session: a staff test, and a mark superseded the next day.
  DELETE FROM fellow_attendances WHERE id IN (68029, 68030, 68031, 68176) AND session_id IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 4) THEN RAISE EXCEPTION 'app-era rows: expected 4, deleted %', touched; END IF;

  -- The Anansi_25k sessions were inserted on 2025-03-03 with their time zone applied twice,
  -- so they sit at 21:00 Nairobi on the day before the uploaded date.
  UPDATE intervention_sessions SET session_date = session_date + interval '3 hours'
  WHERE project_id = 'proj_01hna2gnj2fyb9cxrzae1m0p8h'
    AND (session_date AT TIME ZONE 'UTC')::time = '18:00';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 149) THEN RAISE EXCEPTION 'Anansi_25k dates: expected 149, moved %', touched; END IF;

  -- What remains is the 2023-11-29 Airtable import of 2023 (Anansi_25k) fellow attendance.
  CREATE TEMP TABLE legacy_attendance ON COMMIT DROP AS
  SELECT fa.id, fa.fellow_id, fa.school_id, 's' || fa.session_number AS session_type, fa.session_date::date AS session_day
  FROM fellow_attendances fa WHERE fa.session_id IS NULL;

  -- 56 of the uploaded 2023 sessions never reached intervention_sessions. Create them in the shape of the other 149.
  INSERT INTO intervention_sessions (
    id, updated_at, session_name, session_type, school_id, hub_id, project_id,
    occurred, year_of_implementation, status, venue, schedule_history, session_date
  )
  SELECT
    'isess_2023' || left(md5(missing.school_id || missing.session_type), 22),
    now(),
    CASE missing.session_type WHEN 's0' THEN 'Pre session' ELSE 'Session 0' || right(missing.session_type, 1) END,
    missing.session_type, missing.school_id, sc.hub_id, h.project_id,
    true, 2023, NULL, '', '{}'::jsonb,
    missing.session_day::timestamp AT TIME ZONE 'Africa/Nairobi'
  FROM (
    SELECT DISTINCT la.school_id, la.session_type, la.session_day FROM legacy_attendance la
    WHERE NOT EXISTS (
      SELECT 1 FROM intervention_sessions s
      WHERE s.school_id = la.school_id AND s.session_type = la.session_type
        AND (s.session_date AT TIME ZONE 'Africa/Nairobi')::date = la.session_day
    )
  ) missing
  JOIN schools sc ON sc.id = missing.school_id
  JOIN hubs h ON h.id = sc.hub_id;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 56) THEN RAISE EXCEPTION 'missing 2023 sessions: expected 56, created %', touched; END IF;

  IF EXISTS (
    SELECT 1 FROM legacy_attendance la
    WHERE (
      SELECT count(*) FROM intervention_sessions s
      WHERE s.school_id = la.school_id AND s.session_type = la.session_type
        AND (s.session_date AT TIME ZONE 'Africa/Nairobi')::date = la.session_day
    ) <> 1
  ) THEN RAISE EXCEPTION 'legacy attendance does not match exactly one session'; END IF;

  -- updated_at stays as it is: it records the training edits on 147 of these rows.
  UPDATE fellow_attendances fa SET session_id = s.id
  FROM legacy_attendance la, intervention_sessions s
  WHERE fa.id = la.id AND s.school_id = la.school_id AND s.session_type = la.session_type
    AND (s.session_date AT TIME ZONE 'Africa/Nairobi')::date = la.session_day;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 15478) THEN RAISE EXCEPTION 'legacy sessions: expected 15478, set %', touched; END IF;

  -- The group the app would pick when marking: the fellow's group at the session's school.
  UPDATE fellow_attendances fa SET group_id = g.id
  FROM legacy_attendance la, intervention_groups g
  WHERE fa.id = la.id AND fa.group_id IS NULL AND g.leader_id = la.fellow_id AND g.school_id = la.school_id;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched NOT IN (0, 5961) THEN RAISE EXCEPTION 'legacy groups: expected 5961, set %', touched; END IF;

  IF EXISTS (SELECT 1 FROM fellow_attendances WHERE session_id IS NULL) THEN
    RAISE EXCEPTION 'fellow attendance without a session remains';
  END IF;
  IF EXISTS (
    SELECT 1 FROM fellow_attendances fa JOIN intervention_sessions s ON s.id = fa.session_id
    WHERE fa.school_id IS NOT NULL AND fa.school_id IS DISTINCT FROM s.school_id
  ) THEN RAISE EXCEPTION 'fellow attendance school differs from its session school'; END IF;
END $$;--> statement-breakpoint
ALTER TABLE "fellow_attendances" DROP CONSTRAINT "fellow_attendances_school_id_fkey";
--> statement-breakpoint
DROP INDEX "fellow_attendances_school_id_idx";--> statement-breakpoint
ALTER TABLE "fellow_attendances" DROP COLUMN "school_id";
