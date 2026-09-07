import { z } from "zod";

const schema = z.object({
  // Signs the CSRF and callback cookies only; sessions live in the database.
  NEXTAUTH_SECRET: z.string().min(32),
  // Enables the email test login in development, testing and training. Unset in production.
  TEST_USER_PASSWORD: z.string().min(12).optional(),

  S3_UPLOAD_KEY: z.string(),
  S3_UPLOAD_SECRET: z.string(),

  // general purpose uploads bucket
  S3_UPLOAD_BUCKET: z.string(),
  S3_UPLOAD_REGION: z.string(),

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
