"use client";
import { Alert, AlertDescription } from "#/components/ui/alert";
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
            <div></div>
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button>Cancel</Button>
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
            </DialogHeader>
            <Separator />
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}
