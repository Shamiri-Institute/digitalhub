import { parseDate } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import { ImplementerRole } from "#/db/enums";
import { parseScheduleView, sameRange, scheduleRange, scheduleSearch } from "#/lib/schedule-view";

const params = (query: string) => {
  const search = new URLSearchParams(query);
  return (name: string) => search.get(name);
};

describe("parseScheduleView", () => {
  it("falls back to the month view on today in the viewer's zone", () => {
    const view = parseScheduleView(params(""), ImplementerRole.SUPERVISOR, "Africa/Nairobi");
    expect(view.mode).toBe("month");
    expect(view.span).toBe("month");
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
    const view = parseScheduleView(
      params("mode=list&span=month&date=not-a-date"),
      ImplementerRole.FELLOW,
      "UTC",
    );
    expect(view.span).toBe("month");
    expect(view.date.toString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reads the people choice in the table view and falls back to supervisors", () => {
    const people = (query: string) =>
      parseScheduleView(params(query), ImplementerRole.HUB_COORDINATOR, "UTC").people;
    expect(people("mode=table&people=fellows")).toBe("fellows");
    expect(people("mode=table")).toBe("supervisors");
    expect(people("mode=table&people=bogus")).toBe("supervisors");
    expect(people("mode=week&people=fellows")).toBe("supervisors");
  });
});

describe("scheduleSearch", () => {
  const roundTrip = (query: string) =>
    scheduleSearch(parseScheduleView(params(query), ImplementerRole.HUB_COORDINATOR, "UTC"));

  it("keeps the table view's day and people choice", () => {
    expect(roundTrip("mode=table&date=2026-10-08&people=fellows")).toBe(
      "?mode=table&date=2026-10-08&people=fellows",
    );
  });

  it("leaves the people choice out of the other views", () => {
    expect(roundTrip("mode=week&date=2026-10-08&people=fellows")).toBe(
      "?mode=week&date=2026-10-08",
    );
  });
});

describe("scheduleRange", () => {
  it("bounds a week from Sunday in the viewer's zone", () => {
    const view = {
      mode: "week" as const,
      span: "week" as const,
      date: parseDate("2026-10-08"),
      people: "supervisors" as const,
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
      people: "supervisors" as const,
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
      people: "supervisors" as const,
    });
    expect(sameRange(month("2026-10-01"), month("2026-10-31"))).toBe(true);
    expect(sameRange(month("2026-10-31"), month("2026-11-01"))).toBe(false);
  });

  it("treats another day or people choice in the table view's week as the same range", () => {
    const table = (query: string) =>
      parseScheduleView(params(`mode=table&${query}`), ImplementerRole.HUB_COORDINATOR, "UTC");
    const thursday = table("date=2026-10-08");
    expect(sameRange(thursday, table("date=2026-10-04"))).toBe(true);
    expect(sameRange(thursday, table("date=2026-10-10&people=fellows"))).toBe(true);
    expect(sameRange(thursday, table("date=2026-10-11"))).toBe(false);
  });
});
