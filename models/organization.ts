import { Prisma } from "@prisma/client";

import { Model } from "#/models";
import type { db } from "#/lib/db";

type OrganizationCreateOutput = Prisma.PromiseReturnType<
  typeof db.organization.create
>;

export class OrganizationModel extends Model {
  prefix = "org";

  async create(
    data: Omit<Prisma.OrganizationCreateInput, "id">
  ): Promise<OrganizationCreateOutput> {
    return await this.cursor.organization.create({
      data: {
        ...data,
        id: this.generateId(),
      },
    });
  }
}
