import { ImplementerRole } from "@prisma/client";

interface Fixtures {
  users: {
    email: string;
    name: string;
    implementerByVisibleId: string;
    implementerRole: ImplementerRole;
    avatarUrl: string | null;
    identifier?: string;
  }[];
}

export const fixtures: Fixtures = {
  users: [
    {
      email: "mmbone@shamiri.institute",
      name: "Wendy Mmbone",
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.ADMIN,
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/wendy-mmbone-headshot.jpeg",
    },
    {
      email: "benny@shamiri.institute",
      name: "Benny H. Otieno",
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.OPERATIONS,
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/benny-h-otieno-headshot.jpeg",
    },
    {
      email: "linus@shamiri.institute",
      name: "Linus Wong",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.ADMIN,
    },
    {
      email: "edmund@shamiri.institute",
      name: "Edmund Korley",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.SUPERVISOR,
      identifier: "SPV23_S_01",
    },
    {
      email: "dmndetei@amhf.or.ke",
      name: "Dennis Mndetei",
      avatarUrl:
        "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com/david-ndetei-headshot.jpg",
      implementerByVisibleId: "Imp_2",
      implementerRole: ImplementerRole.ADMIN,
    },
    {
      email: "jackline@shamiri.institute",
      name: "Jackline",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.HUB_COORDINATOR,
    },
    {
      email: "dennis@shamiri.institute",
      name: "Dennis",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.HUB_COORDINATOR,
    },
    {
      email: "mcgovarn@shamiri.institute",
      name: "McGovarn",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.HUB_COORDINATOR,
    },
    {
      email: "amanda@shamiri.institute",
      name: "Amanda",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.HUB_COORDINATOR,
    },
    {
      email: "chrispinus@shamiri.institute",
      name: "Chrispinus Misati",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.HUB_COORDINATOR,
    },
    {
      email: "paul@shamiri.institute",
      name: "Paul Okoth",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.HUB_COORDINATOR,
    },
    {
      email: "ruth@shamiri.institute",
      name: "Ruth Wangari",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "symon@shamiri.institute",
      name: "Symon Wangari",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "veronicah@shamiri.institute",
      name: "Veronicah Ngatia",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "beverly@shamiri.institute",
      name: "Beverly Mshai",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "edwin@amhf.or.ke",
      name: "Edwin Omari",
      avatarUrl: null,
      implementerByVisibleId: "Imp_2",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "hemstone@amhf.or.ke",
      name: "Hemstone Mugala",
      avatarUrl: null,
      implementerByVisibleId: "Imp_2",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "grace@amhf.or.ke",
      name: "Grace Mugo",
      avatarUrl: null,
      implementerByVisibleId: "Imp_2",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "rachel@amhf.or.ke",
      name: "Rachel Kamau",
      avatarUrl: null,
      implementerByVisibleId: "Imp_2",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
    {
      email: "shadrack.lilan@shamiri.institute",
      name: "Shadrack Lilan",
      avatarUrl: null,
      implementerByVisibleId: "Imp_1",
      implementerRole: ImplementerRole.SUPERVISOR,
    },
  ],
};
