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

export const SCHOOL_DEMOGRAPHICS = ["Girls", "Boys", "Mixed"] as const;

export const BOARDING_DAY_TYPES = ["Day", "Boarding", "Mixed"] as const;

export const SCHOOL_TYPES = [
  "County",
  "Sub-county",
  "Extra-county",
  "Community",
  "National",
] as const;

export const KENYAN_COUNTIES = [
  "Mombasa",
  "Kwale",
  "Kilifi",
  "Tana River",
  "Lamu",
  "Taita Taveta",
  "Garissa",
  "Wajir",
  "Mandera",
  "Marsabit",
  "Isiolo",
  "Meru",
  "Tharaka Nithi",
  "Embu",
  "Kitui",
  "Machakos",
  "Makueni",
  "Nyandarua",
  "Nyeri",
  "Kirinyaga",
  "Murang'a",
  "Kiambu",
  "Turkana",
  "West Pokot",
  "Samburu",
  "Trans Nzoia",
  "Uasin Gishu",
  "Elgeyo/Marakwet",
  "Nandi",
  "Baringo",
  "Laikipia",
  "Nakuru",
  "Narok",
  "Kajiado",
  "Kericho",
  "Bomet",
  "Kakamega",
  "Vihiga",
  "Bungoma",
  "Busia",
  "Siaya",
  "Kisumu",
  "Homa Bay",
  "Migori",
  "Kisii",
  "Nyamira",
  "Nairobi",
] as const;

export const SESSION_TYPES: { name: string; description: string }[] = [
  {
    name: "s0",
    description: "PRE",
  },
  {
    name: "s1",
    description: "S1",
  },
  {
    name: "s2",
    description: "S2",
  },
  {
    name: "s3",
    description: "S3",
  },
  {
    name: "s4",
    description: "S4",
  },
];
