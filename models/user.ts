import { Prisma } from "@prisma/client";

import { Model } from "#/models";
import type { db } from "#/lib/db";
import { SessionUser } from "#/app/api/auth/[...nextauth]/route";

type UserCreateOutput = Prisma.PromiseReturnType<typeof db.user.create>;
type UserFindUniqueOutput = Prisma.PromiseReturnType<typeof db.user.findUnique>;

export class UserModel extends Model {
  prefix = "user";

  static avatarUrl(user: SessionUser) {
    return user.avatarUrl ?? null;
  }

  async findCurrentUser(email: string) {
    return await this.cursor.user.findUnique({
      where: { email },
      select: {
        email: true,
        name: true,
        avatar: {
          select: {
            file: {
              select: { id: true },
            },
          },
        },
        memberships: {
          select: {
            organization: true,
            roles: {
              select: { role: true },
            },
          },
        },
      },
    });
  }

  async findUnique(id: string): Promise<UserFindUniqueOutput | null> {
    return await this.cursor.user.findUnique({
      where: { id, archivedAt: null },
    });
  }

  async create(
    data: Omit<Prisma.UserCreateInput, "id">
  ): Promise<UserCreateOutput> {
    return await this.cursor.user.create({
      data: {
        ...data,
        id: this.generateId(),
      },
    });
  }
}
