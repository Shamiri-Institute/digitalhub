SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "hubs" DROP CONSTRAINT "hubs_project_id_fkey";
--> statement-breakpoint
ALTER TABLE "intervention_sessions" DROP CONSTRAINT "intervention_sessions_session_id_fkey";
--> statement-breakpoint
ALTER TABLE "hubs" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session_names"("id") ON DELETE restrict ON UPDATE cascade;