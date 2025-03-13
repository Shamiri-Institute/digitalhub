-- CreateTable
CREATE TABLE "ops_users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(10),
    "cell_phone" VARCHAR(255),
    "dropped_out" BOOLEAN,
    "implementer_id" VARCHAR(255) NOT NULL,
    "assigned_hub_id" VARCHAR(255),

    CONSTRAINT "ops_users_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ops_users" ADD CONSTRAINT "ops_users_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_users" ADD CONSTRAINT "ops_users_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
