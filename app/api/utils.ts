import { addDays, subDays } from "date-fns";

/**
 * Parses a relative date string and returns the corresponding Date object.
 * Supports formats like "NEXT_1", "NEXT_2", "PREV_1", "PREV_2".
 *
 * @param relativeDate - The relative date string.
 * @returns The calculated Date object.
 */
export function parseRelativeDate(relativeDate: string): Date {
  const now = new Date();
  const [prefix, amountStr] = relativeDate.split("_");
  if (amountStr === undefined) {
    throw new Error("Invalid relative date format");
  }
  const amount = Number.parseInt(amountStr, 10);

  if (isNaN(amount)) {
    throw new Error("Invalid amount in relative date");
  }

  switch (prefix) {
    case "NEXT":
      return addDays(now, amount);
    case "PREV":
      return subDays(now, amount);
    default:
      throw new Error("Invalid relative date format");
  }
}

export function appUrl() {
  let url = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("No URL found");
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}
