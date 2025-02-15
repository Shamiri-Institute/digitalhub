// @ts-nocheck
import { config } from "#/tailwind.config";

export const SCHOOL_DROPOUT_REASONS_MAPPING = {
  "lack of understanding of the program and the timelines":
    config.theme?.extend?.colors["shamiri-graph-purple"],
  "poor communication": config.theme?.extend?.colors["shamiri-light-red"],
  "lack of commitment": config.theme?.extend?.colors["shamiri-graph-yellow"],
  "prioritizing school activities":
    config.theme?.extend?.colors["shamiri-graph-green"],
} as const;

export const SCHOOL_DROPOUT_REASONS = Object.keys(
  SCHOOL_DROPOUT_REASONS_MAPPING,
) as string[];

export const SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING = {
  actual: config.theme?.extend?.colors["shamiri-new-blue"],
  difference: "#E5F3FF",
};

export const SUPERVISOR_DROP_OUT_REASONS = [
  "Prolonged lateness",
  "Program extension issue",
  "Prolonged absence",
  "Other opportunities",
  "Health issues",
  "Personal issues",
  "Other",
] as const;

export const FELLOW_DROP_OUT_REASONS = [
  "Another Job",
  "Dress Code",
  "Prolonged Absence",
  "Program Extension Issue",
  "Other",
] as const;

// TODO: Confirm list of complaint types
export const COMPLAINT_TYPES = [
  "Dress Code",
  "Prolonged Absence",
  "Other",
] as const;

export const SCHOOL_DEMOGRAPHICS = ["Girls", "Boys", "Mixed"] as const;

export const BOARDING_DAY_TYPES = ["Day", "Boarding", "Mixed"] as const;

export const ATTENDANCE_STATUS = ["attended", "missed", "unmarked"] as const;

export const OCCURRENCE_STATUS = ["attended", "unmarked"] as const;

export type INTERVENTION_SESSION_TYPES = "s0" | "s1" | "s2" | "s3" | "s4";
export type SUPERVISION_SESSION_TYPES = "sv1" | "sv2" | "sv3" | "sv4" | "sv5";
export type TRAINING_SESSION_TYPES = "t1" | "t2" | "t3" | "t4" | "t5";
export type CLINICAL_SESSION_TYPES =
  | "cl1"
  | "cl2"
  | "cl3"
  | "cl4"
  | "cl5"
  | "cl6"
  | "cl7"
  | "cl8";
export type DATA_FOLLOWUP_SESSION_TYPES =
  | "dfu1"
  | "dfu2"
  | "dfu3"
  | "dfu4"
  | "dfu5"
  | "dfu6";

export type ALL_SESSION_TYPE =
  | INTERVENTION_SESSION_TYPES
  | SUPERVISION_SESSION_TYPES
  | TRAINING_SESSION_TYPES
  | CLINICAL_SESSION_TYPES
  | DATA_FOLLOWUP_SESSION_TYPES;

export type SPECIAL_SESSION_TYPES = `special_${ALL_SESSION_TYPE}`;

export const SCHOOL_TYPES = [
  "County",
  "Sub-county",
  "Extra-county",
  "Community",
  "National",
] as const;

