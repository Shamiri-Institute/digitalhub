import { Prisma } from "@prisma/client";

import type { db } from "#/lib/db";
import { Model } from "#/models";

type ImplementorCreateOutput = Prisma.PromiseReturnType<
  typeof db.implementor.create
>;
type ImplementorFindUniqueOutput = Prisma.PromiseReturnType<
  typeof db.implementor.findUnique
>;

export const ImplementorPrefix = "impl";

export class ImplementorModel extends Model {
  prefix = ImplementorPrefix;

  async findUnique(id: string): Promise<ImplementorFindUniqueOutput | null> {
    return await this.cursor.implementor.findUnique({
      where: { id, archivedAt: null },
    });
  }

  async create(
    data: Omit<Prisma.ImplementorCreateInput, "id">,
  ): Promise<ImplementorCreateOutput> {
    return await this.cursor.implementor.create({
      data: {
        ...data,
        id: this.generateId(),
      },
    });
  }
}
