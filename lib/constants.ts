import { z } from "zod";

export const SDH_LOGO_BANNER =
  "https://shamiri-assets.s3.af-south-1.amazonaws.com/shamiri-logo-blue.png";

export const SDH_HERO_IMAGE =
  "https://shamiri-assets.s3.af-south-1.amazonaws.com/shamiri-hero.jpeg";

export const APP_HOSTNAMES = new Set([
  "hub.shamiri.institute",
  "shamiridigitalhub.vercel.app",
  `localhost:${process.env.PORT}`,
  "localhost",
]);

// All environment various prefixed with NEXT_PUBLIC_ are inlined by Next.js.
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
          errorMap: () => ({
            message: "NEXT_PUBLIC_ENV is required and must be one of: development, preview, production, testing, training",
          }),
        }),
      })
      .parse({
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
      });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join(".")).join(", ");
      throw new Error(
        `Missing or invalid required environment variables: ${missingVars}. Please check your .env.development file.`,
      );
    }
    throw error;
  }
})();

export const NEXT_PUBLIC_ENV = validate(constants.NEXT_PUBLIC_ENV, "NEXT_PUBLIC_ENV") ;
export const CURRENT_PROJECT_ID = validate(process.env.NEXT_PUBLIC_CURRENT_PROJECT_ID, "NEXT_PUBLIC_CURRENT_PROJECT_ID");
export const APP_ENV = validate(process.env.APP_ENV, "APP_ENV") || "production";
export const SHOW_DUPLICATE_ID_CHECKBOX = "show-duplicate-id-checkbox";
export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
