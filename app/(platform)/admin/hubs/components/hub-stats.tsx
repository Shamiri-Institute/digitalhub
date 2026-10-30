import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import type { HubStats as HubStatsData } from "../queries";
import { CountUp, SweepIn } from "./stats-motion";

const formatCount = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) =>
  `${formatCount(n)} ${n === 1 ? one : many}`;

type SessionStates = HubStatsData["sessions"];

const states = [
  {
    key: "held",
    label: "attended",
    fill: "fill-green-base",
    swatch: "bg-green-base",
  },
  {
    key: "unmarked",
    label: "unmarked",
    fill: "fill-shamiri-light-orange",
    swatch: "bg-shamiri-light-orange",
  },
  { key: "upcoming", label: "upcoming", fill: "fill-blue-base", swatch: "bg-blue-base" },
  { key: "cancelled", label: "cancelled", fill: "fill-red-base", swatch: "bg-red-base" },
] as const;

function StateBar({ counts }: { counts: Pick<SessionStates, (typeof states)[number]["key"]> }) {
  const total = states.reduce((sum, s) => sum + counts[s.key], 0);
  const share = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  // A few unmarked sessions among hundreds would be a sliver too thin to see.
  const unmarkedWidth = counts.unmarked > 0 ? Math.max(share(counts.unmarked), 4) : 0;
  const othersScale = (100 - unmarkedWidth) / (100 - share(counts.unmarked) || 1);
  const width = (key: (typeof states)[number]["key"]) =>
    key === "unmarked" ? unmarkedWidth : share(counts[key]) * othersScale;
  let offset = 0;

  return (
    <svg aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-shamiri-light-grey">
      {total > 0 &&
        states
          .filter((s) => counts[s.key] > 0)
          .map((s) => {
            const x = offset;
            offset += width(s.key);
            return (
              <rect
                key={s.key}
                x={`${x}%`}
                width={`${width(s.key)}%`}
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
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-shamiri-text-dark-grey">
      {states
        .filter((s) => s.key === "unmarked" || sessions[s.key] > 0)
        .map((s) => (
          <li
            key={s.key}
            className={cn(
              "flex items-center gap-1.5",
              s.key === "unmarked" &&
                sessions.unmarked > 0 &&
                "font-semibold text-shamiri-dark-orange",
            )}
          >
            <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm", s.swatch)} />
            {formatCount(sessions[s.key])} {s.label}
            {s.key === "unmarked" && (
              <Tooltip>
                <TooltipTrigger
                  aria-label="What unmarked means"
                  className="-my-1 -ml-1.5 inline-flex h-6 w-6 items-center justify-center rounded-sm text-shamiri-text-dark-grey hover:text-shamiri-black focus-visible:outline-2 focus-visible:outline-shamiri-new-blue"
                >
                  <Info aria-hidden className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-60">
                  The session date has passed, but nobody has marked it attended or cancelled.
                </TooltipContent>
              </Tooltip>
            )}
          </li>
        ))}
    </ul>
  );
}

function Notice({ tone, children }: { tone: "attention" | "done"; children: React.ReactNode }) {
  const Icon = tone === "attention" ? TriangleAlert : CircleCheck;
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-shamiri-black">
      <Icon
        aria-hidden
        className={cn(
          "h-4 w-4 shrink-0",
          tone === "attention" ? "text-shamiri-dark-orange" : "text-green-base",
        )}
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

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 bg-white px-4 py-3 xl:whitespace-nowrap">
      <p className="text-sm font-medium text-shamiri-black">{label}</p>
      {children}
    </div>
  );
}

function Figure({ value, unit }: { value: React.ReactNode; unit?: string }) {
  return (
    <p className="text-shamiri-black">
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
      {unit && <span className="ml-1.5 text-sm">{unit}</span>}
    </p>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-shamiri-text-dark-grey">{children}</p>;
}

export default function HubStats({ stats }: { stats: HubStatsData }) {
  const { sessions, ratings } = stats;
  const missingAttendance = sessions.attendanceExpected - sessions.attendanceRecorded;
  const hasSessions = sessions.scheduled + sessions.cancelled > 0;
  const allHeld = sessions.scheduled > 0 && sessions.held === sessions.scheduled;

  return (
    <section
      aria-label="Hub stats"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-[minmax(0,1fr)_repeat(4,max-content)]"
    >
      <div className="col-span-2 space-y-1 bg-white px-4 py-3 xl:col-span-1 xl:whitespace-nowrap">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium text-shamiri-black">Sessions</p>
          {hasSessions ? <Legend sessions={sessions} /> : <Note>No sessions scheduled yet</Note>}
        </div>
        <Figure
          value={<CountUp value={sessions.held} />}
          unit={
            sessions.scheduled > 0
              ? `marked attended of ${formatCount(sessions.scheduled)} scheduled`
              : "marked attended"
          }
        />
        <div className="pt-1">
          <SweepIn>
            <StateBar counts={sessions} />
          </SweepIn>
        </div>
      </div>
      <StatCell label="Fellow attendance">
        {sessions.attendanceExpected > 0 ? (
          <>
            <Figure
              value={
                <>
                  <CountUp
                    value={Math.round(
                      (sessions.attendanceRecorded / sessions.attendanceExpected) * 100,
                    )}
                  />
                  %
                </>
              }
            />
            <Note>
              {formatCount(sessions.attendanceRecorded)} of{" "}
              {formatCount(sessions.attendanceExpected)} sessions with groups
            </Note>
          </>
        ) : (
          <>
            <Figure value={<NoData />} />
            <Note>Shown once sessions with groups are marked attended</Note>
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
            <Figure value={<CountUp value={ratings.average} decimals={1} />} unit="/ 5 average" />
            <Note>from {plural(ratings.count, "weekly rating", "weekly ratings")}</Note>
          </>
        )}
      </StatCell>
      <StatCell label="Groups formed">
        <Figure value={<CountUp value={stats.groups} />} />
        <Note>
          {stats.groups > 0
            ? `${plural(stats.studentsInGroups, "student", "students")} in groups`
            : "No groups yet"}
        </Note>
      </StatCell>
      <StatCell label="Dropouts">
        <Figure value={<CountUp value={stats.droppedOutStudents} />} unit="students" />
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
              {plural(missingAttendance, "session", "sessions")} marked attended without fellow
              attendance
            </Notice>
          )}
          {allHeld && <Notice tone="done">All sessions marked attended</Notice>}
        </div>
      )}
    </section>
  );
}
