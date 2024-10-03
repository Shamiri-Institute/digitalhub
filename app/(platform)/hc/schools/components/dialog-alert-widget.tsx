import { Icons } from "#/components/icons";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Separator } from "#/components/ui/separator";

export default function DialogAlertWidget({
  label,
  separator = true,
  children,
  variant = "primary",
}: {
  label?: string | null;
  separator?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "primary" | null;
}) {
  return (
    <div className="space-y-4">
      <Alert variant={variant}>
        <AlertTitle className="flex items-center gap-3">
          {variant === "primary" ? (
            <Icons.info className="h-4 w-4 shrink-0 text-shamiri-new-blue" />
          ) : null}
          {variant === "destructive" ? (
            <Icons.info className="h-4 w-4 shrink-0 rounded-full bg-shamiri-light-red text-white" />
          ) : null}
          <div className="text-base">{label ?? children}</div>
        </AlertTitle>
      </Alert>
      {separator && <Separator />}
    </div>
  );
}
