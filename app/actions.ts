"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "#/lib/db";
import { InviteUserCommand } from "#/commands/invite-user";

export async function inviteUserToOrganization(prevState: any, formData: any) {
  const data = z
    .object({
      emails: z.string().transform((val) => val.split(",")),
      role: z.string(),
    })
    .parse({
      emails: formData.get("emails"),
      role: formData.get("role"),
    });

  // TODO: dummy values, use auth/cookies to pull this info
  const currentOrganization = await db.organization.findFirstOrThrow();
  const currentUser = await db.user.findFirstOrThrow();

  const invitations = data.emails.map(async (email) => {
    // TODO: move this to background job, don't want to creep up on serverless fx limit if alot of invites
    const inviteUser = new InviteUserCommand();
    await inviteUser.run({
      email,
      organizationId: currentOrganization.id,
      inviterId: currentUser.id,
      roleId: data.role,
    });
  });
  await Promise.all(invitations);

  revalidatePath("/admin/organization/members");
}
