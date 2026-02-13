import {
  CalendarDate,
  endOfMonth,
  endOfWeek,
  getLocalTimeZone,
  startOfMonth,
  startOfWeek,
  today,
} from "@internationalized/date";

export function getCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export type DateRangeType = "day" | "week" | "month";

const DEFAULT_LOCALE = "en-US";

function toStartOfDay(date: CalendarDate): Date {
  return new Date(date.year, date.month - 1, date.day, 0, 0, 0, 0);
}

function toEndOfDay(date: CalendarDate): Date {
  return new Date(date.year, date.month - 1, date.day, 23, 59, 59, 999);
}

export function getDateRangeForCalendar(
  date: CalendarDate,
  rangeType: DateRangeType,
): { start: Date; end: Date } {
  if (rangeType === "day") {
    return {
      start: toStartOfDay(date),
      end: toEndOfDay(date),
    };
  }
  if (rangeType === "week") {
    const start = startOfWeek(date, DEFAULT_LOCALE);
    const end = endOfWeek(date, DEFAULT_LOCALE);
    return {
      start: toStartOfDay(start),
      end: toEndOfDay(end),
    };
  }
  if (rangeType === "month") {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return {
      start: toStartOfDay(start),
      end: toEndOfDay(end),
    };
  }
  return getDateRangeForCalendar(date, "week");
}

export function getDefaultSessionDateRange(): { start: Date; end: Date } {
  const now = today(getLocalTimeZone());
  return getDateRangeForCalendar(now, "week");
}
