import { GENDER_OPTIONS } from "#/lib/constants";
import { z } from "zod";

export const BaseProfileSchema = z.object({
  idNumber: z.string().min(1),
  cellNumber: z.string().min(1),
  mpesaNumber: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER_OPTIONS),
  county: z.string().min(1),
  subCounty: z.string().min(1),
  bankName: z.string().min(1),
  bankBranch: z.string().min(1),
});

export const SupervisorProfileSchema = BaseProfileSchema.extend({
  supervisorEmail: z.string().email(),
  supervisorName: z.string().min(1),
});

export type SupervisorType = z.infer<typeof SupervisorProfileSchema>;

export const HubCoordinatorProfileSchema = BaseProfileSchema.extend({
  coordinatorEmail: z.string().email(),
  coordinatorName: z.string().min(1),
});

export type HubCoordinatorType = z.infer<typeof HubCoordinatorProfileSchema>;
