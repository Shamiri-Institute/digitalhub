import { z } from "zod";

import { objectId } from "#/lib/crypto";
import { db as database, Database } from "#/lib/db";
import { OrganizationModel } from "#/models/organization";
import { sendEmail } from "#/emails";
import OrganizationWelcomer from "#/emails/organization-welcomer";
import { Command } from "#/commands";
import { UploadImageCommand } from "#/commands/upload-image";

interface OnboardOrgInput {
  name: string;
  contactEmail: string;
  inviterId: string;
  avatarUrl?: string;
}

interface OnboardOrgOutput {
  organizationId: string;
}

export class OnboardOrganizationCommand extends Command<
  OnboardOrgInput,
  OnboardOrgOutput
> {
  private db: Database;

  constructor(db: Database = database) {
    super();
    this.db = db;
  }

  protected async perform(input: OnboardOrgInput) {
    const validInput = this.validate(input);

    const organization = await new OrganizationModel(this.db).create({
      name: validInput.name,
      contactEmail: validInput.contactEmail,
    });

    if (input.avatarUrl) {
      const file = await new UploadImageCommand().run({
        url: input.avatarUrl,
      });

      await this.db.organizationAvatar.create({
        data: {
          id: objectId("oavatar"),
          organizationId: organization.id,
          fileId: file.id,
        },
      });
    }

    const subject = `${organization.name} joins Shamiri Digital Hub!`;
    await sendEmail({
      to: organization.contactEmail,
      subject: subject,
      react: OrganizationWelcomer({
        name: organization.name,
        email: organization.contactEmail,
        preview: subject,
      }),
    });

    return { organizationId: organization.id };
  }

  private validate(input: OnboardOrgInput) {
    const schema = z.object({
      name: z.string().min(1).max(255),
      contactEmail: z.string().email(),
    });

    return schema.parse(input);
  }
}
