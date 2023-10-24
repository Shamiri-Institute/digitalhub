import { db } from "#/lib/db";

export interface CurrentUser {
  email: string | null;
  name: string | null;
  activeOrgId: string;
  organizations: {
    id: string;
    name: string;
    roles: {
      id: string;
      name: string;
      description: string;
    }[];
  }[];
  avatarUrl: string | null;
  isRole: (role: string) => boolean;
}

export async function fetchAuthedUser() {
  const user = await fetchCurrentUser();
  if (user === null) {
    throw new Error("User not found");
  }

  return user;
}

// TODO: dummy values, use auth/cookies to pull this info
async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const user = await db.user.findFirst({
    where: { email: "jackline@shamiri.institute" },
    select: {
      email: true,
      name: true,
      avatar: {
        select: { file: true },
      },
      memberships: {
        select: {
          implementer: true,
          roles: {
            select: { role: true },
          },
        },
      },
    },
  });
  if (!user) {
    return null;
  }

  let avatarUrl: string | null = null;
  if (user.avatar) {
    const fileIdHash = user.avatar.file.id.slice(5);
    const fileName = user.avatar.file.fileName;
    avatarUrl = `/api/files/${fileIdHash}/${fileName}`;
  }

  return {
    email: user.email,
    name: user.name,
    // TODO: pull from separate cookie to allow switching orgs without logging out
    activeOrgId: user.memberships[0]!.implementer.id,
    organizations: user.memberships.map((m) => {
      return {
        id: m.implementer.id,
        name: m.implementer.implementerName,
        roles: m.roles.map((r) => r.role),
      };
    }),
    avatarUrl,
    isRole: (roleId: string) => {
      return user.memberships.some((m) => {
        return m.roles.some((r) => r.role.id === roleId);
      });
    },
  };
}
