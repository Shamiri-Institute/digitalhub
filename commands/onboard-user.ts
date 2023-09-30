import { z } from "zod";

import { db as database, Database } from "#/lib/db";
import { OrganizationModel } from "#/models/organization";
import { UserModel } from "#/models/user";
import { Command } from "#/commands";
import { UploadImageCommand } from "#/commands/upload-image";
import { sendEmail } from "#/emails";
import UserWelcomer from "#/emails/user-welcomer";
import { objectId } from "#/lib/crypto";

interface OnboardUserInput {
  email: string;
  name: string;
  organizationId: string;
  inviterId: string;
  roleName: string;
  avatarUrl?: string;
}

interface OnboardUserOutput {
  userId: string;
}

export class InviterNotFoundError extends Error {}
export class OrganizationNotFoundError extends Error {}

export class OnboardUserCommand extends Command<
  OnboardUserInput,
  OnboardUserOutput
> {
  private db: Database;

  constructor(db: Database = database) {
    super();
    this.db = db;
  }

  protected async perform(input: OnboardUserInput) {
    const validInput = z
      .object({
        email: z.string().email(),
        name: z.string().min(1).max(100),
        organizationId: z.string(),
        inviterId: z.string(),
        roleName: z.string(),
      })
      .parse(input);

    const { user, organization } = await this.db.$transaction(async (tx) => {
      const inviter = await new UserModel(tx).findUnique(validInput.inviterId);
      if (!inviter) {
        throw new InviterNotFoundError();
      }

      const user = await new UserModel(tx).create({
        email: validInput.email,
        name: validInput.email,
      });

      const organization = await new OrganizationModel(tx).findUnique(
        validInput.organizationId
      );
      if (!organization) {
        throw new OrganizationNotFoundError();
      }

      const role = await tx.role.findFirst({
        where: { roleName: input.roleName },
      });
      if (!role) {
        throw new Error(`Role ${input.roleName} not found`);
      }

      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
        },
      });

      await tx.memberRole.create({
        data: {
          memberId: membership.id,
          roleId: role.id,
        },
      });

      return { user, organization };
    });

    if (input.avatarUrl) {
      const file = await new UploadImageCommand().run({
        url: input.avatarUrl,
      });

      await this.db.userAvatar.create({
        data: {
          id: objectId("uavatar"),
          userId: user.id,
          fileId: file.id,
        },
      });
    }

    const subject = `Welcome to Shamiri, ${user.name}!`;
    await sendEmail({
      to: user.email,
      subject: subject,
      react: UserWelcomer({
        email: user.email,
        userName: user.name,
        organizationName: organization.name,
        preview: subject,
      }),
    });

    return { userId: user.id };
  }
}
