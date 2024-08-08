import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import {
  InterventionSessionType,
  SESSION_TYPES,
} from "#/lib/app-constants/constants";
import { cn, sessionDisplayName } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

export default function SessionHistoryWidget({
  attendedSessions,
}: {
  attendedSessions: {
    [key in InterventionSessionType]: Prisma.SupervisorAttendanceGetPayload<{
      include: {
        session: true;
      };
    }>;
  };
}) {
  return (
    <div className="flex gap-2">
      {SESSION_TYPES.map((session) => {
        const match = Object.keys(attendedSessions).find((key) => {
          return key === session.name;
        });

        const attendance =
          attendedSessions[session.name as keyof typeof attendedSessions];

        return (
          <Tooltip key={session.name}>
            <TooltipTrigger asChild={true}>
              <div
                className={cn(
                  "select-none rounded-[0.25rem] border px-1.5 py-0.5",
                  {
                    "border-green-border": attendance?.attended === true,
                    "border-shamiri-text-dark-grey/30":
                      attendance === undefined,
                    "border-blue-border": attendance?.attended === null,
                    "border-red-border": attendance?.attended === false,
                  },
                  {
                    "bg-green-bg": attendance?.attended === true,
                    "bg-white": attendance === undefined,
                    "bg-blue-bg": attendance?.attended === null,
                    "bg-red-bg": attendance?.attended == false,
                  },
                )}
              >
                <div
                  className={cn("flex gap-1 text-[0.825rem] font-semibold", {
                    "text-green-base": attendance?.attended === true,
                    "text-shamiri-text-dark-grey": attendance === undefined,
                    "text-blue-base": attendance?.attended === null,
                    "text-red-base": attendance?.attended === false,
                  })}
                >
                  {sessionDisplayName(session.name)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              className="border bg-white text-shamiri-black shadow"
            >
              {attendance ? (
                <div className="grid grid-cols-2 gap-1">
                  <span className="opacity-70">Date: </span>
                  <span>
                    {format(attendance.session.sessionDate, "dd/MM/yyyy")}
                  </span>
                  <span className="opacity-70">Status: </span>
                  <span>
                    {attendance.attended === true
                      ? "Attended"
                      : attendance.attended === false
                        ? "Missed"
                        : "Unmarked"}
                  </span>
                </div>
              ) : (
                "Session has not occurred yet."
              )}
              {attendance && attendance.attended === false && (
                <div className="grid grid-cols-2 gap-1 pt-[4px]">
                  <span className="opacity-70">Reason:</span>
                  <span>{attendance.absenceReason}</span>
                  {attendance.absenceComments !== null && (
                    <span className="col-span-2 max-w-52 whitespace-pre-wrap rounded border bg-background-secondary px-2 py-1 text-shamiri-text-grey">
                      {attendance.absenceComments}
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
