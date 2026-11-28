"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { CopyPageImage } from "#/components/common/survey/copy/copy-page-image";
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
import { toast, toastOnError } from "#/components/ui/use-toast";
import { placeScanPage } from "#/lib/actions/survey/scan-pages";
import { PlaceScanPageSchema } from "#/lib/actions/survey/schemas";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { UnidentifiedPage } from "#/lib/survey/scan-pages/unidentified";
import { zodResolver } from "#/lib/zod-resolver";

export function UnidentifiedPageCard({
  page,
  showHub,
  timeZone,
}: {
  page: UnidentifiedPage;
  showHub: boolean;
  /** Null until the browser has set the viewer's zone. */
  timeZone: string | null;
}) {
  const facts = [
    `Page ${page.pageIndex + 1} of the file`,
    timeZone && `received ${formatDateTimeIn(page.receivedAt, timeZone)}`,
    showHub && page.hubName,
  ].filter(Boolean);
  return (
    <li className="space-y-3 rounded-lg border border-grey-border bg-white p-4">
      <div className="rounded-lg bg-muted p-3">
        {page.image ? (
          <a
            href={page.image.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open page ${page.pageIndex + 1} of ${page.fileName} full size`}
            className="block focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:outline-none"
          >
            <CopyPageImage
              url={page.image.url}
              alt={`Page ${page.pageIndex + 1} of ${page.fileName}, as scanned`}
              className="max-h-[70vh] w-auto"
            />
          </a>
        ) : (
          <CopyPageImage url={null} alt="" />
        )}
      </div>
      <div className="space-y-0.5 text-sm">
        <p className="font-medium break-words text-shamiri-black">{page.fileName}</p>
        <p className="text-shamiri-text-grey">{facts.join(" · ")}</p>
      </div>
      <PlacePageForm scanPageId={page.id} />
    </li>
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
