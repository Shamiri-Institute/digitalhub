import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

import type { Session } from "./schedule-calendar";

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return null;
  }
  if (sessions.length === 1) {
    const [session] = sessions;
    return session && <SessionDetail session={session} layout="expanded" />;
  }

  const restCount = sessions.length - 2;
  return (
    <div className="flex flex-col gap-2">
      <SessionDetail session={sessions[0]!} layout="compact" />
      <SessionDetail session={sessions[1]!} layout="compact" />
      {restCount > 0 && (
        <div className="text-sm font-semibold text-grey-c3">
          + {restCount} more
        </div>
      )}
    </div>
  );
}

function SessionDetail({
  session,
  layout,
}: {
  session: Session;
  layout: "compact" | "expanded";
}) {
  const startTimeLabel = "2:30PM";
  const durationLabel = "2:30 - 3:00PM";

  const schoolName = session.school.schoolName;
  const completed = session.sessionDate < new Date();

  const isCompact = layout === "compact";
  const isExpanded = layout === "expanded";

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
          {completed && (
            <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
          )}
          {!completed && (
            <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
          )}
          {isExpanded && <div>{sessionDisplayName(session.sessionType)}</div>}
          {isCompact && (
            <div>
              {session.sessionName} - {startTimeLabel}
            </div>
          )}
        </div>
        {isExpanded && (
          <>
            <div>{schoolName}</div>
            <div>{durationLabel}</div>
          </>
        )}
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
