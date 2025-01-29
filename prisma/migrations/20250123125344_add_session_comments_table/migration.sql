-- CreateTable
CREATE TABLE "session_comments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "session_comments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
