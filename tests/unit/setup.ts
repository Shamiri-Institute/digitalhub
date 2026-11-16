import { afterAll, vi } from "vitest";

// Test files share one module graph and one database pool (`isolate: false`), so whatever a file
// changes in the process is put back before the next file runs.
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
