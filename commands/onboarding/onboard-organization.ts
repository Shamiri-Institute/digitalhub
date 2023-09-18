import { z } from "zod";

import { db as database, Database } from "#/lib/db";
import { Command } from "#/commands";
import { OrganizationRepository } from "#/repositories/organization";

interface OnboardOrganizationInput {
  name: string;
  contactEmail: string;
}

interface OnboardOrganizationOutput {
  id: string;
}

export class OnboardOrganization extends Command<
  OnboardOrganizationInput,
  OnboardOrganizationOutput
> {
  private db: Database;

  constructor(db: Database = database) {
    super();
    this.db = db;
  }

  protected async perform(input: OnboardOrganizationInput) {
    const { name, contactEmail } = this.validate(input);

    const repo = new OrganizationRepository(this.db);
    const organization = await repo.create({
      name,
      contactEmail,
    });

    // TODO: send email to contact email with onboarding steps

    return { id: organization.id };
  }

  private validate(input: OnboardOrganizationInput) {
    const schema = z.object({
      name: z.string().min(1).max(255),
      contactEmail: z.string().email(),
    });

    return schema.parse(input);
  }
}
