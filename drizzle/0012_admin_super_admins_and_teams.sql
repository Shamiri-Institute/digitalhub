-- Gives `admin_users` an implementer, a super-admin flag and a team.
--
-- An admin profile used to be one row per person, shared by that person's ADMIN memberships in
-- every implementer. Super-admin access and the team are per implementer, so the row is now per
-- (person, implementer), as it is for every other role profile. Nothing references `admin_users`
-- by foreign key: `implementer_members.identifier` points at it by id.
--
-- The old unique index on email goes, as a person can now have one profile per implementer.

CREATE TYPE "public"."admin_team" AS ENUM('CARE', 'RESEARCH');--> statement-breakpoint
DROP INDEX "admin_users_email_key";--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "implementer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "team" "admin_team";--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_implementer_id_email_key" ON "admin_users" USING btree ("implementer_id","email");
