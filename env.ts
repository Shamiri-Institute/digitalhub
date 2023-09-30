import { z } from "zod";

const schema = z.object({
  AWS_REGION: z.string(),
  AWS_BUCKET_NAME: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
});

export const env = schema.parse(process.env);
