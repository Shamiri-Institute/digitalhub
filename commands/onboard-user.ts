import { z } from "zod";

import { Command } from "#/commands";
import { db as database, type Database } from "#/lib/db";
import { ImplementerModel } from "#/models/implementer";
import { UserModel } from "#/models/user";

interface OnboardUserInput {
  email: string;
  name: string;
  implementerId: string;
  inviterId: string;
  role: string;
  avatarUrl?: string;
}

interface OnboardUserOutput {
  userId: string;
}

export class InviterNotFoundError extends Error {}
export class implementerNotFoundError extends Error {}

export class OnboardUserCommand extends Command<OnboardUserInput, OnboardUserOutput> {
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
        implementerId: z.string(),
        inviterId: z.string(),
        role: z.string(),
      })
      .parse(input);

    const { user } = await this.db.$transaction(async (tx) => {
      const inviter = await new UserModel(tx).findUnique(validInput.inviterId);
      if (!inviter) {
        throw new InviterNotFoundError();
      }

      const user = await new UserModel(tx).create({
        email: validInput.email,
        name: validInput.name,
      });

      const implementer = await new ImplementerModel(tx).findUnique(validInput.implementerId);
      if (!implementer) {
        throw new implementerNotFoundError();
      }

      // const role = await tx.role.findFirst({
      //   where: { id: input.role },
      // });
      // if (!role) {
      //   throw new Error(`Role ${input.role} not found`);
      // }

      // const membership = await tx.implementerMember.create({
      //   data: {
      //     implementerId: implementer.id,
      //     userId: user.id,
      //   },
      // });

      // await tx.memberRole.create({
      //   data: {
      //     memberId: membership.id,
      //     roleId: role.id,
      //   },
      // });

      return { user, implementer };
    });

    // Run something like this when user signs up and we can pull avatar from google login / etc
    // if (input.avatarUrl) {
    //   const file = await new UploadImageCommand().run({
    //     url: input.avatarUrl,
    //   });

    //   await this.db.userAvatar.create({
    //     data: {
    //       id: objectId("uavatar"),
    //       userId: user.id,
    //       fileId: file.id,
    //     },
    //   });
    // }

    return { userId: user.id };
  }
}
