// @ts-nocheck
import { config } from "../../tailwind.config.ts";

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
