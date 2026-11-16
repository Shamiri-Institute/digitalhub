import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import type { HubStats as HubStatsData } from "../queries";

export const formatCount = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) =>
  `${formatCount(n)} ${n === 1 ? one : many}`;

type SessionStates = Pick<
  HubStatsData["sessions"],
  "held" | "unmarked" | "upcoming" | "cancelled" | "scheduled"
>;

export const states = [
  {
    key: "held",
    label: "attended",
    fill: "fill-success",
    swatch: "bg-success",
  },
  {
    key: "unmarked",
    label: "unmarked",
    fill: "fill-chart-5",
    swatch: "bg-chart-5",
  },
  { key: "upcoming", label: "upcoming", fill: "fill-info", swatch: "bg-info" },
  { key: "cancelled", label: "cancelled", fill: "fill-destructive", swatch: "bg-destructive" },
] as const;

export function StateBar({
  counts,
}: {
  counts: Pick<SessionStates, (typeof states)[number]["key"]>;
}) {
  const total = states.reduce((sum, s) => sum + counts[s.key], 0);
  const share = (n: number) => (n / total) * 100;
  let offset = 0;

  return (
    <svg aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {total > 0 &&
        states
          .filter((s) => counts[s.key] > 0)
          .map((s) => {
            const x = offset;
            offset += share(counts[s.key]);
            return (
              <rect
                key={s.key}
                x={`${x}%`}
                width={`${share(counts[s.key])}%`}
                height="100%"
                strokeWidth={1}
                className={cn(s.fill, "stroke-white")}
              />
            );
          })}
    </svg>
  );
}

function Legend({ sessions }: { sessions: SessionStates }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {states
        .filter((s) => s.key === "unmarked" || sessions[s.key] > 0)
        .map((s) => (
          <li
            key={s.key}
            className={cn(
              "flex items-center gap-1.5",
              s.key === "unmarked" && sessions.unmarked > 0 && "font-semibold text-warning",
            )}
          >
            <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm", s.swatch)} />
            {formatCount(sessions[s.key])} {s.label}
            {s.key === "unmarked" && (
              <InfoTip label="What unmarked means" className="-ml-1.5">
                The session date has passed, but nobody has marked it attended or cancelled.
              </InfoTip>
            )}
          </li>
        ))}
    </ul>
  );
}

function InfoTip({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className={cn(
          "-my-1 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <Info aria-hidden className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{children}</TooltipContent>
    </Tooltip>
  );
}

function Notice({ tone, children }: { tone: "attention" | "done"; children: React.ReactNode }) {
  const Icon = tone === "attention" ? TriangleAlert : CircleCheck;
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
      <Icon
        aria-hidden
        className={cn("h-4 w-4 shrink-0", tone === "attention" ? "text-warning" : "text-success")}
      />
      {children}
    </p>
  );
}

function NoData() {
  return (
    <>
      <span aria-hidden>–</span>
      <span className="sr-only">No data</span>
    </>
  );
}

export function StatCell({
  label,
  info,
  children,
}: {
  label: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 bg-white px-4 py-3 xl:whitespace-nowrap">
      <p className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {info && <InfoTip label={`What ${label.toLowerCase()} counts`}>{info}</InfoTip>}
      </p>
      {children}
    </div>
  );
}

export function Figure({ value, unit }: { value: React.ReactNode; unit?: string }) {
  return (
    <p className="text-foreground">
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
      {unit && <span className="ml-1.5 text-sm">{unit}</span>}
    </p>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function SessionsStat({
  sessions,
  className,
}: {
  sessions: SessionStates;
  className?: string;
}) {
  const hasSessions = sessions.scheduled + sessions.cancelled > 0;
  return (
    <div className={cn("space-y-1 bg-white px-4 py-3 xl:whitespace-nowrap", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-foreground">Sessions</p>
        {hasSessions ? <Legend sessions={sessions} /> : <Note>No sessions scheduled yet</Note>}
      </div>
      <Figure
        value={formatCount(sessions.held)}
        unit={
          sessions.scheduled > 0
            ? `marked attended of ${formatCount(sessions.scheduled)} scheduled`
            : "marked attended"
        }
      />
      <div className="pt-1">
        <StateBar counts={sessions} />
      </div>
    </div>
  );
}

export default function HubStats({ stats }: { stats: HubStatsData }) {
  const { sessions, attendances, ratings } = stats;
  const missingAttendance = attendances.expected - attendances.marked;
  const allHeld = sessions.scheduled > 0 && sessions.held === sessions.scheduled;

  return (
    <section
      aria-label="Hub stats"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-[minmax(0,1fr)_repeat(4,max-content)]"
    >
      <SessionsStat sessions={sessions} className="col-span-2 xl:col-span-1" />
      <StatCell
        label="Fellow attendance"
        info="Each group's leader needs an attendance, present or absent, for every intervention session marked attended at their school. Pre-sessions are not counted."
      >
        {attendances.expected > 0 ? (
          <>
            <Figure value={`${Math.round((attendances.marked / attendances.expected) * 100)}%`} />
            <Note>
              {formatCount(attendances.marked)} of{" "}
              {plural(attendances.expected, "attendance", "attendances")}
            </Note>
          </>
        ) : (
          <>
            <Figure value={<NoData />} />
            <Note>
              {sessions.held > 0
                ? "Pre-sessions are not counted"
                : "No sessions marked attended yet"}
            </Note>
          </>
        )}
      </StatCell>
      <StatCell label="Fellow rating">
        {ratings.average === null ? (
          <>
            <Figure value={<NoData />} />
            <Note>No weekly ratings yet</Note>
          </>
        ) : (
          <>
            <Figure value={ratings.average.toFixed(1)} unit="/ 5 average" />
            <Note>from {plural(ratings.count, "weekly rating", "weekly ratings")}</Note>
          </>
        )}
      </StatCell>
      <StatCell label="Groups formed">
        <Figure value={formatCount(stats.groups)} />
        <Note>
          {stats.groups > 0
            ? `${plural(stats.studentsInGroups, "student", "students")} in groups`
            : "No groups yet"}
        </Note>
      </StatCell>
      <StatCell label="Dropouts">
        <Figure value={formatCount(stats.droppedOutStudents)} unit="students" />
        <Note>and {plural(stats.droppedOutFellows, "fellow", "fellows")}</Note>
      </StatCell>
      {(sessions.unmarked > 0 || missingAttendance > 0 || allHeld) && (
        <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-1 bg-white px-4 py-2.5 xl:col-span-5">
          {sessions.unmarked > 0 && (
            <Notice tone="attention">
              {plural(sessions.unmarked, "past session needs", "past sessions need")} marking
            </Notice>
          )}
          {missingAttendance > 0 && (
            <Notice tone="attention">
              {plural(missingAttendance, "fellow attendance", "fellow attendances")} not marked
            </Notice>
          )}
          {allHeld && <Notice tone="done">All sessions marked attended</Notice>}
        </div>
      )}
    </section>
  );
}
