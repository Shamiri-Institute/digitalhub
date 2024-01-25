import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
import Link from "next/link";

export default function SessionLink({
  assigned,
  schoolID,
}: {
  assigned: boolean | undefined;
  schoolID: string;
}) {

  return (
    <Link href={`/schools/session-report/${schoolID}?type=s0`}>
      <Icons.paperFileText
        className={cn("h-7 w-7", {
          "text-shamiri-light-blue": assigned,
        })}
      />
    </Link>
  );
}
