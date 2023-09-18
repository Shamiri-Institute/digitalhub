import { Command } from "#/commands";
import { db as database, Database } from "#/lib/db";

interface OnboardOrganizationInput {
  name: string;
  contactEmail: string;
}

interface OnboardOrganizationOutput {
  id: number;
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
    // - validate input
    // - save organization to database
    // - return url to upload logo from browser
    // - send email to contact email with onboarding steps

    return { id: 1 };
  }
}
