-- CreateTable
CREATE TABLE "implementors" (
    "id" VARCHAR(255) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "contact_email" TEXT NOT NULL,

    CONSTRAINT "implementors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementor_avatars" (
    "id" VARCHAR(255) NOT NULL,
    "implementor_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,

    CONSTRAINT "implementor_avatars_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "users" (
    "id" VARCHAR(255) NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "implementor_members" (
    "id" SERIAL NOT NULL,
    "implementor_id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "implementor_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementor_invites" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "implementor_id" VARCHAR(255) NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "role_id" VARCHAR(255) NOT NULL,
    "secure_token" TEXT NOT NULL,

    CONSTRAINT "implementor_invites_pkey" PRIMARY KEY ("id")
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
    "implementor_id" VARCHAR(255),
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
    "hub_id" VARCHAR(255) NOT NULL,
    "school_name" VARCHAR(255) NOT NULL,

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
    "coordinator_id" INTEGER,
    "implementor_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "implementors_name_key" ON "implementors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "implementor_avatars_implementor_id_key" ON "implementor_avatars"("implementor_id");

-- CreateIndex
CREATE UNIQUE INDEX "implementor_avatars_file_id_key" ON "implementor_avatars"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_recent_opens_user_id_item_id_idx" ON "user_recent_opens"("user_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatars_user_id_key" ON "user_avatars"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatars_file_id_key" ON "user_avatars"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "implementor_invites_email_implementor_id_secure_token_key" ON "implementor_invites"("email", "implementor_id", "secure_token");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_label_key" ON "permissions"("permission_label");

-- CreateIndex
CREATE UNIQUE INDEX "fellows_email_key" ON "fellows"("email");

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_visible_id_key" ON "supervisors"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_email_key" ON "supervisors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hubs_visible_id_key" ON "hubs"("visible_id");

-- AddForeignKey
ALTER TABLE "implementor_avatars" ADD CONSTRAINT "implementor_avatars_implementor_id_fkey" FOREIGN KEY ("implementor_id") REFERENCES "implementors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementor_avatars" ADD CONSTRAINT "implementor_avatars_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_recent_opens" ADD CONSTRAINT "user_recent_opens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementor_members" ADD CONSTRAINT "implementor_members_implementor_id_fkey" FOREIGN KEY ("implementor_id") REFERENCES "implementors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementor_members" ADD CONSTRAINT "implementor_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementor_invites" ADD CONSTRAINT "implementor_invites_implementor_id_fkey" FOREIGN KEY ("implementor_id") REFERENCES "implementors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementor_invites" ADD CONSTRAINT "implementor_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "implementor_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "implementor_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_implementor_id_fkey" FOREIGN KEY ("implementor_id") REFERENCES "implementors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "implementor_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "implementor_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_implementor_id_fkey" FOREIGN KEY ("implementor_id") REFERENCES "implementors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
