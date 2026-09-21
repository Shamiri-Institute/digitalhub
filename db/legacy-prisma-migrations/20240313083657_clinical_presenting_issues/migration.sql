-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "academic_struggles" BOOLEAN,
ADD COLUMN     "anxiety" BOOLEAN,
ADD COLUMN     "blended_family_dynamics" BOOLEAN,
ADD COLUMN     "flagged_reason" TEXT,
ADD COLUMN     "home_environment" BOOLEAN,
ADD COLUMN     "medical_condition" BOOLEAN,
ADD COLUMN     "parent_child_relationships" BOOLEAN,
ADD COLUMN     "peer_relationships" BOOLEAN,
ADD COLUMN     "self_perception" BOOLEAN,
ADD COLUMN     "self_regulation" BOOLEAN,
ADD COLUMN     "sexuality" BOOLEAN,
ADD COLUMN     "student_teacher_relationships" BOOLEAN,
ADD COLUMN     "unresolved_grief_loss" BOOLEAN;
