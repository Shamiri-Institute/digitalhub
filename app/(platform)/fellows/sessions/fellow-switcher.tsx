import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";

import { FellowsInHub } from "#/app/(platform)/fellows/sessions/session-history";
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
import { cn } from "#/lib/utils";

export function FellowSwitcher({
  fellowVisibleId,
  setFellowVisibleId,
  fellows,
}: {
  fellowVisibleId: string | null;
  setFellowVisibleId: (fid: string) => void;
  fellows: FellowsInHub;
}) {
  const [open, setOpen] = React.useState(false);

  const onSelectFellow = async (visibleId: string) => {
    setFellowVisibleId(visibleId);
  };

  const selectedFellow =
    fellows.find((fellow) => fellow.visibleId === fellowVisibleId) || null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between px-2"
          >
            {selectedFellow ? (
              <span className="truncate text-left">
                {selectedFellow.fellowName} — {selectedFellow.visibleId}
              </span>
            ) : (
              <span className="text-left">Select Fellow</span>
            )}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0 md:w-64">
          <Command
            filter={(value: string, search: string) => {
              const fellow = fellows.find(
                (fellow) => fellow.visibleId.toLowerCase() === value, // useQueryState lowercases the url value
              );
              if (!fellow) return 0;

              const fellowName = fellow?.fellowName?.toLowerCase() ?? "";
              const fellowVisibleId = fellow?.visibleId?.toLowerCase() ?? "";

              const searchHit =
                fellowName.includes(search.toLowerCase()) ||
                fellowVisibleId.includes(search.toLowerCase());

              if (searchHit) {
                return 1;
              }
              return 0;
            }}
          >
            <CommandInput placeholder="Find fellows..." className="h-9" />
            <CommandEmpty>No fellow found.</CommandEmpty>
            <CommandGroup>
              {fellows.map((fellow) => (
                <CommandItem
                  key={fellow.visibleId}
                  value={fellow.visibleId}
                  onSelect={async (_) => {
                    onSelectFellow(fellow.visibleId);
                    setOpen(false);
                  }}
                >
                  <div className="truncate text-ellipsis text-sm">
                    {fellow.fellowName} — {fellow.visibleId}
                  </div>
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      fellowVisibleId === fellow.visibleId
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
