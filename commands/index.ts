import { type DatabaseCursor, db as database } from "#/lib/db";

export abstract class Command<Input, Output> {
  protected abstract perform(input: Input): Promise<Output>;

  public async run(input: Input): Promise<Output> {
    const result = await this.perform(input);
    return result;
  }
}

/**
 * A command that can use either the default connection or a transaction.
 */
export abstract class DatabaseCommand<Input, Output> extends Command<Input, Output> {
  protected db: DatabaseCursor;

  constructor(db: DatabaseCursor = database) {
    super();
    this.db = db;
  }
}
