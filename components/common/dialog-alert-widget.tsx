import { Icons } from "#/components/icons";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Separator } from "#/components/ui/separator";

export default function DialogAlertWidget({
  label,
  separator = true,
  children,
  variant = "info",
}: {
  label?: string | null;
  separator?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "info" | null;
}) {
  return (
    <div className="space-y-4">
      <Alert variant={variant}>
        <AlertTitle className="flex items-center gap-3">
          {variant === "info" ? <Icons.info className="h-4 w-4 shrink-0 text-primary" /> : null}
          {variant === "destructive" ? (
            <Icons.info className="h-4 w-4 shrink-0 rounded-full bg-destructive text-white" />
          ) : null}
          <div className="text-base">{label ?? children}</div>
        </AlertTitle>
      </Alert>
      {separator && <Separator />}
    </div>
  );
}
