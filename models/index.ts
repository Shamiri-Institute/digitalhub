import { objectId } from "#/lib/crypto";
import type { DatabaseCursor, TransactionCursor } from "#/lib/db";

export class SoleRecordExpectedError extends Error {
  constructor() {
    super("Sole record expected");
  }
}

export class ReturningRecordsExpectedError extends Error {
  constructor() {
    super("Returning records expected after insertion and update operations");
  }
}

export abstract class Model {
  public abstract prefix: Readonly<string>;

  generateId() {
    return objectId(this.prefix);
  }

  protected cursor: TransactionCursor | DatabaseCursor;

  constructor(cursor: TransactionCursor | DatabaseCursor) {
    this.cursor = cursor;
  }
}
