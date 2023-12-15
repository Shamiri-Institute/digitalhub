'use client'
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
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
import { useForm } from 'react-hook-form';
import { Separator } from '#/components/ui/separator';
import { Textarea } from '#/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '#/components/ui/card';
import { Button } from '#/components/ui/button';


type Props = {
  children: ReactNode;
}

export default function ReportingNotesForm(props: Props) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm();

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger>{props.children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form>
            <Card>
              <CardHeader>
                <CardTitle>Reporting Notes</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent>
                <div>
                  Past complaints go here
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <Textarea placeholder="write notes here" {...field} />
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="brand">Add Reporting Note</Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
