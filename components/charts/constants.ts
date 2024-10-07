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
  "#585757",
  "#8B2CE9",
  "#0085FF",
];

export const generateRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
