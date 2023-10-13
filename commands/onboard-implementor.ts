import * as React from "react"; // prettier-ignore
import { z } from "zod";

import { Command } from "#/commands";
import { UploadImageCommand } from "#/commands/upload-image";
import { sendEmail } from "#/emails";
import ImplementorWelcomer from "#/emails/implementor-welcomer";
import { objectId } from "#/lib/crypto";
import { db as database, Database } from "#/lib/db";
import { ImplementorModel } from "#/models/implementor";

interface OnboardImplementorInput {
  name: string;
  contactEmail: string;
  inviterId: string;
  avatarUrl?: string;
}

interface OnboardImplementorOutput {
  implementorId: string;
}

export class OnboardImplementorCommand extends Command<
  OnboardImplementorInput,
  OnboardImplementorOutput
> {
  private db: Database;

  constructor(db: Database = database) {
    super();
    this.db = db;
  }

  protected async perform(input: OnboardImplementorInput) {
    const validInput = this.validate(input);

    const implementor = await new ImplementorModel(this.db).create({
      name: validInput.name,
      contactEmail: validInput.contactEmail,
    });

    if (input.avatarUrl) {
      const file = await new UploadImageCommand().run({
        url: input.avatarUrl,
      });

      await this.db.implementorAvatar.create({
        data: {
          id: objectId("iavatar"),
          implementorId: implementor.id,
          fileId: file.id,
        },
      });
    }

    const subject = `${implementor.name} joins Shamiri Digital Hub!`;
    const emailComponent: React.ReactElement = ImplementorWelcomer({
      name: implementor.name,
      email: implementor.contactEmail,
      preview: subject,
    });
    await sendEmail({
      to: implementor.contactEmail,
      subject: subject,
      react: emailComponent,
    });

    return { implementorId: implementor.id };
  }

  private validate(input: OnboardImplementorInput) {
    const schema = z.object({
      name: z.string().min(1).max(255),
      contactEmail: z.string().email(),
    });

    return schema.parse(input);
  }
}
