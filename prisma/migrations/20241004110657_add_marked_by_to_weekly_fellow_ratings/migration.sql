-- AlterTable
ALTER TABLE "weekly_fellow_ratings" ADD COLUMN     "marked_by" TEXT;

-- AddForeignKey
ALTER TABLE "weekly_fellow_ratings" ADD CONSTRAINT "weekly_fellow_ratings_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
