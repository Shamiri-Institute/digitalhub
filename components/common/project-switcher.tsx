"use client";

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { setActiveProjectIdAndReload } from "#/lib/active-project-id-client";
import { fetchProjects, type ProjectOption } from "#/lib/actions/project";
import { isAdminUserByEmail } from "#/lib/actions/fetch-personnel";
import { cn } from "#/lib/utils";

export function ProjectSwitcher({
  loading,
  setLoading,
  session,
  className,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  session: Session | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const activeProjectId = session?.user?.activeProjectId ?? null;

  useEffect(() => {
    const checkIsAdminUser = async () => {
      const isAdmin = await isAdminUserByEmail(session?.user?.email ?? "");
      if (isAdmin && activeProjectId) {
        setIsAdminUser(true);
        const projectList = await fetchProjects();
        setProjects(projectList);
      }
    };
    void checkIsAdminUser();
  }, [activeProjectId, session?.user?.email]);

  if (!isAdminUser) {
    return null;
  }

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleProjectChange = (project: ProjectOption) => {
    if (activeProjectId === project.id) return;
    setLoading(true);
    setActiveProjectIdAndReload(project.id);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={open}
            className="-mt-1 w-full min-w-[200px] justify-between bg-white px-2 text-left filter disabled:pointer-events-none disabled:grayscale"
            disabled={loading}
          >
            <div className="flex flex-col items-start">
              <span className="text-base font-medium">
                {loading ? "Loading..." : (activeProject?.name ?? "Select project...")}
              </span>
            </div>
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <span className="px-4 pb-1 pt-2 text-[9px] uppercase tracking-widest text-muted-foreground">
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
                  className="flex items-center justify-between gap-3 rounded-none border-b border-gray-200 px-3 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{project.name}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest pt-0.5 text-shamiri-new-blue">
                      {project.visibleId}
                    </span>
                  </div>
                  <CheckIcon
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