// https://github.com/Mondieki/kenya-counties-subcounties/blob/master/counties.json
export const KENYAN_COUNTIES = [
  {
    name: "Baringo",
    capital: "Kabarnet",
    code: 30,
    sub_counties: [
      "Baringo central",
      "Baringo north",
      "Baringo south",
      "Eldama ravine",
      "Mogotio",
      "Tiaty",
    ],
  },
  {
    name: "Bomet",
    capital: "Bomet",
    code: 36,
    sub_counties: [
      "Bomet central",
      "Bomet east",
      "Chepalungu",
      "Konoin",
      "Sotik",
    ],
  },
  {
    name: "Bungoma",
    capital: "Bungoma",
    code: 39,
    sub_counties: [
      "Bumula",
      "Kabuchai",
      "Kanduyi",
      "Kimilil",
      "Mt Elgon",
      "Sirisia",
      "Tongaren",
      "Webuye east",
      "Webuye west",
    ],
  },
  {
    name: "Busia",
    capital: "Busia",
    code: 40,
    sub_counties: [
      "Budalangi",
      "Butula",
      "Funyula",
      "Nambele",
      "Teso North",
      "Teso South",
    ],
  },
  {
    name: "Elgeyo-Marakwet",
    capital: "Iten",
    code: 28,
    sub_counties: [
      "Keiyo north",
      "Keiyo south",
      "Marakwet east",
      "Marakwet west",
    ],
  },
  {
    name: "Embu",
    capital: "Embu",
    code: 14,
    sub_counties: ["Manyatta", "Mbeere north", "Mbeere south", "Runyenjes"],
  },
  {
    name: "Garissa",
    capital: "Garissa",
    code: 7,
    sub_counties: [
      "Daadab",
      "Fafi",
      "Garissa",
      "Hulugho",
      "Ijara",
      "Lagdera balambala",
    ],
  },
  {
    name: "Homa Bay",
    capital: "Homa Bay",
    code: 43,
    sub_counties: [
      "Homabay town",
      "Kabondo",
      "Karachwonyo",
      "Kasipul",
      "Mbita",
      "Ndhiwa",
      "Rangwe",
      "Suba",
    ],
  },
  {
    name: "Isiolo",
    capital: "Isiolo",
    code: 11,
    sub_counties: [
      "Central",
      "Garba tula",
      "Kina",
      "Merit",
      "Oldonyiro",
      "Sericho",
    ],
  },
  {
    name: "Kajiado",
    code: 34,
    sub_counties: [
      "Isinya",
      "Kajiado Central",
      "Kajiado North",
      "Loitokitok",
      "Mashuuru",
    ],
  },
  {
    name: "Kakamega",
    capital: "Kakamega",
    code: 37,
    sub_counties: [
      "Butere",
      "Kakamega central",
      "Kakamega east",
      "Kakamega north",
      "Kakamega south",
      "Khwisero",
      "Lugari",
      "Lukuyani",
      "Lurambi",
      "Matete",
      "Mumias",
      "Mutungu",
      "Navakholo",
    ],
  },
  {
    name: "Kericho",
    capital: "Kericho",
    code: 35,
    sub_counties: [
      "Ainamoi",
      "Belgut",
      "Bureti",
      "Kipkelion east",
      "Kipkelion west",
      "Soin sigowet",
    ],
  },
  {
    name: "Kiambu",
    capital: "Kiambu",
    code: 22,
    sub_counties: [
      "Gatundu north",
      "Gatundu south",
      "Githunguri",
      "Juja",
      "Kabete",
      "Kiambaa",
      "Kiambu",
      "Kikuyu",
      "Limuru",
      "Ruiru",
      "Thika town",
      "lari",
    ],
  },
  {
    name: "Kilifi",
    capital: "Kilifi",
    code: 3,
    sub_counties: [
      "Genzw",
      "Kaloleni",
      "Kilifi north",
      "Kilifi south",
      "Magarini",
      "Malindi",
      "Rabai",
    ],
  },
  {
    name: "Kirinyaga",
    capital: "Kerugoya/Kutus",
    code: 20,
    sub_counties: [
      "Kirinyaga central",
      "Kirinyaga east",
      "Kirinyaga west",
      "Mwea east",
      "Mwea west",
    ],
  },
  {
    name: "Kisii",
    capital: "Kisii",
    code: 45,
    sub_counties: [
      "Gucha",
      "Gucha south",
      "Kenyenya",
      "Kisii central",
      "Kisii south",
      "Marani",
      "Masaba south",
      "Nyamache",
      "Samate",
    ],
  },
  {
    name: "Kisumu",
    capital: "Kisumu",
    code: 42,
    sub_counties: [
      "Kisumu central",
      "Kisumu east ",
      "Kisumu west",
      "Muhoroni",
      "Nyakach",
      "Nyando",
      "Seme",
    ],
  },
  {
    name: "Kitui",
    capital: "Kitui",
    code: 15,
    sub_counties: [
      "Ikutha",
      "Katulani",
      "Kisasi",
      "Kitui central",
      "Kitui west ",
      "Lower yatta",
      "Matiyani",
      "Migwani",
      "Mutitu",
      "Mutomo",
      "Muumonikyusu",
      "Mwingi central",
      "Mwingi east",
      "Nzambani",
      "Tseikuru",
    ],
  },
  {
    name: "Kwale",
    capital: "Kwale",
    code: 2,
    sub_counties: ["Kinango", "Lungalunga", "Msambweni", "Mutuga"],
  },
  {
    name: "Laikipia",
    capital: "Rumuruti",
    code: 31,
    sub_counties: [
      "Laikipia central",
      "Laikipia east",
      "Laikipia north",
      "Laikipia west ",
      "Nyahururu",
    ],
  },
  {
    name: "Lamu",
    capital: "Lamu",
    code: 5,
    sub_counties: ["Lamu East", "Lamu West"],
  },
  {
    name: "Machakos",
    capital: "Machakos",
    code: 16,
    sub_counties: [
      "Kathiani",
      "Machakos town",
      "Masinga",
      "Matungulu",
      "Mavoko",
      "Mwala",
      "Yatta",
    ],
  },
  {
    name: "Makueni",
    capital: "Wote",
    code: 17,
    sub_counties: [
      "Kaiti",
      "Kibwei west",
      "Kibwezi east",
      "Kilome",
      "Makueni",
      "Mbooni",
    ],
  },
  {
    name: "Mandera",
    capital: "Mandera",
    code: 9,
    sub_counties: [
      "Banissa",
      "Lafey",
      "Mandera East",
      "Mandera North",
      "Mandera South",
      "Mandera West",
    ],
  },
  {
    name: "Marsabit",
    capital: "Marsabit",
    code: 10,
    sub_counties: ["Laisamis", "Moyale", "North hor", "Saku"],
  },
  {
    name: "Meru",
    capital: "Meru",
    code: 12,
    sub_counties: [
      "Buuri",
      "Igembe central",
      "Igembe north",
      "Igembe south",
      "Imenti central",
      "Imenti north",
      "Imenti south",
      "Tigania east",
      "Tigania west",
    ],
  },
  {
    name: "Migori",
    capital: "Migori",
    code: 44,
    sub_counties: [
      "Awendo",
      "Kuria east",
      "Kuria west",
      "Mabera",
      "Ntimaru",
      "Rongo",
      "Suna east",
      "Suna west",
      "Uriri",
    ],
  },
  {
    name: "Mombasa",
    capital: "Mombasa City",
    code: 1,
    sub_counties: ["Changamwe", "Jomvu", "Kisauni", "Likoni", "Mvita", "Nyali"],
  },
  {
    name: "Murang'a",
    capital: "Murang'a",
    code: 21,
    sub_counties: [
      "Gatanga",
      "Kahuro",
      "Kandara",
      "Kangema",
      "Kigumo",
      "Kiharu",
      "Mathioya",
      "Murang’a south",
    ],
  },
  {
    name: "Nairobi",
    capital: "Nairobi City",
    code: 47,
    sub_counties: [
      "Dagoretti North",
      "Dagoretti South",
      "Embakasi Central",
      "Embakasi East",
      "Embakasi North",
      "Embakasi South",
      "Embakasi West",
      "Kamukunji",
      "Kasarani ",
      "Kibra ",
      "Lang'ata ",
      "Makadara",
      "Mathare ",
      "Roysambu ",
      "Ruaraka ",
      "Starehe ",
      "Westlands ",
    ],
  },
  {
    name: "Nakuru",
    capital: "Nakuru",
    code: 32,
    sub_counties: [
      "Bahati",
      "Gilgil",
      "Kuresoi north",
      "Kuresoi south",
      "Molo",
      "Naivasha",
      "Nakuru town east",
      "Nakuru town west",
      "Njoro",
      "Rongai",
      "Subukia",
    ],
  },
  {
    name: "Nandi",
    capital: "Kapsabet",
    code: 29,
    sub_counties: [
      "Aldai",
      "Chesumei",
      "Emgwen",
      "Mosop",
      "Namdi hills",
      "Tindiret",
    ],
  },
  {
    name: "Narok",
    capital: "Narok",
    code: 33,
    sub_counties: [
      "Narok east",
      "Narok north",
      "Narok south",
      "Narok west",
      "Transmara east",
      "Transmara west",
    ],
  },
  {
    name: "Nyamira",
    capital: "Nyamira",
    code: 46,
    sub_counties: [
      "Borabu",
      "Manga",
      "Masaba north",
      "Nyamira north",
      "Nyamira south",
    ],
  },
  {
    name: "Nyandarua",
    capital: "Ol Kalou",
    code: 18,
    sub_counties: [
      "Kinangop",
      "Kipipiri",
      "Ndaragwa",
      "Ol Kalou",
      "Ol joro orok",
    ],
  },
  {
    name: "Nyeri",
    capital: "Nyeri",
    code: 19,
    sub_counties: [
      "Kieni east",
      "Kieni west",
      "Mathira east",
      "Mathira west",
      "Mkurweni",
      "Nyeri town",
      "Othaya",
      "Tetu",
    ],
  },
  {
    name: "Samburu",
    capital: "Maralal",
    code: 25,
    sub_counties: ["Samburu east", "Samburu north", "Samburu west"],
  },
  {
    name: "Siaya",
    capital: "Siaya",
    code: 41,
    sub_counties: [
      "Alego usonga",
      "Bondo",
      "Gem",
      "Rarieda",
      "Ugenya",
      "Unguja",
    ],
  },
  {
    name: "Taita-Taveta",
    capital: "Voi",
    code: 6,
    sub_counties: ["Mwatate", "Taveta", "Voi", "Wundanyi"],
  },
  {
    name: "Tana River",
    capital: "Hola",
    code: 4,
    sub_counties: ["Bura", "Galole", "Garsen"],
  },
  {
    name: "Tharaka-Nithi",
    capital: "Chuka",
    code: 13,
    sub_counties: [
      "Chuka",
      "Igambangobe",
      "Maara",
      "Muthambi",
      "Tharak north",
      "Tharaka south",
    ],
  },
  {
    name: "Trans-Nzoia",
    capital: "Kitale",
    code: 26,
    sub_counties: ["Cherangany", "Endebess", "Kiminini", "Kwanza", "Saboti"],
  },
  {
    name: "Turkana",
    capital: "Lodwar",
    code: 23,
    sub_counties: [
      "Loima",
      "Turkana central",
      "Turkana east",
      "Turkana north",
      "Turkana south",
    ],
  },
  {
    name: "Uasin Gishu",
    capital: "Eldoret",
    code: 27,
    sub_counties: ["Ainabkoi", "Kapseret", "Kesses", "Moiben", "Soy", "Turbo"],
  },
  {
    name: "Vihiga",
    capital: "Vihiga",
    code: 38,
    sub_counties: ["Emuhaya", "Hamisi", "Luanda", "Sabatia", "vihiga"],
  },
  {
    name: "Wajir",
    capital: "Wajir",
    code: 8,
    sub_counties: [
      "Eldas",
      "Tarbaj",
      "Wajir East",
      "Wajir North",
      "Wajir South",
      "Wajir West",
    ],
  },
  {
    name: "West Pokot",
    capital: "Kapenguria",
    code: 24,
    sub_counties: ["Central Pokot", "North Pokot", "Pokot South", "West Pokot"],
  },
] as const;

