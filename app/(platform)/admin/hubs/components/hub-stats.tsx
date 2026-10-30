import {
  CalendarCheck,
  ClipboardCheck,
  Layers,
  type LucideIcon,
  Star,
  UserMinus,
} from "lucide-react";
import type React from "react";

import { cn } from "#/lib/utils";
import type { HubStats as HubStatsData } from "../queries";

const formatCount = (n: number) => n.toLocaleString("en-US");

function StatCell({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex gap-4 bg-white p-5", className)}>
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-bg text-shamiri-new-blue xl:flex">
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <div className="min-w-0 grow space-y-1">
        <p className="text-sm font-medium text-shamiri-black">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Figure({ value, unit }: { value: string; unit?: string }) {
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

function SessionsBar({ held, upcoming, cancelled }: HubStatsData["sessions"]) {
  const total = held + upcoming + cancelled;
  const segments = [
    { count: held, label: "held", fill: "fill-green-base", swatch: "bg-green-base" },
    { count: upcoming, label: "upcoming", fill: "fill-blue-base", swatch: "bg-blue-base" },
    { count: cancelled, label: "cancelled", fill: "fill-red-base", swatch: "bg-red-base" },
  ];
  let offset = 0;

  return (
    <div className="space-y-2 pt-1">
      <svg aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-shamiri-light-grey">
        {total > 0 &&
          segments.map((s) => {
            const x = offset;
            offset += (s.count / total) * 100;
            return (
              <rect
                key={s.label}
                x={`${x}%`}
                width={`${(s.count / total) * 100}%`}
                height="100%"
                className={s.fill}
              />
            );
          })}
      </svg>
      {total > 0 ? (
        <ul
          aria-hidden
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-shamiri-text-dark-grey"
        >
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", s.swatch)} />
              {formatCount(s.count)} {s.label}
            </li>
          ))}
        </ul>
      ) : (
        <Note>No sessions scheduled yet</Note>
      )}
    </div>
  );
}

export default function HubStats({ stats }: { stats: HubStatsData }) {
  const { sessions, ratings } = stats;

  return (
    <section
      aria-label="Hub stats"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-[2fr_repeat(4,minmax(0,1fr))]"
    >
      <StatCell icon={CalendarCheck} label="Sessions" className="col-span-2 xl:col-span-1">
        <Figure
          value={formatCount(sessions.held)}
          unit={
            sessions.scheduled > 0 ? `held of ${formatCount(sessions.scheduled)} scheduled` : "held"
          }
        />
        <SessionsBar {...sessions} />
      </StatCell>
      <StatCell icon={ClipboardCheck} label="Attendance recorded">
        {sessions.held > 0 ? (
          <>
            <Figure value={`${Math.round((sessions.attendanceRecorded / sessions.held) * 100)}%`} />
            <Note>
              {formatCount(sessions.attendanceRecorded)} of {formatCount(sessions.held)} held
              sessions
            </Note>
          </>
        ) : (
          <>
            <Figure value="–" />
            <Note>Shown once sessions are held</Note>
          </>
        )}
      </StatCell>
      <StatCell icon={Star} label="Fellow rating">
        {ratings.average === null ? (
          <>
            <Figure value="–" />
            <Note>No weekly ratings yet</Note>
          </>
        ) : (
          <>
            <Figure value={ratings.average.toFixed(1)} unit="/ 5 average" />
            <Note>
              from {formatCount(ratings.count)} weekly {ratings.count === 1 ? "rating" : "ratings"}
            </Note>
          </>
        )}
      </StatCell>
      <StatCell icon={Layers} label="Groups formed">
        <Figure value={formatCount(stats.groups)} />
        <Note>
          {stats.groups > 0
            ? `${formatCount(stats.studentsInGroups)} students in groups`
            : "No groups yet"}
        </Note>
      </StatCell>
      <StatCell icon={UserMinus} label="Dropouts">
        <Figure value={formatCount(stats.droppedOutStudents)} unit="students" />
        <Note>and {formatCount(stats.droppedOutFellows)} fellows</Note>
      </StatCell>
    </section>
  );
}
