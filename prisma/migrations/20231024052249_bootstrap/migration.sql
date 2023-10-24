-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "implementers" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "visible_id" VARCHAR(10) NOT NULL,
    "implementer_name" TEXT NOT NULL,
    "implementer_type" TEXT NOT NULL,
    "implementer_address" TEXT,
    "county_of_operation" TEXT,
    "point_person_name" TEXT,
    "point_person_phone" TEXT,
    "point_person_email" TEXT,

    CONSTRAINT "implementers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementer_avatars" (
    "id" VARCHAR(255) NOT NULL,
    "implementer_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,

    CONSTRAINT "implementer_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "signed_url" VARCHAR(2048),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_recent_opens" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "item_id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_recent_opens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_avatars" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementer_members" (
    "id" SERIAL NOT NULL,
    "implementer_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "implementer_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementer_invites" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "implementer_id" VARCHAR(255) NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "role_id" VARCHAR(255) NOT NULL,
    "secure_token" TEXT NOT NULL,

    CONSTRAINT "implementer_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_roles" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "role_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "member_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SMALLSERIAL NOT NULL,
    "permission_label" VARCHAR(255) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" VARCHAR(255) NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_permissions" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "member_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "hub_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fellows" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "hub_id" VARCHAR(255),
    "supervisor_id" VARCHAR(255),
    "fellow_name" VARCHAR(255),
    "year_of_implementation" INTEGER,
    "mpesa_name" VARCHAR(255),
    "id_number" VARCHAR(255),
    "cell_number" VARCHAR(255),
    "mpesa_number" VARCHAR(255),
    "email" VARCHAR(255),
    "implementer_id" VARCHAR(255),
    "county" VARCHAR(255),
    "sub_county" VARCHAR(255),
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "dropped_out" BOOLEAN,
    "transferred" BOOLEAN,

    CONSTRAINT "fellows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisors" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "hub_id" VARCHAR(255) NOT NULL,
    "supervisor_name" VARCHAR(255) NOT NULL,
    "visible_id" VARCHAR(10) NOT NULL,
    "id_number" VARCHAR(255),
    "cell_number" VARCHAR(255),
    "mpesa_number" VARCHAR(255),
    "email" VARCHAR(255),
    "member_id" INTEGER,

    CONSTRAINT "supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "school_name" VARCHAR(255) NOT NULL,
    "school_type" VARCHAR(255),
    "school_email" VARCHAR(255),
    "school_county" VARCHAR(255),
    "school_demographics" VARCHAR(255),
    "visible_id" VARCHAR(100) NOT NULL,
    "implementer_id" VARCHAR(255),
    "hub_id" VARCHAR(255),
    "point_person_name" VARCHAR(255),
    "point_person_id" VARCHAR(255),
    "point_person_phone" VARCHAR(255),
    "point_person_email" VARCHAR(255),
    "numbers_expected" INTEGER,
    "boarding_day" VARCHAR(255),
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "dropped_out" BOOLEAN,
    "pre_session_date" TIMESTAMP(3),
    "session_1_date" TIMESTAMP(3),
    "session_2_date" TIMESTAMP(3),
    "session_3_date" TIMESTAMP(3),
    "session_4_date" TIMESTAMP(3),
    "clinical_followup_1_date" TIMESTAMP(3),
    "clinical_followup_2_date" TIMESTAMP(3),
    "clinical_followup_3_date" TIMESTAMP(3),
    "clinical_followup_4_date" TIMESTAMP(3),
    "clinical_followup_5_date" TIMESTAMP(3),
    "clinical_followup_6_date" TIMESTAMP(3),
    "clinical_followup_7_date" TIMESTAMP(3),
    "clinical_followup_8_date" TIMESTAMP(3),
    "data_collection_followup_1_date" TIMESTAMP(3),

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubs" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "visible_id" VARCHAR(10) NOT NULL,
    "hub_name" VARCHAR(255) NOT NULL,
    "coordinator_id" TEXT,
    "implementer_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_coordinators" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "visible_id" VARCHAR(10) NOT NULL,
    "coordinator_name" VARCHAR(255) NOT NULL,
    "coordinator_email" VARCHAR(255),
    "id_number" VARCHAR(255),
    "cell_number" VARCHAR(255),
    "mpesa_number" VARCHAR(255),
    "implementer_id" VARCHAR(255) NOT NULL,
    "county" VARCHAR(255),
    "sub_county" VARCHAR(255),
    "bank_name" VARCHAR(255),
    "bank_branch" VARCHAR(255),
    "bank_account_number" VARCHAR(255),
    "bank_account_name" VARCHAR(255),
    "kra" VARCHAR(255),
    "nhif" VARCHAR(255),
    "date_of_birth" DATE,
    "gender" VARCHAR(10),
    "training_level" VARCHAR(255),
    "dropped_out" BOOLEAN,

    CONSTRAINT "hub_coordinators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "implementers_visible_id_key" ON "implementers"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "implementer_avatars_implementer_id_key" ON "implementer_avatars"("implementer_id");

-- CreateIndex
CREATE UNIQUE INDEX "implementer_avatars_file_id_key" ON "implementer_avatars"("file_id");

-- CreateIndex
CREATE INDEX "user_recent_opens_user_id_item_id_idx" ON "user_recent_opens"("user_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatars_user_id_key" ON "user_avatars"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatars_file_id_key" ON "user_avatars"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "implementer_invites_email_implementer_id_secure_token_key" ON "implementer_invites"("email", "implementer_id", "secure_token");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_label_key" ON "permissions"("permission_label");

-- CreateIndex
CREATE UNIQUE INDEX "fellows_email_key" ON "fellows"("email");

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_visible_id_key" ON "supervisors"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_email_key" ON "supervisors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "schools_visible_id_key" ON "schools"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "hubs_visible_id_key" ON "hubs"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_coordinators_visible_id_key" ON "hub_coordinators"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_coordinators_coordinator_email_key" ON "hub_coordinators"("coordinator_email");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementer_avatars" ADD CONSTRAINT "implementer_avatars_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementer_avatars" ADD CONSTRAINT "implementer_avatars_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_recent_opens" ADD CONSTRAINT "user_recent_opens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementer_members" ADD CONSTRAINT "implementer_members_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementer_members" ADD CONSTRAINT "implementer_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementer_invites" ADD CONSTRAINT "implementer_invites_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementer_invites" ADD CONSTRAINT "implementer_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "implementer_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "implementer_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "implementer_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "hub_coordinators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_coordinators" ADD CONSTRAINT "hub_coordinators_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
