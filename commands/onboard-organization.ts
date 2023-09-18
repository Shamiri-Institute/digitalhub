import { z } from "zod";

import { db as database, Database } from "#/lib/db";
import { Command } from "#/commands";
import { OrganizationModel } from "#/models/organization";
import { sendEmail } from "#/emails";
import OrganizationWelcomer from "#/emails/organization-welcomer";

interface OnboardOrgInput {
  name: string;
  contactEmail: string;
  inviterId: string;
}

interface OnboardOrgOutput {
  id: string;
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

    const model = new OrganizationModel(this.db);
    const organization = await model.create({
      name: validInput.name,
      contactEmail: validInput.contactEmail,
    });

    await sendEmail({
      email: organization.contactEmail,
      subject: `${organization.name} on Shamiri Digital Hub`,
      react: OrganizationWelcomer({
        name: organization.name,
        email: organization.contactEmail,
      }),
    });

    return { id: organization.id };
  }

  private validate(input: OnboardOrgInput) {
    const schema = z.object({
      name: z.string().min(1).max(255),
      contactEmail: z.string().email(),
    });

    return schema.parse(input);
  }
}
