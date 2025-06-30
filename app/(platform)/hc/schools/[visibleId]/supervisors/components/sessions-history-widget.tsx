import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { cn, sessionDisplayName } from "#/lib/utils";
import { format } from "date-fns";

export default function SessionHistoryWidget({
  attendedSessions,
}: {
  attendedSessions: {
    attended: boolean | null;
    sessionType: string | null;
    sessionOccurred: boolean;
    absenceReason: string | null;
    absenceComments: string | null;
    sessionDate: Date;
  }[];
}) {
  return (
    <div className="flex gap-2">
      {SESSION_TYPES.filter((session) => session.type === "INTERVENTION").map((session) => {
        const match = attendedSessions.find((attendance) => {
          return attendance.sessionType === session.name;
        });

        return (
          <Tooltip key={session.name}>
            <TooltipTrigger asChild={true}>
              <div
                className={cn(
                  "select-none rounded-[0.25rem] border px-1.5 py-0.5",
                  {
                    "border-green-border": match?.attended === true,
                    "border-shamiri-text-dark-grey/30": match === undefined,
                    "border-blue-border": match?.attended === null,
                    "border-red-border": match?.attended === false,
                  },
                  {
                    "bg-green-bg": match?.attended === true,
                    "bg-white": match === undefined,
                    "bg-blue-bg": match?.attended === null,
                    "bg-red-bg": match?.attended == false,
                  },
                )}
              >
                <div
                  className={cn("flex gap-1 text-[0.825rem] font-semibold", {
                    "text-green-base": match?.attended === true,
                    "text-shamiri-text-dark-grey": match === undefined,
                    "text-blue-base": match?.attended === null,
                    "text-red-base": match?.attended === false,
                  })}
                >
                  {sessionDisplayName(session.name)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent align="start" className="border bg-white text-shamiri-black shadow">
              {match?.sessionOccurred ? (
                <div className="grid grid-cols-2 gap-1">
                  <span className="opacity-70">Date: </span>
                  <span>{format(match.sessionDate, "dd/MM/yyyy")}</span>
                  <span className="opacity-70">Status: </span>
                  <span>
                    {match.attended === true
                      ? "Attended"
                      : match.attended === false
                        ? "Missed"
                        : "Unmarked"}
                  </span>
                </div>
              ) : (
                "Session has not occurred yet."
              )}
              {match && match.attended === false && (
                <div className="grid grid-cols-2 gap-1 pt-[4px]">
                  <span className="opacity-70">Reason:</span>
                  <span>{match.absenceReason}</span>
                  {match.absenceComments !== null && (
                    <span className="col-span-2 max-w-52 whitespace-pre-wrap rounded border bg-background-secondary px-2 py-1 text-shamiri-text-grey">
                      {match.absenceComments}
                    </span>
                  )}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
