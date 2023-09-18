import { Prisma } from "@prisma/client";

import { Repository } from "#/repositories";
import type { db } from "#/lib/db";
import { objectId } from "#/lib/crypto";

type OrganizationCreateOutput = Prisma.PromiseReturnType<
  typeof db.organization.create
>;

export class OrganizationRepository extends Repository {
  prefix = "org";

  generateId() {
    return objectId(this.prefix);
  }

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
