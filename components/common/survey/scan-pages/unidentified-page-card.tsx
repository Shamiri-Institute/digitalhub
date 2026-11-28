"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ScanPageFigure } from "#/components/common/survey/scan-pages/scan-page-figure";
import { Button } from "#/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { toast, toastOnError, toastOnFailure } from "#/components/ui/use-toast";
import { placeScanPage, putScanPageBack, setScanPageAside } from "#/lib/actions/survey/scan-pages";
import { PlaceScanPageSchema } from "#/lib/actions/survey/schemas";
import type { UnidentifiedPage } from "#/lib/survey/scan-pages/unidentified";
import { zodResolver } from "#/lib/zod-resolver";

export function UnidentifiedPageCard({
  page,
  showHub,
  timeZone,
}: {
  page: UnidentifiedPage;
  showHub: boolean;
  timeZone: string | null;
}) {
  return (
    <li className="space-y-3 rounded-lg border border-grey-border bg-white p-4">
      <ScanPageFigure page={page} showHub={showHub} timeZone={timeZone} />
      <PlacePageForm scanPageId={page.id} />
      <SetAsideButton scanPageId={page.id} />
    </li>
  );
}

/** Undone from its toast, since a blank back or a cover sheet is set aside at a glance. */
function SetAsideButton({ scanPageId }: { scanPageId: string }) {
  const [isPending, startTransition] = useTransition();
  const undo = toastOnError(async () => {
    const response = await putScanPageBack({ scanPageId });
    toast({
      description: response.message,
      variant: response.success ? "default" : "destructive",
    });
  });
  const onClick = () =>
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await setScanPageAside({ scanPageId });
        toast(
          response.success
            ? { description: response.message, action: { label: "Undo", onClick: undo } }
            : { description: response.message, variant: "destructive" },
        );
      }),
    );
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={isPending}
      loading={isPending}
    >
      Not a survey page
    </Button>
  );
}

function PlacePageForm({ scanPageId }: { scanPageId: string }) {
  const router = useRouter();
  const form = useForm<z.infer<typeof PlaceScanPageSchema>>({
    resolver: zodResolver(PlaceScanPageSchema),
    defaultValues: { scanPageId, code: "" },
  });

  const onSubmit = async (values: z.infer<typeof PlaceScanPageSchema>) => {
    const response = await placeScanPage(values);
    const leftTheList = response.data;
    if (!leftTheList) {
      // Shown under the code, where the viewer fixes it.
      form.setError("code", { message: response.message });
      return;
    }
    // The page has refreshed without this card, so the outcome is told in a toast.
    toast(
      leftTheList.kind === "placed"
        ? {
            description: response.message,
            action: { label: "Open copy", onClick: () => router.push(leftTheList.copyHref) },
          }
        : { description: response.message, variant: "destructive" },
    );
  };

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={toastOnError(form.handleSubmit(onSubmit))}
        className="flex flex-wrap items-start gap-2"
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem className="min-w-56 flex-1 space-y-1">
              <FormLabel>Printed page code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="BASE26-000017-P3"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono uppercase"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="mt-6"
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
        >
          Place page
        </Button>
      </form>
    </Form>
  );
}
