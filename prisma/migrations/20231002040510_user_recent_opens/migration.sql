-- CreateTable
CREATE TABLE "user_recent_opens" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "item_id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_recent_opens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_recent_opens_user_id_item_id_idx" ON "user_recent_opens"("user_id", "item_id");

-- AddForeignKey
ALTER TABLE "user_recent_opens" ADD CONSTRAINT "user_recent_opens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
