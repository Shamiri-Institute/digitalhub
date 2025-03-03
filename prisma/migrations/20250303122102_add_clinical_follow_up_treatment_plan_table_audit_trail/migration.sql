-- CreateTable
CREATE TABLE "clinical_follow_up_treatment_plan_audit_trail" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "case_id" TEXT NOT NULL,

    CONSTRAINT "clinical_follow_up_treatment_plan_audit_trail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clinical_follow_up_treatment_plan_audit_trail" ADD CONSTRAINT "clinical_follow_up_treatment_plan_audit_trail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_follow_up_treatment_plan_audit_trail" ADD CONSTRAINT "clinical_follow_up_treatment_plan_audit_trail_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
