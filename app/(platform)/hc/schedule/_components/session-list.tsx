import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

import type { Session } from "./schedule-calendar";

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return null;
  }
  if (sessions.length === 1) {
    const [session] = sessions;
    return session && <SessionDetail session={session} />;
  }
  // TODO: Show 2 smaller details and + N more for third spot. Max 3 spots.
  return <div></div>;
}

function SessionDetail({ session }: { session: Session }) {
  const schoolName = session.school.schoolName;
  const durationLabel = "2:30 - 3:00PM";
  const completed = session.sessionDate < new Date();

  return (
    <div
      className={cn(
        "px-2 py-1",
        "rounded-[0.25rem] border",
        {
          "border-green-border": completed,
          "border-blue-border": !completed,
        },
        {
          "bg-green-bg": completed,
          "bg-blue-bg": !completed,
        },
      )}
    >
      <div
        className={cn("text-sm font-semibold", {
          "text-green-base": completed,
          "text-blue-base": !completed,
        })}
      >
        <div className="flex items-center gap-1">
          <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
          <div>{sessionDisplayName(session.sessionType)}</div>
        </div>
        <div>{schoolName}</div>
        <div>{durationLabel}</div>
      </div>
    </div>
  );
}

// function SessionList({
//   sessions,
// }: {
//   sessions: Prisma.InterventionSessionGetPayload<{}>[];
// }) {
//   if (sessions.length === 0) {
//     return null;
//   }
//   return (
//     <Popover>
//       <PopoverTrigger>
//         {sessions.map((sess) => (
//           <div key={sess.id}>{sess.sessionName}</div>
//         ))}
//       </PopoverTrigger>
//       <PopoverContent className="w-full max-w-xs">
//         <input />
//         <button onClick={() => console.log("button clicked")}>Click me</button>
//       </PopoverContent>
//     </Popover>
//   );
// }
