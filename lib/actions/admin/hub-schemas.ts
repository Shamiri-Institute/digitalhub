import { z } from "zod";

import { stringValidation } from "#/lib/utils";

const hubFields = {
  hubName: stringValidation("Please enter the hub's name").max(255, {
    error: "The hub's name is too long",
  }),
};

/**
 * One session type of a new hub. The name and type of a session type are fixed by the standard
 * list (`hubSessionTypes`), so the form only sends the name to say which one it is.
 */
const SessionTypeSchema = z.object({
  name: stringValidation("Missing session type"),
  label: stringValidation("Please enter a label").max(255, { error: "The label is too long" }),
  amount: z
    .number({ error: "Please enter an amount" })
    .int({ error: "The amount must be a whole number" })
    .min(0, { error: "The amount cannot be negative" })
    // session_names.amount is a 32-bit integer column.
    .max(2_147_483_647, { error: "The amount is too large" }),
});

export const HubNameSchema = z.object(hubFields);

/** An existing session name of a hub. Only its label and amount can change, never its code. */
const UpdateSessionTypeSchema = SessionTypeSchema.extend({
  sessionNameId: stringValidation("Missing session type"),
});

export const CreateHubSchema = HubNameSchema.extend({
  sessionTypes: z.array(SessionTypeSchema),
});

/** What the edit form holds: the hub's own session names, which may differ from the standard. */
export const EditHubFormSchema = HubNameSchema.extend({
  sessionTypes: z.array(UpdateSessionTypeSchema),
});

export const UpdateHubSchema = EditHubFormSchema.extend({
  hubId: stringValidation("Missing hub ID"),
});
