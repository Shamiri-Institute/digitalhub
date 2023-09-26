const fixtures = {
  organizations: [
    {
      name: "Shamiri Institute",
      contactEmail: "team@shamiri.institute",
    },
    {
      name: "Africa Mental Health Training & Research Foundation",
      contactEmail: "info@amhf.or.ke",
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
      roleName: "admin",
      permissions: ["read:*", "create:*", "update:*", "archive:*"],
    },
    {
      roleName: "operations",
      permissions: ["read:*", "create:*", "update:*", "archive:*"],
    },
    {
      roleName: "researcher",
      permissions: ["read:*"],
    },
    {
      roleName: "supervisor",
      permissions: [
        "read:schools",
        "read:fellows",
        "create:fellows:self",
        "update:fellows:self",
        "read:students",
      ],
    },
    {
      roleName: "hub-coordinator",
      permissions: ["read:schools", "update:schools:self"],
    },
    {
      roleName: "fellow",
      permissions: ["read:schools", "read:students", "update:students:self"],
    },
    {
      roleName: "external",
      permissions: [],
    },
  ],
  users: [
    {
      email: "osborn@shamiri.institute",
      name: "Tom Osborn",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "admin",
    },
    {
      email: "mmbone@shamiri.institute",
      name: "Wendy Mmbone",
      organizationByEmail: "team@shamiri.institute",
      organizationRole: "researcher",
    },
    {
      email: "benny@shamiri.institute",
      name: "Benny H. Otieno",
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
      organizationByEmail: "info@amhf.or.ke",
      organizationRole: "admin",
    },
  ],
};

export default fixtures;
