import React from "react";
import { SES } from "@aws-sdk/client-ses";
import { render } from "@react-email/render";

const ses = new SES({
  region: process.env.AWS_SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
  },
});

// TODO: Verification email for tech@shamiri.institute not working for some reason
const SDH_FROM = "edmund@shamiri.institute";

export const sendEmail = async ({
  email,
  subject,
  react,
}: {
  email: string;
  subject: string;
  react: React.ReactElement;
}) => {
  const html = render(react);

  await ses.sendEmail({
    Source: SDH_FROM,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
  });
};
