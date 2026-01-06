import { objectId } from "#/lib/crypto";
import type { DefaultCursor, TransactionCursor } from "#/lib/db";

export abstract class Model {
  public abstract prefix: Readonly<string>;

  generateId() {
    return objectId(this.prefix);
  }

  protected cursor: TransactionCursor | DefaultCursor;

  constructor(cursor: TransactionCursor | DefaultCursor) {
    this.cursor = cursor;
  }
}
