CREATE TYPE "upload_ticket_status" AS ENUM ('PENDING', 'USED', 'EXPIRED');

CREATE TABLE "s3_upload_permits" (
    "id" TEXT NOT NULL,
    "bucket" VARCHAR(100) NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "context" JSONB NOT NULL,
    "issued_to" VARCHAR(255) NOT NULL,
    "status" "upload_ticket_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "s3_upload_permits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "s3_upload_permits_issued_to_status_idx" ON "s3_upload_permits"("issued_to", "status");

CREATE UNIQUE INDEX "s3_upload_permits_bucket_key_key" ON "s3_upload_permits"("bucket", "key");
