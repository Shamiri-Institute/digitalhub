"use client";

import type * as React from "react";
import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminProject } from "#/app/(platform)/layout";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { setActiveProject } from "#/lib/actions/project";
import type { SessionUser } from "#/lib/auth/session-user";
import { cn } from "#/lib/utils";

export function ProjectSwitcher({
  trigger,
  setLoading,
  user,
  projects,
  className,
}: {
  trigger: React.ReactElement;
  setLoading: (loading: boolean) => void;
  user: SessionUser | null;
  projects: AdminProject[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const activeProjectId = user?.activeProjectId ?? null;

  const handleProjectChange = toastOnError(async (project: AdminProject) => {
    if (activeProjectId === project.id) return;
    setLoading(true);
    try {
      const result = await setActiveProject(project.id);
      if (!result.success) {
        toast({ variant: "destructive", description: result.error ?? "Could not switch project." });
        return;
      }
      // A hub belongs to one project, so its page is not found in the new one.
      if (pathname.startsWith("/admin/hubs/")) {
        router.push("/admin/hubs");
      }
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={trigger} />
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <span className="px-4 pb-1 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
              switch project
            </span>
            <CommandSeparator />
            <CommandInput placeholder="Search projects..." className="h-9" />
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-scroll">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name} - ${project.visibleId}`}
                  onSelect={() => {
                    handleProjectChange(project);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-3 rounded-none border-b border-border px-3 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{project.name}</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest pt-0.5 text-primary">
                      {project.visibleId}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      activeProjectId === project.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
