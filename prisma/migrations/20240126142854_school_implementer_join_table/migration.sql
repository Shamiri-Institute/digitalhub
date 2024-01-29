-- DropIndex
DROP INDEX "project_implementers_projectId_implementerId_key";

-- AlterTable
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_pkey" PRIMARY KEY ("projectId", "implementerId");

-- CreateTable
CREATE TABLE "school_implementers" (
    "schoolId" TEXT NOT NULL,
    "implementerId" TEXT NOT NULL,

    CONSTRAINT "school_implementers_pkey" PRIMARY KEY ("schoolId","implementerId")
);

-- AddForeignKey
ALTER TABLE "school_implementers" ADD CONSTRAINT "school_implementers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_implementers" ADD CONSTRAINT "school_implementers_implementerId_fkey" FOREIGN KEY ("implementerId") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
