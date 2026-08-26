import { z } from "zod";
import { stringValidation } from "#/lib/utils";

const ComplaintBaseSchema = z.object({
  fellow: stringValidation("Please select a fellow").optional(),
  mpesaNumber: stringValidation("Please confirm the Mpesa number"),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  noOfTrainingSessions: z.coerce.number({ error: "Please enter the no of training sessions" }),
  noOfSupervisionSessions: z.coerce.number({
    error: "Please enter the no of supervision sessions",
  }),
  noOfPreSessions: z.coerce.number({ error: "Please enter the no of pre sessions" }),
  noOfMainSessions: z.coerce.number({ error: "Please enter the no of main sessions" }),
  noOfSpecialSessions: z.coerce.number({ error: "Please enter the no of special sessions" }),
  paidAmount: z.coerce.number({ error: "Please enter the paid amount" }),
  confirmedAmountReceived: z.coerce.number({ error: "Please enter the confirmed amount received" }),
  reasonForComplaint: stringValidation("Please enter the complaint reason"),
  comments: stringValidation("Please enter additional comments"),
});

export const ComplaintFormSchema = ComplaintBaseSchema.extend({
  reasonForAccepting: z.string(),
  reasonForRejecting: z.string(),
});

export const ApproveComplaintSchema = ComplaintFormSchema.extend({
  reasonForAccepting: stringValidation("Please enter the reason for accepting"),
});

export const RejectComplaintSchema = ComplaintFormSchema.extend({
  reasonForRejecting: stringValidation("Please enter the reason for rejecting"),
});

export type ComplaintFormSchema = z.infer<typeof ComplaintFormSchema>;
export type ApproveComplaintSchema = z.infer<typeof ApproveComplaintSchema>;
export type RejectComplaintSchema = z.infer<typeof RejectComplaintSchema>;
