"use client";

import type { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { Button } from "#/components/ui/button";
import { AddNoteDialog } from "./add-note-dialogue";

export function SessionNotes({
  revalidatePath,
  supervisorId,
  sessionId,
  notes,
}: {
  revalidatePath: string;
  supervisorId: string;
  sessionId: string;
  notes: Prisma.InterventionSessionNoteGetPayload<{
    include: { supervisor: true };
  }>[];
}) {
  return (
    <div className="mb-12 flex flex-col">
      <div className="mt-4 flex items-center justify-between pl-2 pr-8">
        <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
          Added Notes
        </h3>
      </div>

      {notes.length === 0 && (
        <div className="text-center">
          <p className="my-4 ml-6 text-sm font-normal text-brand">
            No notes added yet.
          </p>
        </div>
      )}
      {notes.length > 0 &&
        notes.map((note) => {
          return (
            <div
              key={note.id}
              className="my-4 grid grid-cols-[3fr,7fr] gap-2 pl-2 pr-8"
            >
              <div>
                <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
                  {note.supervisor.supervisorName}
                </h3>
              </div>

              <div>
                <p className="mt-4 text-sm font-normal text-brand">
                  {note.content}
                </p>
                <div className="mt-5 flex gap-1.5">
                  <p className="text-brand-light-gray text-xs font-normal">
                    {formatInTimeZone(
                      note.createdAt,
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                      "MMMM d",
                    )}
                  </p>
                  <div className="mx-2 h-6 w-0.5 bg-border/50 " />
                  <p className="text-brand-light-gray text-xs font-normal">
                    {formatInTimeZone(
                      note.createdAt,
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                      "h:mm a",
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

      <div className="mx-6">
        <AddNoteDialog
          revalidatePath={revalidatePath}
          supervisorId={supervisorId}
          sessionId={sessionId}
        >
          <Button
            type="submit"
            className="mt-4 w-full bg-shamiri-blue hover:bg-brand"
          >
            Add Note
          </Button>
        </AddNoteDialog>
      </div>
    </div>
  );
}
