SET LOCAL lock_timeout = '5s';--> statement-breakpoint
DROP INDEX "fellow_attendances_visible_id_key";--> statement-breakpoint
DROP INDEX "hubs_visible_id_key";--> statement-breakpoint
DROP INDEX "supervisors_visible_id_key";--> statement-breakpoint
ALTER TABLE "fellows" DROP COLUMN "visible_id";--> statement-breakpoint
ALTER TABLE "fellow_attendances" DROP COLUMN "visible_id";--> statement-breakpoint
ALTER TABLE "hubs" DROP COLUMN "visible_id";--> statement-breakpoint
ALTER TABLE "supervisors" DROP COLUMN "visible_id";