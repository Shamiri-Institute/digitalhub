import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const ComplaintSchema = z.object({
  fellow: z.string({
    required_error: "Please select a fellow",
  }),
  mpesaNumber: stringValidation("Please confirm the Mpesa number"),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  noOfTrainingSessions: z
    .number()
    .min(1, { message: "Please enter the no of training sessions" }),
  noOfSupervisionSessions: z
    .number()
    .min(1, { message: "Please enter the no of supervision sessions" }),
  noOfPreSessions: z
    .number()
    .min(1, { message: "Please enter the no of pre sessions" }),
  noOfMainSessions: z
    .number()
    .min(1, { message: "Please enter the no of main sessions" }),
  noOfSpecialSessions: z
    .number()
    .min(1, { message: "Please enter the no of special sessions" }),
  paidAmount: z.number().min(1, { message: "Please enter the paid amount" }),
  confirmedTotalReceived: z
    .number()
    .min(1, { message: "Please enter the confirmed total received" }),
  complaintReason: stringValidation("Please enter the complaint reason"),
  comments: stringValidation("Please enter additional comments"),
  reasonForAccepting: z.string().optional(),
  reasonForRejecting: z.string().optional(),
});

export type ComplaintSchema = z.infer<typeof ComplaintSchema>;
