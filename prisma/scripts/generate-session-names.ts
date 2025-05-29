import {
  CLINICAL_SESSION_TYPES,
  DATA_FOLLOWUP_SESSION_TYPES,
  INTERVENTION_SESSION_TYPES,
  SUPERVISION_SESSION_TYPES,
  TRAINING_SESSION_TYPES,
} from "#/lib/app-constants/constants";
import { db } from "#/lib/db";

type SessionType = {
  name:
    | INTERVENTION_SESSION_TYPES
    | SUPERVISION_SESSION_TYPES
    | TRAINING_SESSION_TYPES
    | CLINICAL_SESSION_TYPES
    | DATA_FOLLOWUP_SESSION_TYPES;
  label: string;
  type:
    | "INTERVENTION"
    | "SUPERVISION"
    | "TRAINING"
    | "SPECIAL"
    | "CLINICAL"
    | "DATA_COLLECTION";
  amount: number;
};

export const hubSessionTypes: SessionType[] = [
  {
    name: "s0",
    label: "Pre-session",
    type: "INTERVENTION",
    amount: 500,
  },
  {
    name: "s1",
    label: "Session 1",
    type: "INTERVENTION",
    amount: 1500,
  },
  {
    name: "s2",
    label: "Session 2",
    type: "INTERVENTION",
    amount: 1500,
  },
  {
    name: "s3",
    label: "Session 3",
    type: "INTERVENTION",
    amount: 1500,
  },
  {
    name: "s4",
    label: "Session 4",
    type: "INTERVENTION",
    amount: 1500,
  },
  {
    name: "sv1",
    label: "Supervision 1",
    type: "SUPERVISION",
    amount: 0,
  },
  {
    name: "sv2",
    label: "Supervision 2",
    type: "SUPERVISION",
    amount: 0,
  },
  {
    name: "sv3",
    label: "Supervision 3",
    type: "SUPERVISION",
    amount: 0,
  },
  {
    name: "sv4",
    label: "Supervision 4",
    type: "SUPERVISION",
    amount: 0,
  },
  {
    name: "sv5",
    label: "Supervision 5",
    type: "SUPERVISION",
    amount: 0,
  },
  {
    name: "t1",
    label: "Training 1",
    type: "TRAINING",
    amount: 1000,
  },
  {
    name: "t2",
    label: "Training 2",
    type: "TRAINING",
    amount: 1000,
  },
  {
    name: "t3",
    label: "Training 3",
    type: "TRAINING",
    amount: 1000,
  },
  {
    name: "t4",
    label: "Training 4",
    type: "TRAINING",
    amount: 1000,
  },
  {
    name: "t5",
    label: "Training 5",
    type: "TRAINING",
    amount: 1000,
  },
  {
    name: "cl1",
    label: "Clinical 1",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl2",
    label: "Clinical 2",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl3",
    label: "Clinical 3",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl4",
    label: "Clinical 4",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl5",
    label: "Clinical 5",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl6",
    label: "Clinical 6",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl7",
    label: "Clinical 7",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "cl8",
    label: "Clinical 8",
    type: "CLINICAL",
    amount: 0,
  },
  {
    name: "dfu1",
    label: "Data Follow Up 1",
    type: "DATA_COLLECTION",
    amount: 0,
  },
  {
    name: "dfu2",
    label: "Data Follow Up 2",
    type: "DATA_COLLECTION",
    amount: 0,
  },
  {
    name: "dfu3",
    label: "Data Follow Up 3",
    type: "DATA_COLLECTION",
    amount: 0,
  },
  {
    name: "dfu4",
    label: "Data Follow Up 4",
    type: "DATA_COLLECTION",
    amount: 0,
  },
  {
    name: "dfu5",
    label: "Data Follow Up 5",
    type: "DATA_COLLECTION",
    amount: 0,
  },
  {
    name: "dfu6",
    label: "Data Follow Up 6",
    type: "DATA_COLLECTION",
    amount: 0,
  },
];

async function main() {
  const hubId = "25P1_Hub_11";

  const sessions = hubSessionTypes.map((sessionType) => {
    return {
      sessionType: sessionType.type,
      sessionName: sessionType.name,
      sessionLabel: sessionType.label,
      hubId: hubId,
      currency: "KES",
      amount: sessionType.amount,
    };
  });

  await db.sessionName.createMany({
    data: sessions,
    skipDuplicates: true,
  });
}

main();
