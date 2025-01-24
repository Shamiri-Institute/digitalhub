-- CreateTable
CREATE TABLE "school_reports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "student_behavior_rating" INTEGER,
    "admin_support_rating" INTEGER,
    "workload_rating" INTEGER,
    "positive_highlights" TEXT,
    "reported_challenges" TEXT,
    "recommendations" TEXT,
    "schoolId" VARCHAR(255),
    "session_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "school_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_feedbacks" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "student_teacher_satisfaction_rating" INTEGER,
    "factors_influenced_student_participation" TEXT,
    "concerns_raised_by_teachers" TEXT,
    "program_impact_on_students" TEXT,
    "schoolId" VARCHAR(255),
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "school_feedbacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "school_reports" ADD CONSTRAINT "school_reports_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_reports" ADD CONSTRAINT "school_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_reports" ADD CONSTRAINT "school_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_feedbacks" ADD CONSTRAINT "school_feedbacks_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_feedbacks" ADD CONSTRAINT "school_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
