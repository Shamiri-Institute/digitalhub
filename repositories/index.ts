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

export abstract class Repository {
  public abstract prefix: Readonly<string>;

  public abstract generateId(): string;

  protected cursor: TransactionCursor | DatabaseCursor;

  constructor(cursor: TransactionCursor | DatabaseCursor) {
    this.cursor = cursor;
  }
}
