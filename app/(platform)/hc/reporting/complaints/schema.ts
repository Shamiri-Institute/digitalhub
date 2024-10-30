import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const ComplaintSchema = z.object({
  fellow: stringValidation("Please select a fellow").optional(),
  mpesaNumber: stringValidation("Please confirm the Mpesa number"),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  noOfTrainingSessions: z.coerce.number({
    required_error: "Please enter the no of training sessions",
  }),

  noOfSupervisionSessions: z.coerce.number({
    required_error: "Please enter the no of supervision sessions",
  }),
  noOfPreSessions: z.coerce.number({
    required_error: "Please enter the no of pre sessions",
  }),
  noOfMainSessions: z.coerce.number({
    required_error: "Please enter the no of main sessions",
  }),
  noOfSpecialSessions: z.coerce.number({
    required_error: "Please enter the no of special sessions",
  }),
  paidAmount: z.coerce.number({
    required_error: "Please enter the paid amount",
  }),
  confirmedAmountReceived: z.coerce.number({
    required_error: "Please enter the confirmed amount received",
  }),
  reasonForComplaint: stringValidation("Please enter the complaint reason"),
  comments: stringValidation("Please enter additional comments"),
  reasonForAccepting: z.string().optional(),
  reasonForRejecting: z.string().optional(),
});

export type ComplaintSchema = z.infer<typeof ComplaintSchema>;
