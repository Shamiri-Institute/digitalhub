import {
  SES,
  type SendEmailCommandInput,
  type SendRawEmailCommandInput,
} from "@aws-sdk/client-ses";

import { env } from "#/env";

const SES_EMAILS_PER_SECOND_RATE_LIMIT = 5;
const ONE_SECOND_IN_MS = 1000;
const SLEEP_TIME_MS = ONE_SECOND_IN_MS / SES_EMAILS_PER_SECOND_RATE_LIMIT;
const MAX_RETRIES = 10;

const ses = new SES({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendEmail(input: SendEmailCommandInput) {
  return await sendWithRetry(() => ses.sendEmail(input));
}

export async function sendEmailWithAttachment(input: SendRawEmailCommandInput) {
  return await sendWithRetry(() => ses.sendRawEmail(input));
}

async function sendWithRetry(
  sendFunction: () => Promise<any>,
  retries = MAX_RETRIES,
) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      if (attempt > 5) {
        console.warn(
          `Email attempt #${attempt} of ${retries} failed. Retrying...`,
        );
      }
      const response = await sendFunction();
      await throttle();
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      const delay = SLEEP_TIME_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function throttle() {
  const ms = SLEEP_TIME_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
