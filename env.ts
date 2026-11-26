import { pipelineUploadsUrl } from "./lib/survey/pipeline-url";
import { z } from "zod";

export const SURVEY_PIPELINE_SECRET_MIN_LENGTH = 32;

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
  S3_RECORDINGS_REGION: z.string(),

  // TODO: make this required once S3_STUDENT_ATTENDANCE_BUCKET is set in all environments
  S3_STUDENT_ATTENDANCE_BUCKET: z.string().default(""),
  S3_STUDENT_ATTENDANCE_REGION: z.string(),

  // Print run PDFs, written by the server and downloaded through presigned links.
  S3_SURVEY_PRINT_FILES_BUCKET: z.string().default(""),
  S3_SURVEY_PRINT_FILES_REGION: z.string(),

  // Scanned questionnaires, uploaded by the browser through presigned PUTs. Needs CORS.
  S3_SURVEY_SCANS_BUCKET: z.string().default(""),
  S3_SURVEY_SCANS_REGION: z.string(),

  // Files on ticket comments, uploaded by the browser through presigned PUTs. Needs CORS.
  S3_TICKET_ATTACHMENTS_BUCKET: z.string().default(""),
  S3_TICKET_ATTACHMENTS_REGION: z.string().default(""),

  // Vercel Cron sends it as a bearer token. Unset, the cron routes refuse every request.
  CRON_SECRET: z.string().min(16).optional(),

  // Signs requests between the SDH and the scan extraction pipeline, both ways
  // (lib/survey/pipeline-signing.ts). Unset, the pipeline routes refuse every request; set
  // shorter than 32 characters, the app doesn't start.
  SURVEY_PIPELINE_SECRET: z.preprocess(
    (secret) => (secret === "" ? undefined : secret),
    z.string().min(SURVEY_PIPELINE_SECRET_MIN_LENGTH).optional(),
  ),
  SURVEY_PIPELINE_URL: z.preprocess(
    (url) => (url === "" ? undefined : url),
    z
      .string()
      .refine((url) => pipelineUploadsUrl(url) !== undefined, {
        error: "an http(s) URL with no query string or fragment: the signature doesn't cover them",
      })
      .optional(),
  ),
});

export const env = process.env.CI
  ? (process.env as unknown as z.infer<typeof schema>)
  : schema.parse(process.env);
