"use server";

export async function getClinicalCases() {
  return [
    {
      id: 1,
      school: "Olympic Secondary School",
      pseudonym: "Ben Tendo",
      dateAdded: "2024-01-01",
      caseStatus: "Active",
      risk: "High",
      age: "20 yrs",
      referralFrom: "Fellow",
    },
    {
      id: 2,
      school: "Our Lady of Fatima",
      pseudonym: "S46-00024",
      dateAdded: "2024-06-24",
      caseStatus: "FollowUp",
      risk: "Severe",
      age: "17 yrs",
      referralFrom: "Self",
    },
    {
      id: 3,
      school: "St. Mary's Secondary School",
      pseudonym: "S46-00025",
      dateAdded: "2024-06-24",
      caseStatus: "Terminated",
      risk: "Low",
      age: "17 yrs",
      referralFrom: "Teacher",
    },
  ];
}

export type ClinicalCases = Awaited<
  ReturnType<typeof getClinicalCases>
>[number];
