import { z } from "zod";

const schema = z.object({
  // General uploads bucket; S3_UPLOAD_KEY/SECRET are the credentials for ALL buckets
  S3_UPLOAD_KEY: z.string(),
  S3_UPLOAD_SECRET: z.string(),
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
