import { z } from "zod";

import { Command } from "#/commands";
import { sendEmail } from "#/emails";
import UserWelcomer from "#/emails/user-welcomer";
import { db as database, type Database } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

const InviteMaxAge = 1000 * 60 * 60 * 24 * 7; // 1 week

interface InviteUserInput {
  email: string;
  implementerId: string;
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
    const { email, implementerId, inviterId, roleId } = z
      .object({
        email: z.string().email(),
        implementerId: z.string(),
        inviterId: z.string(),
        roleId: z.string(),
      })
      .parse(input);

    const uniqueKey = `${email}${implementerId}${roleId}${new Date().getTime()}`;
    const array = new TextEncoder().encode(uniqueKey);
    const digest = await crypto.subtle.digest("SHA-256", array);
    const secureToken = Buffer.from(digest).toString("base64");

    let implementerRole: ImplementerRole = ImplementerRole.ADMIN;
    if (roleId === "supervisor") {
      implementerRole = ImplementerRole.SUPERVISOR;
    } else if (roleId === "hub-coordinator") {
      implementerRole = ImplementerRole.HUB_COORDINATOR;
    } else if (roleId === "deliver") {
      implementerRole = ImplementerRole.OPERATIONS;
    }

    const invitation = await this.db.implementerInvite.create({
      data: {
        email,
        implementerId,
        implementerRole,
        expiresAt: new Date(Date.now() + InviteMaxAge),
        secureToken,
      },
    });

    const implementer = await this.db.implementer.findUnique({
      where: { id: implementerId },
    });
    if (!implementer) {
      throw new Error("Implementer not found");
    }

    const subject = "Welcome to the Shamiri Digital Hub!";
    await sendEmail({
      to: email,
      subject: subject,
      react: UserWelcomer({
        email,
        implementerName: implementer.implementerName,
        preview: subject,
      }),
    });

    // TODO: add to audit log
    console.log(`user#${inviterId} invited ${email} to ${implementer.implementerName}`);

    return { invitationId: invitation.id };
  }
}
