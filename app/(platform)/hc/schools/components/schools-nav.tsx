"use client";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TabType = {
  name: string;
  href: string;
};

export default function SchoolsNav({ visibleId }: { visibleId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const options: TabType[] = [
    { name: "Sessions", href: `/hc/schools/${visibleId}/sessions` },
    { name: "Supervisors", href: `/hc/schools/${visibleId}/supervisors` },
    { name: "Fellows", href: `/hc/schools/${visibleId}/fellows` },
    { name: "Students", href: `/hc/schools/${visibleId}/students` },
    { name: "Files", href: `/hc/schools/${visibleId}/files` },
  ];
  const initialTab = options.find((tab: TabType) => tab.href === pathname);
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab ?? options[1]!,
  );

  useEffect(() => {
    router.push(activeTab.href);
  }, [activeTab, router]);

  return (
    <div className="flex">
      <ToggleGroup
        type="single"
        className="form-toggle"
        defaultValue={activeTab.name}
        onValueChange={(value) => {
          const option = options.find((x) => x.name === value);
          if (value && option) setActiveTab(option);
        }}
      >
        {options.map((option) => {
          return (
            <ToggleGroupItem
              key={option.name}
              value={option.name}
              aria-label={`Select ${option.name}`}
              className="form-toggle-button"
            >
              {option.name}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
