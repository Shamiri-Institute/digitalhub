import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

export default function AttendanceStatusWidget({ attended }: { attended: boolean | null }) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border px-1.5 py-0.5",
        {
          "border-success-border": attended,
          "border-destructive-border": !attended,
          "border-info-border": attended === undefined || attended === null,
        },
        {
          "bg-success-bg": attended,
          "bg-destructive-bg": !attended,
          "bg-info-bg": attended === undefined || attended === null,
        },
      )}
    >
      {attended === undefined || attended === null ? (
        <div className="flex items-center gap-1 text-info">
          <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
          <span>Not marked</span>
        </div>
      ) : attended ? (
        <div className="flex items-center gap-1 text-success">
          <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
          <span>Attended</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-destructive">
          <Icons.crossCircleFilled className="h-3 w-3" strokeWidth={2.5} />
          <span>Missed</span>
        </div>
      )}
    </div>
  );
}
