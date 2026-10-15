CREATE SEQUENCE "public"."student_visible_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
SELECT setval(
  'student_visible_number_seq',
  greatest(
    (SELECT max(substring("visible_id" from '_(\d+)$')::bigint) FROM "students"),
    (SELECT count(*) FROM "students"),
    1
  )
);
