"use client";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DropoutSchoolSchema } from "../schemas";

export function DropoutSchool({
  children,
  schoolId,
  schoolName,
}: {
  children: React.ReactNode;
  schoolId?: string;
  schoolName?: string;
}) {
  const form = useForm<z.infer<typeof DropoutSchoolSchema>>({
    resolver: zodResolver(DropoutSchoolSchema),
    defaultValues: {
      schoolId,
      dropoutReason: "",
    },
  });

  const [formDialogOpen, setFormDialogOpen] = React.useState<boolean>(false);
  const [confirmDialogOpen, setConfirmDialogOpen] =
    React.useState<boolean>(false);

  return (
    <Form {...form}>
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="p-5">
          <DialogHeader>
            <h2>Drop out school</h2>
            <Alert variant="primary">
              <AlertTitle className="flex items-center gap-2">
                <InfoIcon />
                {schoolName}
              </AlertTitle>
            </Alert>
          </DialogHeader>
          <Separator />
          <div className="space-y-2">
            <h3></h3>
            <FormField
              control={form.control}
              name="dropoutReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Select reason{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dropout reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Lack of understanding of program and timelines">
                        Lack of understanding of program and timelines
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>Select options go here with the form field</div>
          </div>
          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setFormDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (form.formState.isValid) {
                  setFormDialogOpen(false);
                  setConfirmDialogOpen(true);
                } else {
                  form.trigger();
                }
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="p-5">
          <DialogHeader>
            <h2>Confirm drop out</h2>
            <Alert variant="primary">
              <AlertTitle className="flex items-center gap-2">
                <InfoIcon />
                {schoolName}
              </AlertTitle>
            </Alert>
          </DialogHeader>
          <div className="space-y-4">
            <h3>Are you sure?</h3>
            <Alert variant="destructive">
              <AlertTitle className="flex gap-2">
                <InfoIcon />
                Once this change has been made it is irreversible and will need
                you to contact support in order to modify. Please be sure of
                your action before you confirm.
              </AlertTitle>
            </Alert>
          </div>
          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
