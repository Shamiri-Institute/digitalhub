import { z } from "zod";

// This function just makes it easier to validate they exist and access them.
// https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser
function validate(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
export const constants = (() => {
  try {
    return z
      .object({
        NEXT_PUBLIC_APP_URL: z.string().min(1, "NEXT_PUBLIC_APP_URL is required"),
        NEXT_PUBLIC_ENV: z.enum(["development", "preview", "production", "testing", "training"], {
          error:
            "NEXT_PUBLIC_ENV is required and must be one of: development, preview, production, testing, training",
        }),
      })
      .parse({
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
      });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue: z.ZodIssue) => issue.path.join(".")).join(", ");
      throw new Error(
        `Missing or invalid required environment variables: ${missingVars}. Please check your .env.development file.`,
      );
    }
    throw error;
  }
})();

export const NEXT_PUBLIC_ENV = validate(constants.NEXT_PUBLIC_ENV, "NEXT_PUBLIC_ENV");
export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
export const ENABLE_PERF_PROFILER = process.env.NEXT_PUBLIC_ENABLE_PERF_PROFILER === "true";
