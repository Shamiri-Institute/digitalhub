-- AlterTable
ALTER TABLE "fellow_attendances" ADD COLUMN     "absence_comments" TEXT,
ADD COLUMN     "marked_by" TEXT,
ALTER COLUMN "visible_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
