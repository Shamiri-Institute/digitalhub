import { parseDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImplementerRole } from "#/db/enums";
import { parseScheduleView, sameRange, scheduleRange, scheduleSearch } from "#/lib/schedule-view";

const params = (query: string) => {
  const search = new URLSearchParams(query);
  return (name: string) => search.get(name);
};

describe("parseScheduleView", () => {
  // 22:30 on 8 October in UTC is already 9 October in Nairobi.
  const atLateEvening = () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T22:30:00Z"));
  };
  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to the month view on today in the viewer's zone", () => {
    atLateEvening();
    const view = parseScheduleView(params(""), ImplementerRole.SUPERVISOR, "Africa/Nairobi");
    expect(view.mode).toBe("month");
    expect(view.span).toBe("month");
    expect(view.date.toString()).toBe("2026-10-09");
    expect(parseScheduleView(params(""), ImplementerRole.SUPERVISOR, "UTC").date.toString()).toBe(
      "2026-10-08",
    );
  });

  it("gives the table view only to hub coordinators", () => {
    expect(parseScheduleView(params("mode=table"), ImplementerRole.SUPERVISOR, "UTC").mode).toBe(
      "month",
    );
    expect(
      parseScheduleView(params("mode=table"), ImplementerRole.HUB_COORDINATOR, "UTC").span,
    ).toBe("week");
  });

  it("reads the list span and ignores a bad date", () => {
    atLateEvening();
    const view = parseScheduleView(
      params("mode=list&span=month&date=not-a-date"),
      ImplementerRole.FELLOW,
      "UTC",
    );
    expect(view.span).toBe("month");
    expect(view.date.toString()).toBe("2026-10-08");
  });

  it("reads the supervisors or fellows choice in the table view and falls back to supervisors", () => {
    const attendanceRole = (query: string) =>
      parseScheduleView(params(query), ImplementerRole.HUB_COORDINATOR, "UTC").attendanceRole;
    expect(attendanceRole("mode=table&role=fellows")).toBe("fellows");
    expect(attendanceRole("mode=table")).toBe("supervisors");
    expect(attendanceRole("mode=table&role=bogus")).toBe("supervisors");
    expect(attendanceRole("mode=week&role=fellows")).toBe("supervisors");
  });
});

describe("scheduleSearch", () => {
  const roundTrip = (query: string) =>
    scheduleSearch(parseScheduleView(params(query), ImplementerRole.HUB_COORDINATOR, "UTC"));

  it("keeps the table view's day and supervisors or fellows choice", () => {
    expect(roundTrip("mode=table&date=2026-10-08&role=fellows")).toBe(
      "?mode=table&date=2026-10-08&role=fellows",
    );
  });

  it("leaves the supervisors or fellows choice out of the other views", () => {
    expect(roundTrip("mode=week&date=2026-10-08&role=fellows")).toBe("?mode=week&date=2026-10-08");
  });
});

describe("scheduleRange", () => {
  it("bounds a week from Sunday in the viewer's zone", () => {
    const view = {
      mode: "week" as const,
      span: "week" as const,
      date: parseDate("2026-10-08"),
      attendanceRole: "supervisors" as const,
    };
    const { start, end } = scheduleRange(view, "Africa/Nairobi");
    expect(start.toISOString()).toBe("2026-10-03T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-10T21:00:00.000Z");
  });

  it("covers a 25-hour day when daylight saving ends", () => {
    const view = {
      mode: "day" as const,
      span: "day" as const,
      date: parseDate("2026-11-01"),
      attendanceRole: "supervisors" as const,
    };
    const { start, end } = scheduleRange(view, "America/New_York");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
});

describe("sameRange", () => {
  it("treats two days in one month as the same month range", () => {
    const month = (date: string) => ({
      mode: "month" as const,
      span: "month" as const,
      date: parseDate(date),
      attendanceRole: "supervisors" as const,
    });
    expect(sameRange(month("2026-10-01"), month("2026-10-31"))).toBe(true);
    expect(sameRange(month("2026-10-31"), month("2026-11-01"))).toBe(false);
  });

  it("treats another day or supervisors or fellows choice in the table view's week as the same range", () => {
    const table = (query: string) =>
      parseScheduleView(params(`mode=table&${query}`), ImplementerRole.HUB_COORDINATOR, "UTC");
    const thursday = table("date=2026-10-08");
    expect(sameRange(thursday, table("date=2026-10-04"))).toBe(true);
    expect(sameRange(thursday, table("date=2026-10-10&role=fellows"))).toBe(true);
    expect(sameRange(thursday, table("date=2026-10-11"))).toBe(false);
  });
});
