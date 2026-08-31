import { z } from "zod";
import { stringValidation } from "#/lib/utils";

const ComplaintBaseSchema = z.object({
  // Context only: shown read-only in both dialogs and never persisted by
  // either write, and both M-Pesa columns are nullable on Fellow. Requiring
  // them would block a complaint for a fellow with incomplete details, with
  // the error under an input nobody can type into. Only the add dialog
  // requires `fellow`, to force a choice in its Select.
  fellow: z.string(),
  mpesaNumber: z.string(),
  mpesaName: z.string(),
  noOfTrainingSessions: z.coerce
    .number({ error: "Please enter the no of training sessions" })
    .int("Whole numbers only for training sessions"),
  noOfSupervisionSessions: z.coerce
    .number({ error: "Please enter the no of supervision sessions" })
    .int("Whole numbers only for supervision sessions"),
  noOfPreSessions: z.coerce
    .number({ error: "Please enter the no of pre sessions" })
    .int("Whole numbers only for pre sessions"),
  noOfMainSessions: z.coerce
    .number({ error: "Please enter the no of main sessions" })
    .int("Whole numbers only for main sessions"),
  noOfSpecialSessions: z.coerce
    .number({ error: "Please enter the no of special sessions" })
    .int("Whole numbers only for special sessions"),
  paidAmount: z.coerce
    .number({ error: "Please enter the paid amount" })
    .int("Amounts must be whole shillings"),
  // z.coerce.number() maps "" to 0, so an emptied field would silently submit
  // "nothing received"; map blanks to NaN so the field is reported as missing.
  confirmedAmountReceived: z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "") ? Number.NaN : value,
    z.coerce
      .number({ error: "Please enter the confirmed amount received" })
      .int("Amounts must be whole shillings")
      .min(0, "Amount cannot be negative"),
  ),
  reasonForComplaint: stringValidation("Please enter the complaint reason"),
  comments: stringValidation("Please enter additional comments"),
});

export const ComplaintFormSchema = ComplaintBaseSchema.extend({
  reasonForAccepting: z.string(),
  reasonForRejecting: z.string(),
  statement: z.string(),
});

export const ApproveComplaintSchema = ComplaintFormSchema.extend({
  reasonForAccepting: stringValidation("Please enter the reason for accepting"),
});

export const RejectComplaintSchema = ComplaintFormSchema.extend({
  reasonForRejecting: stringValidation("Please enter the reason for rejecting"),
});

/**
 * Raising a complaint requires a fellow to be chosen in the Select. The
 * statement is optional and, while uploads are switched off, always empty;
 * 255 is the column width for when they return.
 */
export const CreateComplaintSchema = ComplaintFormSchema.extend({
  fellow: stringValidation("Please select a fellow"),
  statement: z.string().max(255, "That file name is too long, please rename it and try again"),
});

export type ComplaintFormSchema = z.infer<typeof ComplaintFormSchema>;
export type CreateComplaintSchema = z.infer<typeof CreateComplaintSchema>;
export type ApproveComplaintSchema = z.infer<typeof ApproveComplaintSchema>;
export type RejectComplaintSchema = z.infer<typeof RejectComplaintSchema>;

/**
 * Statements are stored as S3 keys in a private bucket, so downloading one
 * needs a presigned URL. Complaints reviewed before statements could be
 * uploaded hold the literal "mpesa statement" placeholder the old actions
 * wrote, and ones raised without a statement hold an empty string; neither is
 * downloadable.
 */
export const STATEMENT_KEY_PREFIX = "uploads/";

export function hasDownloadableStatement(statement: string | null | undefined) {
  return Boolean(statement?.startsWith(STATEMENT_KEY_PREFIX));
}
