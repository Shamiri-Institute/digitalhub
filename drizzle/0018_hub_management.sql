ALTER TABLE "hubs" ALTER COLUMN "visible_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session_names" ALTER COLUMN "amount" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "hubs_implementer_id_project_id_name_key" ON "hubs" USING btree ("implementer_id","project_id",lower(trim("hub_name")));