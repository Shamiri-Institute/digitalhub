"use client";

import { AddNoteDialog } from "#/app/(platform)/profile/school-report/session/add-note-dialogue";
import { Button } from "#/components/ui/button";

export function SessionNotes() {
  return (
    <div className="flex flex-col">
      <div className="mt-4 flex items-center justify-between pl-2 pr-8">
        <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
          Added Notes
        </h3>
      </div>
      <div className="my-4 flex pl-2 pr-8">
        <div>
          <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
            Supervisor Name
          </h3>
        </div>

        <div>
          <p className="ml-6 mt-4 text-sm font-normal text-brand">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet
            veniam autem pariatur? Placeat dolorem laborum, facilis error
            distinctio ea in optio libero quidem dicta voluptates quia,
            consequuntur sed saepe blanditiis?
          </p>
          <div className="mt-5  flex items-center justify-center">
            <p className="text-brand-light-gray text-xs font-normal">
              March 20
            </p>
            <div className="mx-2 h-6 w-0.5 bg-border/50 " />
            <p className="text-brand-light-gray text-xs font-normal ">4:18pm</p>
          </div>

          <AddNoteDialog>
            <Button
              type="submit"
              className="mt-4 w-full bg-shamiri-blue hover:bg-brand"
            >
              Add Note
            </Button>
          </AddNoteDialog>
        </div>
      </div>
    </div>
  );
}
