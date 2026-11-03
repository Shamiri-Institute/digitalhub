CREATE TABLE "clinical_case_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"termination_id" text,
	"reopening_id" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "clinical_case_reviews_subject_check" CHECK (num_nonnulls(termination_id, reopening_id) = 1),
	CONSTRAINT "clinical_case_reviews_reviewed_check" CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);
--> statement-breakpoint
ALTER TABLE "clinical_case_reviews" ADD CONSTRAINT "clinical_case_reviews_termination_id_fkey" FOREIGN KEY ("termination_id") REFERENCES "public"."clinical_case_termination"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_reviews" ADD CONSTRAINT "clinical_case_reviews_reopening_id_fkey" FOREIGN KEY ("reopening_id") REFERENCES "public"."clinical_case_reopenings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_reviews" ADD CONSTRAINT "clinical_case_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_case_reviews_termination_id_key" ON "clinical_case_reviews" USING btree ("termination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_case_reviews_reopening_id_key" ON "clinical_case_reviews" USING btree ("reopening_id");--> statement-breakpoint
CREATE INDEX "clinical_case_reviews_reviewed_by_idx" ON "clinical_case_reviews" USING btree ("reviewed_by");