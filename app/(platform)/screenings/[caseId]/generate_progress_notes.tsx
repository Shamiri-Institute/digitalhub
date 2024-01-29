import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { createSupProgressNoteToGDriveAndSaveOnDb } from "#/commands/google-drive-actions";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import Link from "next/link";

export function GenerateProgressNotes({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {
  const { toast } = useToast();

  const handleFileGeneration = async () => {
    if (
      !currentcase.currentSupervisor ||
      !currentcase.currentSupervisor.supervisorEmail ||
      !currentcase.currentSupervisor.supervisorName
    ) {
      toast({
        variant: "destructive",
        title: "Error creating case. No supervisor found.",
      });
      return;
    }

    try {
      await createSupProgressNoteToGDriveAndSaveOnDb({
        caseId: currentcase.id,
        studentId: currentcase.student.id,
        supervisorEmail: currentcase?.currentSupervisor?.supervisorEmail,
        supervisorName: currentcase?.currentSupervisor?.supervisorName,
      });

      toast({
        variant: "default",
        title: "Progress Notes Generated Successfully",
      });

      window.location.href = `/screenings/${currentcase.id}`;
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      {currentcase.progressNotes ? (
        <div>
          <p className="text-sm text-gray-500">Progress Notes Link</p>
          <Link
            href={currentcase.progressNotes ?? "#"}
            target="_blank"
            className="hover:bg-shamiri-brand w-full rounded-sm  py-2 text-brand underline"
          >
            {currentcase.progressNotes}
          </Link>
        </div>
      ) : (
        <Button
          className="hover:bg-shamiri-brand w-full rounded-sm bg-shamiri-blue px-3 py-2 text-white"
          onClick={handleFileGeneration}
        >
          <Icons.upload className="mr-2 h-4 w-4" />
          Generate File
        </Button>
      )}
    </div>
  );
}
