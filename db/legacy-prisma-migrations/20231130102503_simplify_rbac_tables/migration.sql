/*
  Warnings:

  - You are about to drop the column `role_id` on the `implementer_invites` table. All the data in the column will be lost.
  - You are about to drop the column `memberId` on the `supervisors` table. All the data in the column will be lost.
  - You are about to drop the `member_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `member_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `implementer_role` to the `implementer_invites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `implementer_members` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "implementer_roles" AS ENUM ('HUB_COORDINATOR', 'SUPERVISOR', 'DELIVER');

-- DropForeignKey
ALTER TABLE "implementer_invites" DROP CONSTRAINT "implementer_invites_role_id_fkey";

-- DropForeignKey
ALTER TABLE "member_permissions" DROP CONSTRAINT "member_permissions_member_id_fkey";

-- DropForeignKey
ALTER TABLE "member_permissions" DROP CONSTRAINT "member_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_member_id_fkey";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "supervisors" DROP CONSTRAINT "supervisors_memberId_fkey";

-- AlterTable
ALTER TABLE "implementer_invites" DROP COLUMN "role_id",
ADD COLUMN     "implementer_role" "implementer_roles" NOT NULL;

-- AlterTable
ALTER TABLE "implementer_members" ADD COLUMN     "identifier" VARCHAR(255),
ADD COLUMN     "role" "implementer_roles" NOT NULL;

-- AlterTable
ALTER TABLE "supervisors" DROP COLUMN "memberId";

-- DropTable
DROP TABLE "member_permissions";

-- DropTable
DROP TABLE "member_roles";

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "roles";
