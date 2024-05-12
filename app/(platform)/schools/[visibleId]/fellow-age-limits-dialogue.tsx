import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

export function AgeLimitConfirmationDialogue({
  open,
  setDialogOpen,
  ageValue,
  handleSubmit,
}: {
  open: boolean;
  setDialogOpen: (value: boolean) => void;
  handleSubmit: () => void;
  ageValue: number;
}) {
  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="space-y-0 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              Please confirm the fellow&rsquo;s age limit.
            </span>
          </div>
        </DialogHeader>
        <Separator />
        <div className="my-6 space-y-6">
          <div className="px-6">
            <p className="mb-5">
              The fellow age limit should be between 18 and 23 years. The
              fellow&rsquo;s age you have entered is {ageValue} years. Are you
              sure you want to continue?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleSubmit}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
