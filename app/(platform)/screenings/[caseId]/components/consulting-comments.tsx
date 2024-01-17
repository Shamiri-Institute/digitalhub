import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { ClinicalExpertCaseNotes } from "@prisma/client";

const CommentsDialogue = ({
  children,
  consultingClinicalExpert,
}: {
  children: React.ReactNode;
  consultingClinicalExpert: ClinicalExpertCaseNotes[];
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="space-y-0 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              {consultingClinicalExpert.length}{" "}
              {consultingClinicalExpert.length > 1 ? "Comments" : "Comment"}
            </span>
          </div>
        </DialogHeader>
        <div className="my-6 space-y-6">
          <div className="px-4">
            {consultingClinicalExpert.map((comment) => (
              <Comment
                key={comment.id}
                clinicalExpertName={comment.name}
                date={comment.createdAt}
                comment={comment.comment}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialogue;

function Comment({
  clinicalExpertName,
  date,
  comment,
}: {
  clinicalExpertName: string;
  date: Date;
  comment: string;
}) {
  return (
    <div>
      <h3 className="mt-1 text-sm font-medium text-brand">
        {clinicalExpertName} - {new Date(date).toLocaleDateString()}
      </h3>
      <p className="my-3 text-sm font-medium text-muted-foreground">
        {comment}
      </p>
    </div>
  );
}
