SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "schools" DROP CONSTRAINT "schools_implementer_id_fkey";
--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_fellow_id_fkey";
--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_supervisor_id_fkey";
--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_implementer_id_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_screening_info" DROP COLUMN "school_id";--> statement-breakpoint
ALTER TABLE "schools" DROP COLUMN "implementer_id";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "fellow_id";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "supervisor_id";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "implementer_id";