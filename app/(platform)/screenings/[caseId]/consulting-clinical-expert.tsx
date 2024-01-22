"use client";

import CommentsDialogue from "#/app/(platform)/screenings/[caseId]/components/consulting-comments";
import { supConsultClinicalexpert } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClinicalExpertCaseNotes, ClinicalScreeningInfo } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  clinicalExpert: z.string({
    required_error: "Please select the clinical expert.",
  }),
  clincalNotes: z.string({
    required_error: "Please enter the clinical notes.",
  }),
});

type CurrentCase = ClinicalScreeningInfo & {
  consultingClinicalExpert: ClinicalExpertCaseNotes[];
};

export default function ConsultingClinicalExpertComments({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (data.clincalNotes == "" || data.clinicalExpert == "") {
      toast({
        variant: "destructive",
        title: "Please fill in all the fields",
      });
      return;
    }

    try {
      const response = await supConsultClinicalexpert({
        caseId: currentcase.id,
        name: data.clinicalExpert,
        comment: data.clincalNotes,
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Submission error",
        });
        return;
      }

      toast({
        variant: "default",
        title: "Consulting clinical expert sent successfully",
      });

      form.reset();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="mt-2">
      <Form {...form}>
        <form
          id="submitConsultingExpert"
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error({ errors });
          })}
          className="overflow-hidden text-ellipsis px-1"
        >
          <div className="my-6 space-y-6">
            <div className="px-4">
              <FormField
                control={form.control}
                name="clinicalExpert"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Select
                      name="clinicalExpert"
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue
                          className="text-muted-foreground"
                          defaultValue={field.value}
                          onChange={field.onChange}
                          placeholder={
                            <span className="text-muted-foreground">
                              Clinical expert name
                            </span>
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Shamiri Clinical Experts">
                          Shamiri Clinical Experts
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <div className="px-4">
              <FormField
                control={form.control}
                name="clincalNotes"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Textarea
                      id="clincalNotes"
                      className="mt-1.5 resize-none bg-card"
                      placeholder="Write referral notes here..."
                      data-1p-ignore="true"
                      {...field}
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div className="flex justify-end px-6 pb-6">
            <Button
              variant="brand"
              type="submit"
              className="w-full"
              form="submitConsultingExpert"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Consulting Note
            </Button>
          </div>
        </form>
      </Form>
      <CommentsDialogue
        consultingClinicalExpert={currentcase.consultingClinicalExpert}
      >
        <button className="mt-4 w-full text-xs text-shamiri-blue">
          READ {currentcase.consultingClinicalExpert.length} COMMENTS
        </button>
      </CommentsDialogue>
    </div>
  );
}
