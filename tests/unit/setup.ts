import { afterAll, vi } from "vitest";

// Files share one process (`isolate: false`); undo what a file changed before the next one runs.
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
