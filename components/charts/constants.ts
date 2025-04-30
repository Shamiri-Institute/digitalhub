export const possibleSessions = [
  "Pre",
  "S1",
  "S2",
  "S3",
  "S4",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
];

export const possibleInterventionSessions = ["s0", "s1", "s2", "s3", "s4"];

export const clinicaldataValue = [
  { name: "Active", value: 0 },
  { name: "FollowUp", value: 0 },
  { name: "Terminated", value: 0 },
];

export const clinicalCasesColors = ["#7EA16B", "#FABC2A", "#B0D5EA"];

export const studentsGroupByColors = [
  "#FACC15",
  "#8B2CE9",
  "#0085FF",
  "#585757",
  "#E92C9D",
];

export const generateRandomColor = () => {
  const baseColor =
    studentsGroupByColors[
      Math.floor(Math.random() * studentsGroupByColors.length)
    ];

  if (!baseColor) {
    return "#000000";
  }

  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  const shade = 0.5 + Math.random();

  const newR = Math.min(255, Math.round(r * shade));
  const newG = Math.min(255, Math.round(g * shade));
  const newB = Math.min(255, Math.round(b * shade));

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
};
