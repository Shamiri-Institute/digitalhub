-- DropIndex
DROP INDEX "fellows_visible_id_key";

-- DropIndex
DROP INDEX "intervention_sessions_school_id_session_id_key";

-- DropIndex
DROP INDEX "intervention_sessions_school_id_session_type_key";

-- AlterTable
ALTER TABLE "fellows" ALTER COLUMN "visible_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "supervisors" ALTER COLUMN "visible_id" DROP NOT NULL;
