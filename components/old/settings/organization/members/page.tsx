import { Breadcrumbs } from "#/components/breadcrumbs";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

import { MembersTable } from "./members-table";

export interface Member {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

export default async function ImplementerMembers() {
  const currentImplementerId = (await db.implementer.findFirst())?.id!;
  const memberships = await db.implementerMember.findMany({
    where: {
      implementerId: currentImplementerId,
    },
    select: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
        },
      },
      role: true,
    },
  });
  const members: Member[] = memberships.map((membership) => ({
    name: membership.user.name ?? "",
    email: membership.user.email ?? "",
    role: membership.role,
    avatarUrl: membership.user.avatar
      ? `/api/files/${membership.user.avatar.fileId.slice(5)}/avatar`
      : null,
  }));

  return (
    <main className="mt-10 md:mt-0">
      <Breadcrumbs crumbs={["Settings", "Implementer", "Members"]} />
      <div className="md:mt-4">
        <div className="py-2 text-sm text-muted-foreground md:text-base">
          Manage who is a member of this implementer.
        </div>
        <Separator className="my-4" />
        <div>
          <MembersTable members={members} />
        </div>
      </div>
    </main>
  );
}
