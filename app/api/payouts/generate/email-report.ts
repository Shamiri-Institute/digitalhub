import { SendRawEmailCommandInput } from "@aws-sdk/client-ses";

import {
  PayoutReport,
  RepaymentReport,
} from "#/app/api/payouts/generate/types";
import { constants } from "#/lib/constants";
import { sendEmailWithAttachment } from "#/lib/ses";

interface EmailProperties {
  sourceEmail: string;
  destinationEmails: string[];
  ccEmails: string[];
  subject: string;
  bodyText: string;
  attachmentName: string;
  attachmentContent: string;
  payoutReport: PayoutReport;
  forceSend?: boolean;
}

export async function emailPayoutReport(props: EmailProperties) {
  const emailBody = constructPayoutEmailBody(props);

  const emailInput: SendRawEmailCommandInput = {
    Source: props.sourceEmail,
    Destinations: [...props.destinationEmails, ...props.ccEmails],
    RawMessage: {
      Data: Buffer.from(emailBody),
    },
  };

  if (constants.NEXT_PUBLIC_ENV === "production" || props.forceSend) {
    await sendEmailWithAttachment(emailInput);
  } else {
    console.debug("EMAIL NOT SENT OUTSIDE OF PRODUCTION:", emailInput);
    console.debug("To force send email, set send=1 query param.");
  }
}

export async function emailRepaymentReport(
  props: Omit<EmailProperties, "payoutReport"> & {
    repaymentReport: RepaymentReport;
  },
) {
  const emailBody = constructRepaymentEmailBody(props);

  const emailInput: SendRawEmailCommandInput = {
    Source: props.sourceEmail,
    Destinations: [...props.destinationEmails, ...props.ccEmails],
    RawMessage: {
      Data: Buffer.from(emailBody),
    },
  };

  if (constants.NEXT_PUBLIC_ENV === "production" || props.forceSend) {
    await sendEmailWithAttachment(emailInput);
  } else {
    console.debug("EMAIL NOT SENT OUTSIDE OF PRODUCTION:", emailInput);
    console.debug("To force send email, set send=1 query param.");
  }
}

export function constructPayoutEmailBody(props: EmailProperties): string {
  const {
    sourceEmail,

    destinationEmails,
    ccEmails,
    subject,
    bodyText,
    attachmentName,
    attachmentContent,
    payoutReport,
  } = props;
  const incompleteRecordsMessage =
    payoutReport.incompleteRecords.countMissingMpesaName === 0 &&
    payoutReport.incompleteRecords.countMissingMpesaNumber === 0
      ? "All records have MPESA name and number."
      : `There were ${payoutReport.incompleteRecords.countMissingMpesaName} payouts without Mpesa names and ${payoutReport.incompleteRecords.countMissingMpesaNumber} payouts without Mpesa numbers.`;

  const totalPayoutMessage =
    payoutReport.totalPayoutAmount ===
    payoutReport.totalPayoutAmountWithMpesaInfo
      ? `The total payout amount is KES ${payoutReport.totalPayoutAmount}.`
      : `The total payout amount is KES ${payoutReport.totalPayoutAmount} and the total payout amount with Mpesa info present is KES ${payoutReport.totalPayoutAmountWithMpesaInfo}.`;

  return `From: ${sourceEmail}
To: ${destinationEmails.join(", ")}
Cc: ${ccEmails.join(", ")}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="NextPart"

--NextPart
Content-Type: text/plain

${bodyText}

${incompleteRecordsMessage}

${totalPayoutMessage}

--NextPart
Content-Type: text/csv; name="${attachmentName}"
Content-Disposition: attachment; filename="${attachmentName}"

${attachmentContent}
--NextPart--`;
}

export function constructRepaymentEmailBody(
  props: Omit<EmailProperties, "payoutReport"> & {
    repaymentReport: RepaymentReport;
  },
): string {
  const {
    sourceEmail,
    destinationEmails,
    ccEmails,
    subject,
    bodyText,
    attachmentName,
    attachmentContent,
    repaymentReport,
  } = props;
  const totalRepaymentMessage = `The total repayment amount is KES ${repaymentReport.totalRepaymentAmount}.`;

  return `From: ${sourceEmail}
To: ${destinationEmails.join(", ")}
Cc: ${ccEmails.join(", ")}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="NextPart"

--NextPart
Content-Type: text/plain

${bodyText}

${totalRepaymentMessage}

--NextPart
Content-Type: text/csv; name="${attachmentName}"
Content-Disposition: attachment; filename="${attachmentName}"

${attachmentContent}
--NextPart--`;
}
