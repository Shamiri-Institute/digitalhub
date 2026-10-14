import type {
  CLINICAL_SESSION_TYPES,
  DATA_FOLLOWUP_SESSION_TYPES,
  INTERVENTION_SESSION_TYPES,
  SUPERVISION_SESSION_TYPES,
  TRAINING_SESSION_TYPES,
} from "#/lib/app-constants/constants";

export type HubSessionType = {
  name:
    | INTERVENTION_SESSION_TYPES
    | SUPERVISION_SESSION_TYPES
    | TRAINING_SESSION_TYPES
    | CLINICAL_SESSION_TYPES
    | DATA_FOLLOWUP_SESSION_TYPES;
  label: string;
  type: "INTERVENTION" | "SUPERVISION" | "TRAINING" | "SPECIAL" | "CLINICAL" | "DATA_COLLECTION";
  amount: number;
};

/**
 * The session types a new hub starts with: a typical Shamiri intervention of a pre-session and
 * four sessions, five supervisions and five trainings. A super admin adds clinical and data
 * follow-up sessions, or any other, in the hub dialog.
 */
export const hubSessionTypes: HubSessionType[] = [
  { name: "s0", label: "Pre-session", type: "INTERVENTION", amount: 1000 },
  { name: "s1", label: "Session 1", type: "INTERVENTION", amount: 1500 },
  { name: "s2", label: "Session 2", type: "INTERVENTION", amount: 1500 },
  { name: "s3", label: "Session 3", type: "INTERVENTION", amount: 1500 },
  { name: "s4", label: "Session 4", type: "INTERVENTION", amount: 1500 },
  { name: "sv1", label: "Supervision 1", type: "SUPERVISION", amount: 500 },
  { name: "sv2", label: "Supervision 2", type: "SUPERVISION", amount: 500 },
  { name: "sv3", label: "Supervision 3", type: "SUPERVISION", amount: 500 },
  { name: "sv4", label: "Supervision 4", type: "SUPERVISION", amount: 500 },
  { name: "sv5", label: "Supervision 5", type: "SUPERVISION", amount: 500 },
  { name: "t1", label: "Training 1", type: "TRAINING", amount: 1000 },
  { name: "t2", label: "Training 2", type: "TRAINING", amount: 1000 },
  { name: "t3", label: "Training 3", type: "TRAINING", amount: 1000 },
  { name: "t4", label: "Training 4", type: "TRAINING", amount: 1000 },
  { name: "t5", label: "Training 5", type: "TRAINING", amount: 1000 },
];

export type SessionTypeGroup = HubSessionType["type"];

export type HubSessionCategory = Exclude<SessionTypeGroup, "SPECIAL">;

/**
 * How each group numbers its codes: intervention runs s0, s1, s2 and the rest start at 1, so
 * supervision runs sv1, sv2. A code never changes once stored, because sessions refer to it.
 */
const CODE_FORMATS: Record<
  HubSessionCategory,
  { prefix: string; first: number; label: string; amount: number }
> = {
  INTERVENTION: { prefix: "s", first: 0, label: "Session", amount: 1500 },
  SUPERVISION: { prefix: "sv", first: 1, label: "Supervision", amount: 500 },
  TRAINING: { prefix: "t", first: 1, label: "Training", amount: 1000 },
  CLINICAL: { prefix: "cl", first: 1, label: "Clinical", amount: 0 },
  DATA_COLLECTION: { prefix: "dfu", first: 1, label: "Data Follow Up", amount: 500 },
};

export const hubSessionCategories = Object.keys(CODE_FORMATS) as HubSessionCategory[];

export function isHubSessionCategory(type: SessionTypeGroup): type is HubSessionCategory {
  return type !== "SPECIAL";
}

function codeIndex(category: HubSessionCategory, code: string) {
  const match = new RegExp(`^${CODE_FORMATS[category].prefix}(\\d+)$`).exec(code);
  return match ? Number(match[1]) : undefined;
}

/**
 * The code of every row a hub will have, in order. A stored row keeps its code. A new row takes
 * the next index after the highest code of its group, so removing the last rows of a group and
 * adding new ones reuses their codes.
 */
export function assignSessionCodes(
  rows: { sessionNameId?: string; type: SessionTypeGroup }[],
  storedById: ReadonlyMap<string, { sessionName: string }>,
): string[] {
  const nextIndex = new Map<HubSessionCategory, number>();
  for (const row of rows) {
    const code = row.sessionNameId ? storedById.get(row.sessionNameId)?.sessionName : undefined;
    if (code === undefined || !isHubSessionCategory(row.type)) continue;
    const index = codeIndex(row.type, code);
    if (index !== undefined && index >= (nextIndex.get(row.type) ?? 0)) {
      nextIndex.set(row.type, index + 1);
    }
  }

  return rows.map((row) => {
    const stored = row.sessionNameId ? storedById.get(row.sessionNameId)?.sessionName : undefined;
    if (stored !== undefined) return stored;
    // Only a stored row can be SPECIAL; the form never adds one.
    if (!isHubSessionCategory(row.type)) return "";
    const format = CODE_FORMATS[row.type];
    const index = Math.max(nextIndex.get(row.type) ?? format.first, format.first);
    nextIndex.set(row.type, index + 1);
    return `${format.prefix}${index}`;
  });
}

export function newSessionTypeDefaults(category: HubSessionCategory, code: string) {
  const standard = hubSessionTypes.find((t) => t.name === code);
  if (standard) return { label: standard.label, amount: standard.amount };
  const format = CODE_FORMATS[category];
  return {
    label: `${format.label} ${codeIndex(category, code) ?? ""}`.trim(),
    amount: format.amount,
  };
}
