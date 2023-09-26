import { DatabaseCommand } from ".";

type JoinOrgInput = {
  organizationId: string;
  userId: string;
  inviterId: string;
};

type JoinOrgOutput = {
  membershipId: number;
};

export class JoinOrganizationCommand extends DatabaseCommand<
  JoinOrgInput,
  JoinOrgOutput
> {
  protected async perform(input: JoinOrgInput) {
    const { organizationId, userId } = input;

    const membership = await this.db.organizationMember.create({
      data: {
        organizationId,
        userId,
      },
    });

    return { membershipId: membership.id };
  }
}
