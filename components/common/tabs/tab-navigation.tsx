"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

export type TabType = {
  name: string;
  href: string;
};

export default function TabToggleNavigation({ options = [] }: { options: TabType[] }) {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = options.find((tab) => tab.href === pathname) || options[0];

  useEffect(() => {
    if (!options.find((tab) => tab.href === pathname) && options.length > 0) {
      router.push(options[0]!.href);
    }
  }, [pathname, options, router]);

  return (
    <div className="container flex">
      <ToggleGroup
        type="single"
        className="form-toggle"
        defaultValue={currentTab!.name}
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
