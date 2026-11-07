import { CalendarDate } from "@internationalized/date";
import { formatInTimeZone } from "date-fns-tz";

export function getCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** How the app shows a date: `28 Oct 2026`. */
export const DISPLAY_DATE = "dd MMM yyyy";

/** How the app shows a date and time: `28 Oct 2026, 14:05`. */
export const DISPLAY_DATE_TIME = "dd MMM yyyy, HH:mm";

/** `28 Oct 2026, 14:05` in `timeZone`, so the server and the browser render the same text. */
export function formatDateTimeIn(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, DISPLAY_DATE_TIME);
}

/** `28 Oct 2026` in `timeZone`, like formatDateTimeIn. */
export function formatDateIn(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, DISPLAY_DATE);
}
