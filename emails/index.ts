import React from "react";
import { render } from "@react-email/render";

import * as ses from "#/lib/ses";

const SDH_FROM = "tech@shamiri.institute";

export const sendEmail = async ({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) => {
  const html = render(react);

  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    await ses.sendEmail({
      Source: SDH_FROM,
      Destination: {
        ToAddresses: [to],
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
  } else {
    console.log("Not sending email in dev mode");
    console.log("Subject:", subject);
    console.log("To:", to);
    console.log("HTML:", html);
  }
};
