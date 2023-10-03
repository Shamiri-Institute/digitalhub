import { SES, SendEmailCommandInput } from "@aws-sdk/client-ses";

import { env } from "#/env";

const ses = new SES({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendEmail(input: SendEmailCommandInput) {
  const response = await ses.sendEmail(input);
  return response;
}
