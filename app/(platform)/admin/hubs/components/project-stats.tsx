import { type AdminHub, withScheduled } from "../queries";
import { Figure, formatCount, Note, SessionsStat, StatCell } from "./hub-stats";

const sum = (hubs: AdminHub[], count: (hub: AdminHub) => number) =>
  hubs.reduce((total, hub) => total + count(hub), 0);

export default function ProjectStats({ hubs }: { hubs: AdminHub[] }) {
  const sessionsOf = (key: "held" | "unmarked" | "upcoming" | "cancelled") =>
    sum(hubs, (hub) => hub.sessions[key]);

  return (
    <section
      aria-label="Project stats"
      className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,3fr)]"
    >
      <StatCell label="Schools">
        <Figure value={formatCount(sum(hubs, (hub) => hub.schoolsCount))} />
        <Note>in {hubs.length === 1 ? "1 hub" : `${formatCount(hubs.length)} hubs`}</Note>
      </StatCell>
      <StatCell label="Students">
        <Figure value={formatCount(sum(hubs, (hub) => hub.studentsCount))} />
        <Note>enrolled</Note>
      </StatCell>
      <StatCell label="Fellows">
        <Figure value={formatCount(sum(hubs, (hub) => hub.fellowsCount))} />
        <Note>active</Note>
      </StatCell>
      <SessionsStat
        className="col-span-3 xl:col-span-1"
        sessions={withScheduled({
          held: sessionsOf("held"),
          unmarked: sessionsOf("unmarked"),
          upcoming: sessionsOf("upcoming"),
          cancelled: sessionsOf("cancelled"),
        })}
      />
    </section>
  );
}
