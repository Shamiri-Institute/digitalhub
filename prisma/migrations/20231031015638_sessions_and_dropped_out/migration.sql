-- AlterTable
ALTER TABLE "students" ADD COLUMN     "dropped_out" BOOLEAN,
ADD COLUMN     "dropped_out_reason" TEXT;

-- CreateTable
CREATE TABLE "intervention_sessions" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "visible_id" VARCHAR(10) NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "session_name" VARCHAR(255) NOT NULL,
    "school_id" VARCHAR(255) NOT NULL,
    "leader_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "intervention_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intervention_sessions_visible_id_key" ON "intervention_sessions"("visible_id");

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
