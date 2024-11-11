"use client";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { usePathname, useRouter } from "next/navigation";

type TabType = {
  name: string;
  href: string;
};

export default function SchoolReportsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const options: TabType[] = [
    { name: "Session", href: `/hc/reporting/school-reports/session` },
    {
      name: "School Feedback",
      href: `/hc/reporting/school-reports/school-feedback`,
    },
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
