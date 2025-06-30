import { z } from "zod";

const schema = z.object({
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  S3_UPLOAD_KEY: z.string(),
  S3_UPLOAD_SECRET: z.string(),
  S3_UPLOAD_BUCKET: z.string(),
  S3_UPLOAD_REGION: z.string(),

  SESSION_ANALYSIS_API_KEY: z.string().min(32),
  SESSION_ANALYSIS_RATE_LIMIT: z
    .string()
    .regex(/^\d+$/, "Rate limit must be a number")
    .transform(Number)
    .default("100"),
  SESSION_ANALYSIS_ALLOWED_IPS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((ip) => ip.trim()) : [])),
  SESSION_ANALYSIS_SIGNATURE_SECRET: z.string().min(32).optional(),
});

export const env = schema.parse(process.env);
