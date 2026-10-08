import { z } from "zod";

const schema = z.object({
  // Signs the session cookie; sessions live in the database.
  BETTER_AUTH_SECRET: z.string().min(32),
  // The site origin. Unset on Vercel previews, which use the deployment URL.
  BETTER_AUTH_URL: z.url().optional(),
  // Enables the email test login in development, testing and training. Unset in production.
  TEST_USER_PASSWORD: z.string().min(12).optional(),

  S3_UPLOAD_KEY: z.string(),
  S3_UPLOAD_SECRET: z.string(),

  // Recordings bucket (dedicated for session recordings)
  S3_RECORDINGS_BUCKET: z.string(),
  S3_RECORDINGS_REGION: z.string().default("af-south-1"),

  // TODO: make this required once S3_STUDENT_ATTENDANCE_BUCKET is set in all environments
  S3_STUDENT_ATTENDANCE_BUCKET: z.string().default(""),
  S3_STUDENT_ATTENDANCE_REGION: z.string().default("af-south-1"),
});

export const env = process.env.CI
  ? (process.env as unknown as z.infer<typeof schema>)
  : schema.parse(process.env);
