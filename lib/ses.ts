import {
  SES,
  SendEmailCommandInput,
  SendRawEmailCommandInput,
} from "@aws-sdk/client-ses";

import { env } from "#/env";

const SES_EMAILS_PER_SECOND_RATE_LIMIT = 5;
const ONE_SECOND_IN_MS = 1000;
const SLEEP_TIME_MS = ONE_SECOND_IN_MS / SES_EMAILS_PER_SECOND_RATE_LIMIT;

const ses = new SES({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendEmail(input: SendEmailCommandInput) {
  const response = await ses.sendEmail(input);
  await throttle();
  return response;
}

export async function sendEmailWithAttachment(input: SendRawEmailCommandInput) {
  const response = await ses.sendRawEmail(input);
  await throttle();
  return response;
}

async function throttle() {
  const ms = SLEEP_TIME_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
