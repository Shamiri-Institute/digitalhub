import { z } from "zod";

const schema = z.object({
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  S3_UPLOAD_KEY: z.string(),
  S3_UPLOAD_SECRET: z.string(),
  S3_UPLOAD_BUCKET: z.string(),
  S3_UPLOAD_REGION: z.string(),
});

export const env = schema.parse(process.env);
