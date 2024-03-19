"use client";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form } from "#/components/ui/form";
import { Separator } from "#/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Button } from "react-day-picker";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DropoutSchoolSchema } from "../schemas";

export async function dropoutSchool({
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
      <form>
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogTrigger asChild>{children}</DialogTrigger>
          <DialogContent className="p-5">
            <DialogHeader>
              <h2>Drop out school</h2>
              <Alert>
                <AlertDescription>{schoolId}</AlertDescription>
              </Alert>
            </DialogHeader>
            <Separator />
            <div className="space-y-2">
              <h3>
                Select reason <span>*</span>
              </h3>
              <div>Select options go here with the form field</div>
            </div>
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                onClick={() => {
                  setFormDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setFormDialogOpen(false);
                  setConfirmDialogOpen(true);
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
              <Alert>
                <AlertDescription>{schoolId}</AlertDescription>
              </Alert>
            </DialogHeader>
            <div className="space-y-4">
              <h3>Are you sure?</h3>
              <Alert variant="destructive">
                <AlertTitle>
                  Once this change has been made it is irreversible and will
                  need you to contact support in order to modify. Please be sure
                  of your action before you confirm.
                </AlertTitle>
              </Alert>
            </div>
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
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
      </form>
    </Form>
  );
}
