import { ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

type ComboboxProps = {
  items: { id: string; label: string }[];
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
  placeholder?: string;
  inputPlaceholder?: string;
  disabled?: boolean;
  className?: string;
};

export function Combobox({
  items,
  activeItemId,
  onSelectItem,
  placeholder,
  inputPlaceholder,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("rounded-md border border-input bg-white px-1.5 py-0", className)}>
      <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <PopoverTrigger asChild>
          <Button
            variant="base"
            aria-expanded={open}
            className="w-full justify-between px-1.5"
            disabled={disabled}
          >
            <span className="text-left text-sm">
              {activeItemId
                ? items.find((item) => item.id === activeItemId)?.label
                : placeholder || "Select item..."}
            </span>
            <ChevronsUpDown className="ml-1.5 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command
            filter={(value: string, search: string) => {
              const item = items.find((item) => item.id.toLowerCase() === value.toLowerCase());
              if (!item) return 0;

              if (item.label.toLowerCase().includes(search.toLowerCase())) {
                return 1;
              }
              return 0;
            }}
          >
            <CommandInput
              placeholder={inputPlaceholder || "Type to filter results"}
              className="h-9"
            />
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup className="max-h-48 overflow-y-scroll">
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={async (_currentValue) => {
                    onSelectItem(item.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate text-ellipsis text-sm">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
