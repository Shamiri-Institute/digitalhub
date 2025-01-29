import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

export default function AttendanceStatusWidget({
  attended,
}: {
  attended: boolean | null;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-[0.25rem] border px-1.5 py-0.5",
        {
          "border-green-border": attended,
          "border-red-border": !attended,
          "border-blue-border": attended === undefined || attended === null,
        },
        {
          "bg-green-bg": attended,
          "bg-red-bg": !attended,
          "bg-blue-bg": attended === undefined || attended === null,
        },
      )}
    >
      {attended === undefined || attended === null ? (
        <div className="flex items-center gap-1 text-blue-base">
          <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
          <span>Not marked</span>
        </div>
      ) : attended ? (
        <div className="flex items-center gap-1 text-green-base">
          <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
          <span>Attended</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-base">
          <Icons.crossCircleFilled className="h-3 w-3" strokeWidth={2.5} />
          <span>Missed</span>
        </div>
      )}
    </div>
  );
}
