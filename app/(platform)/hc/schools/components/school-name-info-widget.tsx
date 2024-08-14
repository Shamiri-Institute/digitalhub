import { Icons } from "#/components/icons";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Separator } from "#/components/ui/separator";

export default function SchoolNameInfoWidget({
  schoolName,
  separator = true,
}: {
  schoolName?: string;
  separator?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="primary">
        <AlertTitle className="flex items-center gap-3">
          <Icons.info className="h-4 w-4 shrink-0 text-shamiri-new-blue" />
          <span className="text-base">{schoolName}</span>
        </AlertTitle>
      </Alert>
      {separator && <Separator />}
    </div>
  );
}
