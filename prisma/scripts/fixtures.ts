const fixtures = {
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
      organizationRole: "hub-coordinator",
    },
    {
      email: "dmndetei@amhf.or.ke",
      name: "Dennis Mndetei",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/david-ndetei-headshot.jpg",
      organizationByEmail: "info@amhf.or.ke",
      organizationRole: "admin",
    },
  ],
};

export default fixtures;
