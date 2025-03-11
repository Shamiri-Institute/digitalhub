-- AlterEnum
ALTER TYPE "implementer_roles" ADD VALUE 'CLINICAL_LEAD';

-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "clinicalLeadId" TEXT;

-- CreateTable
CREATE TABLE "clinical_leads" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "clinical_lead_name" VARCHAR(255) NOT NULL,
    "clinical_lead_email" VARCHAR(255) NOT NULL,
    "county" VARCHAR(255),
    "sub_county" VARCHAR(255),
    "bank_name" VARCHAR(255),
    "bank_branch" VARCHAR(255),
    "bank_account_name" VARCHAR(255),
    "bank_account_number" VARCHAR(255),
    "kra" VARCHAR(255),
    "nhif" VARCHAR(255),
    "nssf" VARCHAR(255),
    "date_of_birth" DATE,
    "gender" VARCHAR(10),
    "training_level" VARCHAR(255),
    "dropped_out" BOOLEAN,
    "assigned_hub_id" VARCHAR(255) NOT NULL,
    "implementer_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "clinical_leads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_clinicalLeadId_fkey" FOREIGN KEY ("clinicalLeadId") REFERENCES "clinical_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_leads" ADD CONSTRAINT "clinical_leads_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_leads" ADD CONSTRAINT "clinical_leads_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
