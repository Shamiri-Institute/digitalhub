import { z } from "zod";

import { enumValues, sessionTypes } from "#/db/enums";
import { hubSessionCategories } from "#/lib/app-constants/hub-session-types";
import { stringValidation } from "#/lib/utils";

const hubFields = {
  hubName: stringValidation("Please enter the hub's name").max(255, {
    error: "The hub's name is too long",
  }),
};

const sessionTypeValues = {
  label: stringValidation("Please enter a label").max(255, { error: "The label is too long" }),
  amount: z
    .number({ error: "Please enter an amount" })
    .int({ error: "The amount must be a whole number" })
    .min(0, { error: "The amount cannot be negative" })
    // session_names.amount is a 32-bit integer column.
    .max(2_147_483_647, { error: "The amount is too large" }),
};

const MAX_SESSION_TYPES = 200;

export const HubNameSchema = z.object(hubFields);

/**
 * The session types of a new hub, in order. The server gives each its code from its group and its
 * place in the group, so the form never sends one.
 */
export const CreateHubSchema = HubNameSchema.extend({
  sessionTypes: z
    .array(z.object({ type: z.enum(hubSessionCategories), ...sessionTypeValues }))
    .max(MAX_SESSION_TYPES),
});

/**
 * What the edit form holds: the hub's stored session types, which keep their id and code, then any
 * new ones. A stored session type left out of the list is removed.
 */
export const EditHubFormSchema = HubNameSchema.extend({
  sessionTypes: z
    .array(
      z.object({
        sessionNameId: z.string().optional(),
        type: z.enum(enumValues(sessionTypes)),
        ...sessionTypeValues,
      }),
    )
    .max(MAX_SESSION_TYPES),
});

export const UpdateHubSchema = EditHubFormSchema.extend({
  hubId: stringValidation("Missing hub ID"),
  /**
   * The ids of the session names the form was opened with, so a save made from a stale form
   * cannot remove a session type that was added after it opened.
   */
  loadedSessionNameIds: z.array(z.string()).max(MAX_SESSION_TYPES),
});
