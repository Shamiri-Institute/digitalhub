"use client";

import CommentsDialogue from "#/app/(platform)/screenings/[name]/components/consulting-comments";
import { inviteUserToImplementer } from "#/app/actions";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
// @ts-expect-error
import { experimental_useFormState as useFormState } from "react-dom";

const FormSchema = z.object({
  session: z.string({
    required_error: "Please select the session to reschedule.",
  }),
  role: z.string({
    required_error: "Please select the role to invite as.",
  }),
});

const initialState = {
  message: null,
};

export default function ConsultingClinicalExpert() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  const [state, formAction] = useFormState(
    inviteUserToImplementer,
    initialState,
  );

  return (
    <div className="mt-2">
      <Form {...form}>
        <form
          // onSubmit={form.handleSubmit(onSubmit)}
          // action={formAction}
          className="overflow-hidden text-ellipsis"
        >
          <div className="my-6 space-y-6">
            <div className="px-4">
              <FormField
                // control={form.control}
                name="session"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Select
                      name="session"
                      // defaultValue={fellow?.gender || field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue
                          className="text-muted-foreground"
                          // defaultValue={fellow?.gender || field.value}
                          onChange={field.onChange}
                          placeholder={
                            <span className="text-muted-foreground">
                              Clinical expert name
                            </span>
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DrW">Dr Wasanga</SelectItem>
                        <SelectItem value="Exp 2">Expert 2</SelectItem>
                        <SelectItem value="Exp 3">Expert 3</SelectItem>
                        <SelectItem value="Exp 4">Expert 4</SelectItem>
                        <SelectItem value="Exp 5">Expert 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <div className="px-4">
              <FormField
                // control={form.control}
                name="session"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Textarea
                      id="reason"
                      name="reason"
                      //   onChange={(event) => setReason(event.target.value)}
                      //   defaultValue={reason}
                      placeholder="Write in any consulting notes, especially the reason why this clinical expert needs to be involved in this case..."
                      className="mt-1.5 resize-none bg-card"
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div className="flex justify-end px-6 pb-6">
            <Button variant="brand" type="submit" className="w-full">
              Save Consulting Note
            </Button>
          </div>
          {/* {comments.length > 3 && <button className="mt-4 w-full text-xs text-shamiri-blue" onClick={() => setShowMore((showMore) => !showMore)}>
                            {showMore ? 'Show Less' : 'Show More'}
                        </button>
                        } */}
          <CommentsDialogue>
            <button
              className="mt-4 w-full text-xs text-shamiri-blue"
              // onClick={() => setShowMore((showMore) => !showMore)}
              // onClick={(e) => {
              // e.preventDefault();
              // setDialogOpen(true);
              // }}
            >
              READ 5 COMMENTS
            </button>
          </CommentsDialogue>
          <p aria-live="polite" className="sr-only" role="status">
            {/* {state?.message} */}
          </p>
        </form>
      </Form>
    </div>
  );
}
