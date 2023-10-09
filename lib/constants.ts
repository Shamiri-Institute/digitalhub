import { z } from "zod";

export const SDH_LOGO_BANNER =
  "https://shamiri-assets.s3.af-south-1.amazonaws.com/shamiri-logo-blue.png";

export const SDH_HERO_IMAGE =
  "https://shamiri-assets.s3.af-south-1.amazonaws.com/shamiri-hero.jpeg";

export const APP_HOSTNAMES = new Set([
  "shamiridigitalhub.vercel.app",
  `localhost:${process.env.PORT}`,
  "localhost",
]);

export const constants = z
  .object({
    APP_URL: z.string(),
  })
  .parse({
    APP_URL: process.env.APP_URL,
  });
