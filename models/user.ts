import { Prisma } from "@prisma/client";

import { Model } from "#/models";
import type { db } from "#/lib/db";

type UserCreateOutput = Prisma.PromiseReturnType<typeof db.user.create>;
type UserFindUniqueOutput = Prisma.PromiseReturnType<typeof db.user.findUnique>;

export class UserModel extends Model {
  prefix = "user";

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
