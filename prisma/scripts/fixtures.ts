const fixtures = {
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
  organizations: [
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
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "admin",
    },
    {
      email: "mmbone@shamiri.institute",
      name: "Wendy Mmbone",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/wendy-mmbone-headshot.jpeg",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "researcher",
    },
    {
      email: "benny@shamiri.institute",
      name: "Benny H. Otieno",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/benny-h-otieno-headshot.jpeg",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "admin",
    },
    {
      email: "linus@shamiri.institute",
      name: "Linus Wong",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "admin",
    },
    {
      email: "edmund@shamiri.institute",
      name: "Edmund Korley",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "admin",
    },
    {
      email: "dmndetei@amhf.or.ke",
      name: "Dennis Mndetei",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/david-ndetei-headshot.jpg",
      organizationByEmail: "info@amhf.or.ke",
      organizationRole: "admin",
    },
    {
      email: "jackline@shamiri.institute",
      name: "Jackline",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "hub-coordinator",
    },
    {
      email: "dennis@shamiri.institute",
      name: "Dennis",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "hub-coordinator",
    },
    {
      email: "mcgovarn@shamiri.institute",
      name: "McGovarn",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "hub-coordinator",
    },
    {
      email: "amanda@shamiri.institute",
      name: "Amanda",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "hub-coordinator",
    },
    {
      email: "chrispinus@shamiri.institute",
      name: "Chrispinus Misati",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "hub-coordinator",
    },
    {
      email: "paul@shamiri.institute",
      name: "Paul Okoth",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "hub-coordinator",
    },
  ],
};

export default fixtures;
