import { Prisma } from "@prisma/client";

import type { db } from "#/lib/db";
import { Model } from "#/models";

type implementerCreateOutput = Prisma.PromiseReturnType<
  typeof db.implementer.create
>;
type implementerFindUniqueOutput = Prisma.PromiseReturnType<
  typeof db.implementer.findUnique
>;

export const implementerPrefix = "impl";

export class implementerModel extends Model {
  prefix = implementerPrefix;

  async findUnique(id: string): Promise<implementerFindUniqueOutput | null> {
    return await this.cursor.implementer.findUnique({
      where: { id, archivedAt: null },
    });
  }

  async create(
    data: Omit<Prisma.implementerCreateInput, "id">,
  ): Promise<implementerCreateOutput> {
    return await this.cursor.implementer.create({
      data: {
        ...data,
        id: this.generateId(),
      },
    });
  }
}
