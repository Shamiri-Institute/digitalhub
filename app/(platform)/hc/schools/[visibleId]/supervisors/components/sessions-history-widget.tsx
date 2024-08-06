import {
  InterventionSessionType,
  SESSION_TYPES,
} from "#/lib/app-constants/constants";
import { cn, sessionDisplayName } from "#/lib/utils";

export default function SessionHistoryWidget({
  attendedSessions,
}: {
  attendedSessions: {
    [key in InterventionSessionType]: boolean | null;
  };
}) {
  console.log(attendedSessions);
  return (
    <div className="flex gap-2">
      {SESSION_TYPES.map((session) => {
        const match = Object.keys(attendedSessions).find((key) => {
          return key === session.name;
        });

        const attended =
          attendedSessions[session.name as keyof typeof attendedSessions];

        console.log(attended);
        return (
          <div
            key={session.name}
            className={cn(
              "select-none rounded-[0.25rem] border px-1.5 py-0.5",
              {
                "border-green-border": attended === true,
                "border-shamiri-text-dark-grey/30": attended === undefined,
                "border-blue-border": attended === null,
                "border-red-border": attended === false,
              },
              {
                "bg-green-bg": attended === true,
                "bg-white": attended === undefined,
                "bg-blue-bg": attended === null,
                "bg-red-bg": attended == false,
              },
            )}
          >
            <div
              className={cn("flex gap-1 text-[0.825rem] font-semibold", {
                "text-green-base": attended === true,
                "text-shamiri-text-dark-grey": attended === undefined,
                "text-blue-base": attended === null,
                "text-red-base": attended === false,
              })}
            >
              {sessionDisplayName(session.name)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
