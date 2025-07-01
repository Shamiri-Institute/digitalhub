import type { Prisma } from "@prisma/client";

import { Model } from "#/models";

export class FileModel extends Model {
  prefix = "file";

  async create(data: Prisma.FileCreateInput) {
    return await this.cursor.file.create({ data });
  }
}
