"use client";
import { cn } from "#/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SchoolsNav({ visibleId }: { visibleId: string }) {
  const pathname = usePathname();
  const options = [
    { name: "Sessions", href: `/hc/schools/${visibleId}/sessions` },
    { name: "Supervisors", href: `/hc/schools/${visibleId}/supervisors` },
    { name: "Fellows", href: `/hc/schools/${visibleId}/fellows` },
    { name: "Students", href: `/hc/schools/${visibleId}/students` },
  ];

  return (
    <div className="flex max-w-fit gap-x-2 rounded-lg border-shamiri-light-grey bg-background-secondary text-base font-semibold leading-6">
      {options.map((option) => (
        <Link
          href={option.href}
          className={cn(
            "px-3 py-2",
            pathname.includes(option.name.toLowerCase()) &&
              "shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3), 0_1px_3px_0px_rgba(0,0,0,0.10), 0_2px_1px_0px_rgba(0,0,0,0.06), 0_1px_1px_0px_rgba(0,0,0,0.08)] rounded-[6px] bg-white",
          )}
        >
          {option.name}
        </Link>
      ))}
    </div>
  );
}
