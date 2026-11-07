import { format } from "date-fns";
import { Icons } from "#/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { cn, sessionDisplayName } from "#/lib/utils";
import { DISPLAY_DATE } from "#/lib/date-utils";

type SessionAttendance = {
  attended: boolean | null;
  sessionType: string | null;
  sessionOccurred: boolean;
  absenceReason: string | null;
  absenceComments: string | null;
  sessionDate: Date;
};

const CHIP_STATUS = {
  attended: {
    label: "Attended",
    Icon: Icons.checkCircle,
    tone: "border-green-border bg-green-bg text-green-base",
  },
  missed: {
    label: "Missed",
    Icon: Icons.crossCircleFilled,
    tone: "border-red-border bg-red-bg text-red-base",
  },
  unmarked: {
    label: "Not marked",
    Icon: Icons.helpCircle,
    tone: "border-blue-border bg-blue-bg text-blue-base",
  },
  notYetOccurred: {
    label: "Not yet occurred",
    Icon: Icons.helpCircle,
    tone: "border-blue-border bg-blue-bg text-blue-base",
  },
  notScheduled: {
    label: "Not scheduled",
    Icon: Icons.minusCircle,
    tone: "border-shamiri-text-dark-grey/30 bg-white text-shamiri-text-dark-grey",
  },
};

function chipStatus(attendance: SessionAttendance | undefined) {
  if (attendance === undefined) return CHIP_STATUS.notScheduled;
  if (attendance.attended === true) return CHIP_STATUS.attended;
  if (attendance.attended === false) return CHIP_STATUS.missed;
  return attendance.sessionOccurred ? CHIP_STATUS.unmarked : CHIP_STATUS.notYetOccurred;
}

export default function SessionHistoryWidget({
  attendedSessions,
}: {
  attendedSessions: SessionAttendance[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SESSION_TYPES.filter((session) => session.type === "INTERVENTION").map((session) => {
        const attendance = attendedSessions.find(
          (attendedSession) => attendedSession.sessionType === session.name,
        );
        const sessionLabel = sessionDisplayName(session.name);
        const { label, Icon, tone } = chipStatus(attendance);

        return (
          <Popover key={session.name}>
            <PopoverTrigger
              aria-label={`${sessionLabel}: ${label}`}
              className={cn(
                "flex select-none items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[0.825rem] font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:ring-offset-2",
                tone,
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden={true} />
              {sessionLabel}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto max-w-64 p-3 text-sm text-shamiri-black"
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-shamiri-text-grey">Status</dt>
                <dd>{label}</dd>
                {attendance && (
                  <>
                    <dt className="text-shamiri-text-grey">Date</dt>
                    <dd>{format(attendance.sessionDate, DISPLAY_DATE)}</dd>
                  </>
                )}
                {attendance?.attended === false && attendance.absenceReason && (
                  <>
                    <dt className="text-shamiri-text-grey">Reason</dt>
                    <dd>{attendance.absenceReason}</dd>
                  </>
                )}
              </dl>
              {attendance?.attended === false && attendance.absenceComments && (
                <p className="mt-2 whitespace-pre-wrap rounded border bg-background-secondary px-2 py-1 text-shamiri-text-grey">
                  {attendance.absenceComments}
                </p>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
