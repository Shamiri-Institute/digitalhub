import { stringValidation } from "#/lib/utils";
import * as z from "zod";

export type HubWithProjects = {
  id: string;
  hubName: string;
  implementerId: string;
  projects: {
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    sessions: {
      id: string;
      sessionName: string;
      sessionLabel: string;
      sessionType: string;
      amount: number | null;
    }[];
    projectPaymentRates: {
      trainingSession: number;
      preSession: number;
      mainSession: number;
      supervisionSession: number;
    } | null;
  }[];
};

export const PayoutFrequencyOptions = {
  ONCE_A_WEEK: "once_a_week",
  TWICE_A_WEEK: "twice_a_week",
  BIWEEKLY: "biweekly",
} as const;

export const PayoutFrequencySchema = z.object({
  projectId: stringValidation("Project is required"),
  payoutFrequency: z.enum([
    PayoutFrequencyOptions.ONCE_A_WEEK,
    PayoutFrequencyOptions.TWICE_A_WEEK,
    PayoutFrequencyOptions.BIWEEKLY,
  ]),
  payoutDays: z.array(z.string()).min(1, "At least one day must be selected"),
  payoutTime: z.string().min(1, "Payout time is required"),
});

export type PayoutFrequencyType = z.infer<typeof PayoutFrequencySchema>;

export const DaysOfWeek = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: "sunday",
} as const;

const DefaultSessionRatesSchema = z.object({
  trainingSession: z.number().min(1, "Training session rate is required"),
  preSession: z.number().min(1, "Pre-session rate is required"),
  mainSession: z.number().min(1, "Main session rate is required"),
  supervisionSession: z.number().min(1, "Supervision session rate is required"),
});

export const PayoutSettingsSchema = z.object({
  hubId: z.string().min(1, "Hub is required"),
  projectSettings: z
    .array(
      z.object({
        projectId: z.string(),
        sessionSettings: z.array(
          z.object({
            sessionId: z.string(),
            amount: z.number(),
          }),
        ),
      }),
    )
    .optional(),
  defaultRates: z.record(z.string(), DefaultSessionRatesSchema).optional(),
});

export type PayoutSettingsFormData = z.infer<typeof PayoutSettingsSchema>;

export type CreateSessionNameType = {
  sessionName: string;
  sessionType: "INTERVENTION" | "SUPERVISION" | "TRAINING";
  sessionLabel: string;
  amount: number;
  currency: string;
  projectId: string;
  hubId: string;
}[];
