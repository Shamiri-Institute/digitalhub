import { z } from "zod";

import { db as database, Database } from "#/lib/db";
import { Command } from "#/commands";
import { sendEmail } from "#/emails";
import UserWelcomer from "#/emails/user-welcomer";

const InviteMaxAge = 1000 * 60 * 60 * 24 * 7; // 1 week

interface InviteUserInput {
  email: string;
  organizationId: string;
  inviterId: string;
  roleId: string;
}

export class InviteUserCommand extends Command<
  InviteUserInput,
  {
    invitationId: number;
  }
> {
  private db: Database;

  constructor(db: Database = database) {
    super();
    this.db = db;
  }

  protected async perform(input: InviteUserInput) {
    const { email, organizationId, inviterId, roleId } = z
      .object({
        email: z.string().email(),
        organizationId: z.string(),
        inviterId: z.string(),
        roleId: z.string(),
      })
      .parse(input);

    const uniqueKey = `${email}${organizationId}${roleId}${new Date().getTime()}`;
    const array = new TextEncoder().encode(uniqueKey);
    const digest = await crypto.subtle.digest("SHA-256", array);
    const secureToken = Buffer.from(digest).toString("base64");

    const invitation = await this.db.organizationInvite.create({
      data: {
        email,
        organizationId,
        roleId,
        expiresAt: new Date(Date.now() + InviteMaxAge),
        secureToken,
      },
    });

    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new Error("Organization not found");
    }

    const subject = `Welcome to Shamiri!`;
    await sendEmail({
      to: email,
      subject: subject,
      react: UserWelcomer({
        email,
        organizationName: organization.name,
        preview: subject,
      }),
    });

    // TODO: add to audit log
    console.log(`user#${inviterId} invited ${email} to ${organization.name}`);

    return { invitationId: invitation.id };
  }
}
