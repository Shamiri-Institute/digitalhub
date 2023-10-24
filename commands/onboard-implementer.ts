import * as React from "react"; // prettier-ignore
import { z } from "zod";

import { Command } from "#/commands";
import { UploadImageCommand } from "#/commands/upload-image";
import { sendEmail } from "#/emails";
import implementerWelcomer from "#/emails/implementer-welcomer";
import { objectId } from "#/lib/crypto";
import { db as database, Database } from "#/lib/db";
import { implementerModel } from "#/models/implementer";

interface OnboardimplementerInput {
  name: string;
  contactEmail: string;
  inviterId: string;
  avatarUrl?: string;
}

interface OnboardimplementerOutput {
  implementerId: string;
}

export class OnboardimplementerCommand extends Command<
  OnboardimplementerInput,
  OnboardimplementerOutput
> {
  private db: Database;

  constructor(db: Database = database) {
    super();
    this.db = db;
  }

  protected async perform(input: OnboardimplementerInput) {
    const validInput = this.validate(input);

    const implementer = await new implementerModel(this.db).create({
      name: validInput.name,
      contactEmail: validInput.contactEmail,
    });

    if (input.avatarUrl) {
      const file = await new UploadImageCommand().run({
        url: input.avatarUrl,
      });

      await this.db.implementerAvatar.create({
        data: {
          id: objectId("iavatar"),
          implementerId: implementer.id,
          fileId: file.id,
        },
      });
    }

    const subject = `${implementer.name} joins Shamiri Digital Hub!`;
    const emailComponent: React.ReactElement = implementerWelcomer({
      name: implementer.name,
      email: implementer.contactEmail,
      preview: subject,
    });
    await sendEmail({
      to: implementer.contactEmail,
      subject: subject,
      react: emailComponent,
    });

    return { implementerId: implementer.id };
  }

  private validate(input: OnboardimplementerInput) {
    const schema = z.object({
      name: z.string().min(1).max(255),
      contactEmail: z.string().email(),
    });

    return schema.parse(input);
  }
}
