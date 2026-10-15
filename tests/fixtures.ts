import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

type Step = () => Promise<unknown>;
export type Undo = (...steps: Step[]) => void;

export const test = base.extend<{ undo: Undo }>({
  // Fixture teardown runs even when the test times out; a finally block in the test body does not.
  // oxlint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from this pattern
  undo: async ({}, provide) => {
    const steps: Step[] = [];
    await provide((...added) => {
      steps.push(...added);
    });
    for (const step of steps.reverse()) {
      await step();
    }
  },
});
