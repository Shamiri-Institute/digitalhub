import { CaretSortIcon } from "@radix-ui/react-icons";
import * as React from "react";

import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "#/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";

type ComboboxProps = {
  items: { id: string; label: string }[];
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
  placeholder?: string;
};

export function Combobox({
  items,
  activeItemId,
  onSelectItem,
  placeholder,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-md border border-zinc-200/60 bg-white px-1.5 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="base"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between px-2"
          >
            <span className="text-left text-base">
              {activeItemId
                ? items.find((item) => item.id === activeItemId)?.label
                : placeholder || "Select item..."}
            </span>
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0 md:w-64">
          <Command
            filter={(value: string, search: string) => {
              const item = items.find((item) => item.id === value);
              if (!item) return 0;

              if (item.label.toLowerCase().includes(search.toLowerCase())) {
                return 1;
              }
              return 0;
            }}
          >
            <CommandInput
              placeholder={placeholder || "Search items..."}
              className="h-9"
            />
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={async (_currentValue) => {
                    onSelectItem(item.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate text-ellipsis text-sm">
                    {item.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
