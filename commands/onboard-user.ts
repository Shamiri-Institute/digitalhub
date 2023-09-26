import { z } from "zod";

import { Command } from "#/commands";
import { db as database, Database } from "#/lib/db";
import { UserModel } from "#/models/user";
import { JoinOrganizationCommand } from "./join-organization";
import { sendEmail } from "#/emails";
import UserWelcomer from "#/emails/user-welcomer";
import { OrganizationModel } from "#/models/organization";

interface OnboardUserInput {
  email: string;
  organizationId: string;
  inviterId: string;
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
    const validInput = this.validate(input);

    const user = await this.db.$transaction(async (tx) => {
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

      await new JoinOrganizationCommand(tx).run({
        organizationId: validInput.organizationId,
        userId: user.id,
        inviterId: inviter.id,
      });

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

      return user;
    });

    return { userId: user.id };
  }

  private validate(input: OnboardUserInput) {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(1).max(100),
      organizationId: z.string(),
      inviterId: z.string(),
    });

    return schema.parse(input);
  }
}
