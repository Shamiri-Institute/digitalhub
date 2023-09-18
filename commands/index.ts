export abstract class Command<Input, Output> {
  protected abstract perform(input: Input): Promise<Output>;

  public async run(input: Input): Promise<Output> {
    const result = await this.perform(input);
    return result;
  }
}
