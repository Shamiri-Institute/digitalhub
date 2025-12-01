import { z } from "zod";
import { stringValidation } from "#/lib/utils";

export const ReportFellowComplaintSchema = z.object({
  fellow: stringValidation("Please select a fellow").optional(),
  mpesaNumber: stringValidation("Please confirm the Mpesa number"),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  noOfTrainingSessions: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the no of training sessions" : undefined
}),

  noOfSupervisionSessions: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the no of supervision sessions" : undefined
}),
  noOfPreSessions: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the no of pre sessions" : undefined
}),
  noOfMainSessions: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the no of main sessions" : undefined
}),
  noOfSpecialSessions: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the no of special sessions" : undefined
}),
  paidAmount: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the paid amount" : undefined
}),
  confirmedAmountReceived: z.coerce.number({
      error: (issue) => issue.input === undefined ? "Please enter the confirmed amount received" : undefined
}),
  reasonForComplaint: stringValidation("Please enter the complaint reason"),
  comments: stringValidation("Please enter additional comments"),
  reasonForAccepting: stringValidation("Please enter the reason for accepting"),
  reasonForRejecting: stringValidation("Please enter the reason for rejecting"),
});

export type ReportFellowComplaintSchema = z.infer<typeof ReportFellowComplaintSchema>;
