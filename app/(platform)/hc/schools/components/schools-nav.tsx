"use client";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { usePathname, useRouter } from "next/navigation";

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
