import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { createSupProgressNoteToGDriveAndSaveOnDb } from "#/commands/google-drive-actions";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function GenerateProgressNotes({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      await createSupProgressNoteToGDriveAndSaveOnDb({
        caseId: currentcase.id,
        studentId: currentcase.student.id,
        // supervisorEmail: currentcase?.currentSupervisor?.supervisorEmail,
        supervisorEmail: 'benny@shamiri.institute',
        supervisorName: currentcase?.currentSupervisor?.supervisorName,
      });

      toast({
        variant: "default",
        title: "Progress Notes Generated Successfully",
      });

      window.location.href = `/screenings/${currentcase.id}`;
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
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
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? (
            "Generating file..."
          ) : (
            <>
              <Icons.upload className="mr-2 h-4 w-4" />
              Generate File
            </>
          )}
        </Button>
      )}
    </div>
  );
}
