"use client";

import { CaretSortIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
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
import { fetchAdminUsers } from "#/lib/actions/admin";
import { fetchClinicalLeads } from "#/lib/actions/clinical-lead";
import { fetchHubCoordinators } from "#/lib/actions/hub-coordinator";
import { cn } from "#/lib/utils";
import type { ActionResponse } from "#/types/actions.types";
import type {
  SearchableUserRole,
  UserSearchResult,
} from "#/types/user-search.types";

interface RoleConfig {
  fetch: (
    hubId: string | undefined,
    query: string,
  ) => Promise<ActionResponse<UserSearchResult[]>>;
  requiresHub: boolean;
  triggerLabel: string;
  noun: string;
  emptyNoun: string;
}

const ROLE_CONFIG: Record<SearchableUserRole, RoleConfig> = {
  ADMIN: {
    fetch: (_hubId, query) => fetchAdminUsers(query),
    requiresHub: false,
    triggerLabel: "Select admin",
    noun: "admins",
    emptyNoun: "admins",
  },
  HUB_COORDINATOR: {
    fetch: (hubId, query) => fetchHubCoordinators(hubId ?? "", query),
    requiresHub: true,
    triggerLabel: "Select hub coordinator",
    noun: "coordinators",
    emptyNoun: "hub coordinators",
  },
  CLINICAL_LEAD: {
    fetch: (hubId, query) => fetchClinicalLeads(hubId ?? "", query),
    requiresHub: true,
    triggerLabel: "Select clinical lead",
    noun: "clinical leads",
    emptyNoun: "clinical leads",
  },
};

interface UserSearcherProps {
  role: SearchableUserRole;
  onSelect: (user: UserSearchResult) => void;
  hubId?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  selectedLabel?: string;
}

export function UserSearcher({
  role,
  onSelect,
  hubId,
  disabled,
  id,
  invalid,
  selectedLabel,
}: UserSearcherProps) {
  const config = ROLE_CONFIG[role];
  const hubGated = config.requiresHub && !hubId;

  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (hubGated) return;
    let active = true;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const result = await config.fetch(hubId, query);
        if (!active) return;
        if (result.success && result.data) {
          setUsers(result.data);
        } else {
          setUsers([]);
          setError(true);
        }
      } catch (err) {
        console.error(`Failed to fetch ${config.noun}:`, err);
        if (active) {
          setUsers([]);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [role, hubId, query, hubGated, config]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between bg-white"
          disabled={disabled || hubGated}
        >
          <span
            className={cn(
              "truncate",
              !selectedLabel && "text-muted-foreground",
            )}
          >
            {selectedLabel ?? config.triggerLabel}
          </span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-[240px] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${config.noun}...`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandEmpty>
            {loading
              ? `Loading ${config.noun}...`
              : error
                ? `Couldn't load ${config.noun}. Please try again.`
                : `No eligible ${config.emptyNoun} found.`}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.id}
                onSelect={() => {
                  onSelect(user);
                  setOpen(false);
                }}
                className="flex items-center justify-between gap-3 rounded-none border-b px-3 py-2 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                  {user.visibleId && (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {user.visibleId}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
