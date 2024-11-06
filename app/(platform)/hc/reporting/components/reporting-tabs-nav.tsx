"use client";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { usePathname, useRouter } from "next/navigation";

type TabType = {
  name: string;
  href: string;
};

export default function ReportingTabNav() {
  const pathname = usePathname();
  const router = useRouter();
  const options: TabType[] = [
    { name: "Fellows", href: `/hc/reporting/fellows` },
    { name: "Supervisors", href: `/hc/reporting/supervisors` },
    { name: "Payout history", href: `/hc/reporting/payout-history` },
    { name: "Complaints", href: `/hc/reporting/complaints` },
  ];

  return (
    <div className="flex">
      <ToggleGroup
        type="single"
        className="form-toggle"
        defaultValue={options.find((tab) => tab.href === pathname)?.name}
        onValueChange={(value) => {
          if (value) {
            const tab = options.find((tab) => tab.name === value);
            router.push(tab!.href);
          }
        }}
      >
        {options.map((option) => {
          return (
            <ToggleGroupItem
              key={option.name}
              value={option.name}
              aria-label={`Select ${option.name}`}
              className="form-toggle-button text-nowrap"
            >
              {option.name}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
