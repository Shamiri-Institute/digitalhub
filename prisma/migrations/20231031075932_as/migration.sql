-- AlterTable
ALTER TABLE "supervisors" ADD COLUMN     "assigned_school_id" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_assigned_school_id_fkey" FOREIGN KEY ("assigned_school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
