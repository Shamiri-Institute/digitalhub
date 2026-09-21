-- CreateTable
CREATE TABLE "school_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "school_id" VARCHAR(255) NOT NULL,
    "uploaded_by" VARCHAR(255) NOT NULL,

    CONSTRAINT "school_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fellow_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "uploaded_by" VARCHAR(255) NOT NULL,

    CONSTRAINT "fellow_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "school_documents" ADD CONSTRAINT "school_documents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_documents" ADD CONSTRAINT "school_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_documents" ADD CONSTRAINT "fellow_documents_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_documents" ADD CONSTRAINT "fellow_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
