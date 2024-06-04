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
