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

  S3_RECORDINGS_BUCKET: z.string(),
  S3_RECORDINGS_REGION: z.string().default("af-south-1"),

  // TODO: make this required once S3_STUDENT_ATTENDANCE_BUCKET is set in all environments
  S3_STUDENT_ATTENDANCE_BUCKET: z.string().default(""),
  S3_STUDENT_ATTENDANCE_REGION: z.string().default("af-south-1"),

  // Print run PDFs, written by the server and downloaded through presigned links.
  S3_SURVEY_PRINT_FILES_BUCKET: z.string().default(""),
  S3_SURVEY_PRINT_FILES_REGION: z.string().default("af-south-1"),

  // An S3-compatible server to use instead of AWS, such as SeaweedFS for local runs and CI.
  S3_ENDPOINT: z.url().optional(),

  // Vercel sends it with each cron request.
  CRON_SECRET: z.string().optional(),

  FIDELITY_API_URL: z.url().optional(),
  RECORDINGS_API_KEY: z.string().optional(),

  METABASE_SECRET_KEY: z.string().optional(),
  METABASE_MONITORING_DASHBOARD_ID: z.coerce.number().int().positive().optional(),
});

export const env = process.env.CI
  ? (process.env as unknown as z.infer<typeof schema>)
  : schema.parse(process.env);
