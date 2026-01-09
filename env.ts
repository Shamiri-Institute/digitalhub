import { z } from "zod";

const schema = z.object({
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  // General uploads bucket
  S3_UPLOAD_KEY: z.string(),
  S3_UPLOAD_SECRET: z.string(),
  S3_UPLOAD_BUCKET: z.string(),
  S3_UPLOAD_REGION: z.string(),

  // Recordings bucket (dedicated for session recordings)
  S3_RECORDINGS_BUCKET: z.string(),
  S3_RECORDINGS_REGION: z.string().default("af-south-1"),
});

export const env = schema.parse(process.env);
