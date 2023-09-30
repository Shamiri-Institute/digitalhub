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

// const data: Member[] = [
//   {
//     email: "osborn@shamiri.institute",
//     name: "Tom Osborn",
//     role: "Admin",
//     avatarUrl:
//       "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
//   },
//   {
//     email: "mmbone@shamiri.institute",
//     name: "Wendy Mmbone",
//     role: "Researcher",
//     avatarUrl:
//       "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3043&q=80",
//   },
//   {
//     email: "benny@shamiri.institute",
//     name: "Benny H. Otieno",
//     role: "Admin",
//     avatarUrl:
//       "https://images.unsplash.com/photo-1596005554384-d293674c91d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=5396&q=80",
//   },
//   {
//     email: "linus@shamiri.institute",
//     name: "Linus Wong",
//     role: "Admin",
//     avatarUrl: null,
//   },
//   {
//     email: "edmund@shamiri.institute",
//     name: "Edmund Korley",
//     role: "Admin",
//     avatarUrl: null,
//   },
// ];

export default async function OrganizationMembers() {
  const currentOrganizationId = (await db.organization.findFirst())?.id!;
  const memberships = await db.organizationMember.findMany({
    where: {
      organizationId: currentOrganizationId,
    },
    select: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
        },
      },
      roles: {
        select: {
          role: true,
        },
      },
    },
  });
  const members: Member[] = memberships.map((membership) => ({
    name: membership.user.name,
    email: membership.user.email,
    role: membership.roles[0]!.role.roleName,
    avatarUrl: membership.user.avatar
      ? `/api/files/${membership.user.avatar.fileId.slice(5)}/avatar`
      : null,
  }));

  return (
    <main className="mt-10 md:mt-0">
      <Breadcrumbs crumbs={["Settings", "Organization", "Members"]} />
      <div className="md:mt-4">
        <div className="text-sm md:text-base text-muted-foreground py-2">
          Manage who is a member of this organization.
        </div>
        <Separator className="my-4" />
        <div>
          <MembersTable members={members} />
        </div>
      </div>
    </main>
  );
}
