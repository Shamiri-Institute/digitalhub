import { z } from "zod";

// Kept apart from lib/utils.ts, which every page imports for cn(): importing zod there put it in
// every page's first download.
export function stringValidation(message: string | undefined = "Required*") {
  return z.string({ error: message }).trim().min(1, { error: message });
}
