-- CreateTable
CREATE TABLE "school_dropout_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "dropped_out" BOOLEAN NOT NULL,
    "dropout_reason" TEXT,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,

    CONSTRAINT "school_dropout_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "school_dropout_history" ADD CONSTRAINT "school_dropout_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_dropout_history" ADD CONSTRAINT "school_dropout_history_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
