interface Fixtures {
  hubs: any[];
  implementers: any[];
  permissions: string[];
  roles: any[];
  users: {
    email: string;
    name: string;
    implementerByEmail: string;
    implementerRole: string;
    avatarUrl: string | null;
    account: {
      type: string;
      provider: string;
      providerAccountId: string;
    } | null;
  }[];
  supervisors: {
    name: string;
    visibleId: string;
    idNumber: string | null;
    cellNumber: string | null;
    mpesaNumber: string | null;
    email: string | null;
    memberEmail: string;
  }[];
}

export const fixtures: Fixtures = {
  hubs: [
    {
      visibleId: "23_HUB_01",
      hubName: "Kariobangi",
      hubCoordinatorByEmail: "jackline@shamiri.institute",
    },
    {
      visibleId: "23_HUB_02",
      hubName: "Kasarani",
      hubCoordinatorByEmail: "dennis@shamiri.institute",
    },
    {
      visibleId: "23_HUB_03",
      hubName: "Kiambaa",
      hubCoordinatorByEmail: "mcgovarn@shamiri.institute",
    },
    {
      visibleId: "23_HUB_04",
      hubName: "Machakos and Makueni",
      hubCoordinatorByEmail: "amanda@shamiri.institute",
    },
    {
      visibleId: "23_HUB_05",
      hubName: "Ruiru",
      hubCoordinatorByEmail: "chrispinus@shamiri.institute",
    },
    {
      visibleId: "23_HUB_06",
      hubName: "Kisumu",
      hubCoordinatorByEmail: "paul@shamiri.institute",
    },
    {
      visibleId: "Partner",
      hubName: "Partner",
      hubCoordinatorByEmail: null,
    },
    {
      visibleId: "HQ_2022",
      hubName: "All",
      hubCoordinatorByEmail: null,
    },
    {
      visibleId: "HQ_2021",
      hubName: "All",
      hubCoordinatorByEmail: null,
    },
    {
      visibleId: "HQ_2019",
      hubName: "All",
      hubCoordinatorByEmail: null,
    },
    {
      visibleId: "HQ_2018",
      hubName: "All",
      hubCoordinatorByEmail: null,
    },
  ],
  implementers: [
    {
      name: "Team Shamiri",
      contactEmail: "team@shamiri.institute",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/shamiri-logo.png",
    },
    {
      name: "Africa Mental Health Training & Research Foundation",
      contactEmail: "info@amhf.or.ke",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/amhrtf-logo.png",
    },
  ],
  permissions: [
    "read:*",
    "read:schools",
    "read:fellows",
    "read:students",
    "read:students:self",
    "create:*",
    "create:fellows:self",
    "update:*",
    "update:schools:self",
    "update:fellows:self",
    "update:students:self",
    "archive:*",
  ],
  roles: [
    {
      roleId: "admin",
      roleName: "Admin",
      roleDescription: "Full administrative access",
      permissions: ["read:*", "create:*", "update:*", "archive:*"],
    },
    {
      roleId: "operations",
      roleName: "Operations",
      roleDescription: "Full access optimized for the operations team",
      permissions: ["read:*", "create:*", "update:*", "archive:*"],
    },
    {
      roleId: "researcher",
      roleName: "Researcher",
      roleDescription: "Full access optimized for researchers",
      permissions: ["read:*"],
    },
    {
      roleId: "supervisor",
      roleName: "Supervisor",
      roleDescription: "Full access optimized for supervisors",
      permissions: [
        "read:schools",
        "read:fellows",
        "create:fellows:self",
        "update:fellows:self",
        "read:students",
      ],
    },
    {
      roleId: "hub-coordinator",
      roleName: "Hub coordinator",
      roleDescription: "Full access with a hub",
      permissions: ["read:schools", "update:schools:self"],
    },
    {
      roleId: "external",
      roleName: "External",
      roleDescription: "Fine grained access for external collaborators",
      permissions: [],
    },
  ],
  users: [
    {
      email: "osborn@shamiri.institute",
      name: "Tom Osborn",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/tom-osborn-headshot.jpeg",
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "admin",
      account: null,
    },
    {
      email: "mmbone@shamiri.institute",
      name: "Wendy Mmbone",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/wendy-mmbone-headshot.jpeg",
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "researcher",
      account: null,
    },
    {
      email: "benny@shamiri.institute",
      name: "Benny H. Otieno",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/benny-h-otieno-headshot.jpeg",
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "admin",
      account: null,
    },
    {
      email: "linus@shamiri.institute",
      name: "Linus Wong",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "admin",
      account: null,
    },
    {
      email: "edmund@shamiri.institute",
      name: "Edmund Korley",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "admin",
      account: {
        type: "oauth",
        provider: "google",
        providerAccountId: "108548126092823590386",
      },
    },
    {
      email: "dmndetei@amhf.or.ke",
      name: "Dennis Mndetei",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/david-ndetei-headshot.jpg",
      implementerByEmail: "info@amhf.or.ke",
      implementerRole: "admin",
      account: null,
    },
    {
      email: "jackline@shamiri.institute",
      name: "Jackline",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "hub-coordinator",
      account: null,
    },
    {
      email: "dennis@shamiri.institute",
      name: "Dennis",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "hub-coordinator",
      account: null,
    },
    {
      email: "mcgovarn@shamiri.institute",
      name: "McGovarn",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "hub-coordinator",
      account: null,
    },
    {
      email: "amanda@shamiri.institute",
      name: "Amanda",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "hub-coordinator",
      account: null,
    },
    {
      email: "chrispinus@shamiri.institute",
      name: "Chrispinus Misati",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "hub-coordinator",
      account: null,
    },
    {
      email: "paul@shamiri.institute",
      name: "Paul Okoth",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "hub-coordinator",
      account: null,
    },
    {
      email: "ruth@shamiri.institute",
      name: "Ruth Wangari",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "symon@shamiri.institute",
      name: "Symon Wangari",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "veronicah@shamiri.institute",
      name: "Veronicah Ngatia",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "beverly@shamiri.institute",
      name: "Beverly Mshai",
      avatarUrl: null,
      implementerByEmail: "team@shamiri.institute",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "edwin@amhf.or.ke",
      name: "Edwin Omari",
      avatarUrl: null,
      implementerByEmail: "info@amhf.or.ke",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "hemstone@amhf.or.ke",
      name: "Hemstone Mugala",
      avatarUrl: null,
      implementerByEmail: "info@amhf.or.ke",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "grace@amhf.or.ke",
      name: "Grace Mugo",
      avatarUrl: null,
      implementerByEmail: "info@amhf.or.ke",
      implementerRole: "supervisor",
      account: null,
    },
    {
      email: "rachel@amhf.or.ke",
      name: "Rachel Kamau",
      avatarUrl: null,
      implementerByEmail: "info@amhf.or.ke",
      implementerRole: "supervisor",
      account: null,
    },
  ],
  supervisors: [
    {
      name: "Ruth Wangari",
      visibleId: "SPV_001_21",
      idNumber: null,
      cellNumber: null,
      mpesaNumber: null,
      email: null,
      memberEmail: "ruth@shamiri.institute",
    },
    {
      name: "Symon Murage",
      visibleId: "SPV_002_21",
      idNumber: null,
      cellNumber: null,
      mpesaNumber: null,
      email: null,
      memberEmail: "ruth@shamiri.institute",
    },
    {
      name: "Veronicah Ngatia",
      visibleId: "SPV_003_21",
      idNumber: null,
      cellNumber: null,
      mpesaNumber: null,
      email: null,
      memberEmail: "veronicah@shamiri.institute",
    },
    {
      name: "Beverly Mshai",
      visibleId: "SPV_001_22",
      idNumber: null,
      cellNumber: null,
      mpesaNumber: null,
      email: null,
      memberEmail: "beverly@shamiri.institute",
    },
    {
      name: "Edwin Omari",
      visibleId: "SPV_M_001_22",
      idNumber: null,
      cellNumber: "717017355",
      mpesaNumber: null,
      email: null,
      memberEmail: "edwin@amhf.or.ke",
    },
    {
      name: "Hemstone Mugala",
      visibleId: "SPV_M_002_22",
      idNumber: null,
      cellNumber: "726267020",
      mpesaNumber: null,
      email: null,
      memberEmail: "hemstone@amhf.or.ke",
    },
    {
      name: "Grace Mugo",
      visibleId: "SPV_M_003_22",
      idNumber: null,
      cellNumber: "715044566",
      mpesaNumber: null,
      email: null,
      memberEmail: "edwin@amhf.or.ke",
    },
    {
      name: "Rachel Kamau",
      visibleId: "SPV_M_004_22",
      idNumber: null,
      cellNumber: "723326656",
      mpesaNumber: null,
      email: null,
      memberEmail: "edwin@amhf.or.ke",
    },
  ],
};