export type SESSION_NAME_TYPE =
  | "INTERVENTION"
  | "SUPERVISION"
  | "TRAINING"
  | "SPECIAL"
  | "CLINICAL"
  | "DATA_COLLECTION";

export const SESSION_NAME_TYPES = [
  "INTERVENTION",
  "SUPERVISION",
  "TRAINING",
  "SPECIAL",
  "CLINICAL",
  "DATA_COLLECTION",
] as const;

type SessionType = {
  name: ALL_SESSION_TYPE;
  label: string;
  type: SESSION_NAME_TYPE;
  amount?: number;
};

export const SESSION_TYPES: SessionType[] = [
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
    amount: 1000,
  },
  {
    name: "s2",
    label: "Session 2",
    type: "INTERVENTION",
    amount: 1000,
  },
  {
    name: "s3",
    label: "Session 3",
    type: "INTERVENTION",
    amount: 1000,
  },
  {
    name: "s4",
    label: "Session 4",
    type: "INTERVENTION",
    amount: 1000,
  },
  {
    name: "sv1",
    label: "Supervision 1",
    type: "SUPERVISION",
    amount: 1000,
  },
  {
    name: "sv2",
    label: "Supervision 2",
    type: "SUPERVISION",
    amount: 1000,
  },
  {
    name: "sv3",
    label: "Supervision 3",
    type: "SUPERVISION",
    amount: 1000,
  },
  {
    name: "sv4",
    label: "Supervision 4",
    type: "SUPERVISION",
    amount: 1000,
  },
  {
    name: "sv5",
    label: "Supervision 5",
    type: "SUPERVISION",
    amount: 1000,
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
    amount: 1000,
  },
  {
    name: "cl2",
    label: "Clinical 2",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "cl3",
    label: "Clinical 3",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "cl4",
    label: "Clinical 4",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "cl5",
    label: "Clinical 5",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "cl6",
    label: "Clinical 6",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "cl7",
    label: "Clinical 7",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "cl8",
    label: "Clinical 8",
    type: "CLINICAL",
    amount: 1000,
  },
  {
    name: "dfu1",
    label: "Data Follow Up 1",
    type: "DATA_COLLECTION",
    amount: 1000,
  },
  {
    name: "dfu2",
    label: "Data Follow Up 2",
    type: "DATA_COLLECTION",
    amount: 1000,
  },
  {
    name: "dfu3",
    label: "Data Follow Up 3",
    type: "DATA_COLLECTION",
    amount: 1000,
  },
  {
    name: "dfu4",
    label: "Data Follow Up 4",
    type: "DATA_COLLECTION",
    amount: 1000,
  },
  {
    name: "dfu5",
    label: "Data Follow Up 5",
    type: "DATA_COLLECTION",
    amount: 1000,
  },
  {
    name: "dfu6",
    label: "Data Follow Up 6",
    type: "DATA_COLLECTION",
    amount: 1000,
  },
];

export const STUDENT_DROPOUT_REASONS = [
  "Mistrust/Ethical Concerns",
  "Other commitments",
  "Transferred schools",
  "Other",
] as const;
