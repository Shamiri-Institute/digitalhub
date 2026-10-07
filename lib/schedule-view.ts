import {
  type CalendarDate,
  endOfMonth,
  endOfWeek,
  isSameDay,
  parseDate,
  startOfMonth,
  startOfWeek,
  today,
} from "@internationalized/date";
import { ImplementerRole } from "#/db/enums";
import { getCalendarDate } from "#/lib/date-utils";

export type Mode = "day" | "week" | "month" | "list" | "table";
export type Span = "day" | "week" | "month";

/** What the schedule shows, as stored in the URL: `?mode=week&date=2026-10-08&span=week`. */
export type ScheduleView = { mode: Mode; date: CalendarDate; span: Span };

export const TIME_ZONE_COOKIE = "tz";

const SPANS: Span[] = ["day", "week", "month"];
const WEEK_LOCALE = "en-US";

function modesFor(role: ImplementerRole): Mode[] {
  return role === ImplementerRole.HUB_COORDINATOR
    ? ["day", "week", "month", "list", "table"]
    : ["day", "week", "month", "list"];
}

export function parseScheduleView(
  get: (name: string) => string | null,
  role: ImplementerRole,
  timeZone: string,
): ScheduleView {
  const requestedMode = get("mode") as Mode | null;
  const mode = requestedMode && modesFor(role).includes(requestedMode) ? requestedMode : "month";
  const requestedSpan = get("span") as Span | null;
  const span: Span =
    mode === "list"
      ? requestedSpan && SPANS.includes(requestedSpan)
        ? requestedSpan
        : "week"
      : mode === "table"
        ? "week"
        : mode;
  return { mode, date: parseDateOr(get("date"), today(timeZone)), span };
}

function parseDateOr(value: string | null, fallback: CalendarDate) {
  try {
    return value ? parseDate(value) : fallback;
  } catch {
    return fallback;
  }
}

export function scheduleSearch(view: ScheduleView) {
  const params = new URLSearchParams({ mode: view.mode, date: view.date.toString() });
  if (view.mode === "list") params.set("span", view.span);
  return `?${params.toString()}`;
}

function firstAndLastDay({ date, span }: ScheduleView) {
  if (span === "day") return { first: date, last: date };
  if (span === "week") {
    return { first: startOfWeek(date, WEEK_LOCALE), last: endOfWeek(date, WEEK_LOCALE) };
  }
  return { first: startOfMonth(date), last: endOfMonth(date) };
}

/** The days on screen as a half-open range of instants [start, end) in the viewer's time zone. */
export function scheduleRange(view: ScheduleView, timeZone: string) {
  const { first, last } = firstAndLastDay(view);
  return { start: first.toDate(timeZone), end: last.add({ days: 1 }).toDate(timeZone) };
}

export function sameRange(a: ScheduleView, b: ScheduleView) {
  return a.span === b.span && firstAndLastDay(a).first.compare(firstAndLastDay(b).first) === 0;
}

export function sessionsAt<T extends { sessionDate: Date }>(
  sessions: T[],
  date: CalendarDate,
  hour?: number,
) {
  return sessions.filter(
    (session) =>
      isSameDay(date, getCalendarDate(session.sessionDate)) &&
      (!hour || session.sessionDate.getHours() === hour),
  );
}
