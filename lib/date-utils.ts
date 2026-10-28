import { CalendarDate } from "@internationalized/date";
import { formatInTimeZone } from "date-fns-tz";

export function getCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** `28 Oct 2026, 14:05` in `timeZone`, so the server and the browser render the same text. */
export function formatDateTimeIn(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "dd MMM yyyy, HH:mm");
}
