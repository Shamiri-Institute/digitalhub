import * as z from "zod";

export type HubWithProjects = {
  id: string;
  hubName: string;
  projects: {
    id: string;
    name: string;
    sessions: {
      id: string;
      sessionName: string;
      sessionLabel: string;
      sessionType: string;
      amount: number | null;
    }[];
  }[];
};

export const PayoutFrequencyOptions = {
  ONCE_A_WEEK: "once_a_week",
  TWICE_A_WEEK: "twice_a_week",
  BIWEEKLY: "biweekly",
} as const;

// Create a zod schema for payout frequency
export const PayoutFrequencySchema = z.object({
  payoutFrequency: z.enum(["once_a_week", "twice_a_week", "biweekly"]),
  payoutDays: z.array(z.string()),
  payoutTime: z.string(),
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

export const PayoutSettingsSchema = z.object({
  hubId: z.string({
    required_error: "Please select a hub",
  }),
  projectSettings: z.array(
    z.object({
      projectId: z.string(),
      sessionSettings: z.array(
        z.object({
          sessionId: z.string(),
          amount: z.number().min(0, "Amount must be positive"),
        }),
      ),
    }),
  ),
});

export type PayoutSettingsFormData = z.infer<typeof PayoutSettingsSchema>;
