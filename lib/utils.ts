import { Prisma, riskStatusOptions } from "@prisma/client";
import { clsx, type ClassValue } from "clsx";
import { Metadata } from "next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  const words = name.split(" ");
  const firstInitial = words[0]?.charAt(0).toUpperCase() ?? "";
  const lastInitial = words[words.length - 1]?.charAt(0).toUpperCase() ?? "";
  return firstInitial + lastInitial;
}

export function constructMetadata({
  title = "Shamiri Digital Hub ",
  description = "The Shamiri Digital Hub is a platform for managing the Shamiri Intervention.",
}: {
  title?: string;
  description?: string;
} = {}): Metadata {
  return {
    title,
    description,
  };
}

export function parseEuropeanDate(dateString: string | null): Date | null {
  if (!dateString) return null;

  // European date format is "day/month/year"
  const parts = dateString.split("/");

  if (parts.length < 3) return null;

  const year = Number(parts[2]);
  const month = Number(parts[1]);
  const day = Number(parts[0]);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month - 1, day);

  return date;
}

export function ordinalSuffixOf(i: number): string {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

export function getHighestValue(data: {
  [k: string]: string;
}): riskStatusOptions {
  const values = Object.values(data);

  if (values.includes("High")) {
    return "High";
  } else if (values.includes("Med")) {
    return "Medium";
  } else if (values.includes("Low")) {
    return "Low";
  } else {
    return "No";
  }
}

type sessionTypes = Prisma.InterventionSessionGetPayload<{}>[];

export function doesSessionExist(
  sessionTypes: sessionTypes,
  sessionName: string,
) {
  return sessionTypes.some(
    (session) => session.sessionName === sessionName && session.occurred,
  );
}
