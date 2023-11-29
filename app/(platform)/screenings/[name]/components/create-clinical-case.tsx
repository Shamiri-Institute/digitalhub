"use client";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  session: z.string({
    required_error: "Please select the session to reschedule.",
  }),
  role: z.string({
    required_error: "Please select the role to invite as.",
  }),
});

export default function CreateClinicalCaseDialogue({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const formAction = () => {};

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            // onSubmit={form.handleSubmit(onSubmit)}
            action={formAction}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Create Clinical Case
                </span>
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-4">
                <FormField
                  control={form.control}
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
                                Select School
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre">Kamukunji</SelectItem>
                          <SelectItem value="S1">Alliance</SelectItem>
                          <SelectItem value="S2">Maseno</SelectItem>
                          <SelectItem value="S3">Kanjeru</SelectItem>
                          <SelectItem value="S4">Mangu</SelectItem>
                          <SelectItem value="F1">Our Lady Of Fatma</SelectItem>
                          <SelectItem value="F2">Alliance Girls</SelectItem>
                          <SelectItem value="F3">Starehe Girls</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

              <div className="px-4">
                <FormField
                  control={form.control}
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
                                Select Group
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre">GRP 1</SelectItem>
                          <SelectItem value="S1">GRP 2</SelectItem>
                          <SelectItem value="S2">GRP 3</SelectItem>
                          <SelectItem value="S3">GRP 4</SelectItem>
                          <SelectItem value="S4">GRP 5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
              <div className="px-4">
                <FormField
                  control={form.control}
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
                                Select Student
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre">John Smith</SelectItem>
                          <SelectItem value="S1">Otieno Otieno</SelectItem>
                          <SelectItem value="S2">Kamau Njoroge</SelectItem>
                          <SelectItem value="S3">William Smith</SelectItem>
                          <SelectItem value="S4">Felix Innocent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-3">
              <Button variant="brand" type="submit" className="w-full">
                Create Case
              </Button>
            </div>
            <Separator className="mb-3" />
          </form>
        </Form>
        <div className="flex justify-end px-6 pb-6">
          <Link href={"/screenings/create-student"} className="flex flex-1">
            <Button variant="brand" onClick={() => {}} className="w-full">
              Non-Shamiri Student
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
