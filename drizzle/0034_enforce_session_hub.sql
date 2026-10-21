SET LOCAL lock_timeout = '5s';--> statement-breakpoint
UPDATE "intervention_sessions" AS s SET "hub_id" = sc."hub_id" FROM "schools" AS sc WHERE sc."id" = s."school_id" AND s."hub_id" IS NULL;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ALTER COLUMN "hub_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "intervention_sessions" DROP CONSTRAINT "intervention_sessions_hub_id_fkey";--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "schools_id_hub_id_key" ON "schools" USING btree ("id","hub_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_names_id_hub_id_key" ON "session_names" USING btree ("id","hub_id");--> statement-breakpoint
DROP INDEX "intervention_sessions_school_id_idx";--> statement-breakpoint
DROP INDEX "intervention_sessions_session_id_idx";--> statement-breakpoint
CREATE INDEX "intervention_sessions_school_id_hub_id_idx" ON "intervention_sessions" USING btree ("school_id","hub_id");--> statement-breakpoint
CREATE INDEX "intervention_sessions_session_id_hub_id_idx" ON "intervention_sessions" USING btree ("session_id","hub_id");--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_school_id_hub_id_fkey" FOREIGN KEY ("school_id","hub_id") REFERENCES "public"."schools"("id","hub_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_session_id_hub_id_fkey" FOREIGN KEY ("session_id","hub_id") REFERENCES "public"."session_names"("id","hub_id") ON DELETE no action ON UPDATE no action;
