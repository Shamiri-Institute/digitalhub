// The Arsenal hub: a fixed hub, staff and school that e2e tests and demos can name.

export const arsenalHub = { visibleId: "ARSENAL1", hubName: "Arsenal Hub" };

const arsenalStaffDetails = {
  county: "Nairobi",
  subCounty: "Westlands",
  bankName: "Arsenal Bank",
  bankBranch: "Emirates Branch",
  gender: "Male",
};

export const arsenalCoordinators = [
  {
    ...arsenalStaffDetails,
    visibleId: "HC_ARTETA",
    coordinatorName: "Mikel Arteta",
    coordinatorEmail: "mikel.arteta@test.com",
    bankAccountNumber: "12345678",
    bankAccountName: "Mikel Arteta",
    kra: "A123456789B",
    dateOfBirth: new Date(1982, 2, 26),
    cellNumber: "254712345678",
    mpesaNumber: "254712345678",
    idNumber: "12345678",
  },
  {
    ...arsenalStaffDetails,
    visibleId: "HC_GASPAR",
    coordinatorName: "Edu Gaspar",
    coordinatorEmail: "edu.gaspar@test.com",
    bankAccountNumber: "23456789",
    bankAccountName: "Edu Gaspar",
    kra: "B234567890C",
    dateOfBirth: new Date(1978, 6, 15),
    cellNumber: "254723456789",
    mpesaNumber: "254723456789",
    idNumber: "23456789",
  },
];

export const arsenalSupervisors = [
  {
    ...arsenalStaffDetails,
    visibleId: "SUPERVISOR1",
    supervisorName: "Martin Ødegaard",
    supervisorEmail: "martin.odegaard@test.com",
    bankAccountNumber: "12345678",
    bankAccountName: "Martin Ødegaard",
    kra: "A123456789B",
    dateOfBirth: new Date(1998, 11, 17),
    cellNumber: "254712345678",
    mpesaNumber: "254712345678",
    idNumber: "12345678",
  },
  {
    ...arsenalStaffDetails,
    visibleId: "SUPERVISOR2",
    supervisorName: "Declan Rice",
    supervisorEmail: "declan.rice@test.com",
    bankAccountNumber: "23456789",
    bankAccountName: "Declan Rice",
    kra: "B234567890C",
    dateOfBirth: new Date(1999, 0, 14),
    cellNumber: "254723456789",
    mpesaNumber: "254723456789",
    idNumber: "23456789",
  },
  {
    ...arsenalStaffDetails,
    visibleId: "SUPERVISOR3",
    supervisorName: "William Saliba",
    supervisorEmail: "william.saliba@test.com",
    bankAccountNumber: "34567890",
    bankAccountName: "William Saliba",
    kra: "C345678901D",
    dateOfBirth: new Date(2001, 2, 24),
    cellNumber: "254734567890",
    mpesaNumber: "254734567890",
    idNumber: "34567890",
  },
];

export const arsenalOpsUser = { email: "kai.havertz@test.com", name: "Kai Havertz" };

export const arsenalClinicalLead = {
  clinicalLeadEmail: "ben.white@test.com",
  clinicalLeadName: "Ben White",
};

export const arsenalClinicalTeamMember = {
  name: "Takehiro Tomiyasu",
  email: "takehiro.tomiyasu@test.com",
  cellNumber: "254712345679",
};

export const arsenalFellows = [
  {
    supervisorVisibleId: "SUPERVISOR1",
    visibleId: "FELLOW1",
    fellowName: "Bukayo Saka",
    fellowEmail: "bukayo.saka@test.com",
    mpesaName: "Bukayo Saka",
    mpesaNumber: "254712345678",
    cellNumber: "254712345678",
    gender: "Male",
    dateOfBirth: new Date(2001, 8, 5),
    idNumber: "12345678",
    county: "Nairobi",
    subCounty: "Westlands",
  },
  {
    supervisorVisibleId: "SUPERVISOR2",
    visibleId: "FELLOW2",
    fellowName: "Gabriel Martinelli",
    fellowEmail: "gabriel.martinelli@test.com",
    mpesaName: "Gabriel Martinelli",
    mpesaNumber: "254723456789",
    cellNumber: "254723456789",
    gender: "Male",
    dateOfBirth: new Date(2001, 5, 18),
    idNumber: "23456789",
    county: "Nairobi",
    subCounty: "Westlands",
  },
  {
    supervisorVisibleId: "SUPERVISOR3",
    visibleId: "FELLOW3",
    fellowName: "Gabriel Jesus",
    fellowEmail: "gabriel.jesus@test.com",
    mpesaName: "Gabriel Jesus",
    mpesaNumber: "254734567890",
    cellNumber: "254734567890",
    gender: "Male",
    dateOfBirth: new Date(1997, 3, 3),
    idNumber: "34567890",
    county: "Nairobi",
    subCounty: "Westlands",
  },
];

const arsenalSchoolDetails = {
  schoolType: "National",
  schoolCounty: "Nairobi",
  schoolSubCounty: "Westlands",
  schoolDemographics: "Mixed",
  pointPersonPhone: "254700000000",
  droppedOut: false,
  dropoutReason: null,
  droppedOutAt: null,
};

// Only Emirates Academy gets the fixed groups, students and sessions; Sobha Academy is seeded like
// any other school.
export const emiratesAcademy = {
  ...arsenalSchoolDetails,
  supervisorVisibleId: "SUPERVISOR1",
  visibleId: "ARSENAL_SCH",
  schoolName: "Emirates Academy",
  schoolEmail: "Gabriel.academy@test.com",
  pointPersonName: "Thomas Partey",
  numbersExpected: 300,
  principalName: "David Raya",
};

export const sobhaAcademy = {
  ...arsenalSchoolDetails,
  supervisorVisibleId: "SUPERVISOR2",
  visibleId: "SOBHA_SCH",
  schoolName: "Sobha Academy",
  schoolEmail: "sobha.academy@test.com",
  pointPersonName: "Kai Havertz",
  numbersExpected: 350,
  principalName: "Mikel Merino",
};
