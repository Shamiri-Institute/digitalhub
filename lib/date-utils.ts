import { CalendarDate } from "@internationalized/date";

export function getCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
