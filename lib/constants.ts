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

export const NEXT_PUBLIC_ENV = validate(process.env.NEXT_PUBLIC_ENV);

export const CURRENT_PROJECT_ID = "2024_Project_1";

export const constants = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string(),
    NEXT_PUBLIC_ENV: z.enum(["development", "preview", "production"]),
  })
  .parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  });

// All environment various prefixed with NEXT_PUBLIC_ are inlined by Next.js.
// This function just makes it easier to validate they exist and access them.
// https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser
function validate(value: string | undefined): string {
  if (!value) {
    throw new Error("Missing inlined NEXT_PUBLIC_ constant");
  }
  return value;
}
