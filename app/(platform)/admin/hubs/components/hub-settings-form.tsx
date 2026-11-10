"use client";

import { Info, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { Button } from "#/components/ui/button";
import { Form } from "#/components/ui/form";
import { toastOnError } from "#/components/ui/use-toast";
import { EditHubFormSchema } from "#/lib/actions/admin/hub-schemas";
import { updateHub } from "#/lib/actions/admin/hubs";
import { useLeaveGuard } from "#/lib/hooks/use-leave-guard";
import { zodResolver } from "#/lib/zod-resolver";
import type { HubSessionName } from "../queries";
import {
  HUB_DETAILS_DESCRIPTION,
  SESSION_TYPES_DESCRIPTION,
  SessionGroupHeading,
  SettingsSection,
} from "./hub-settings-layout";
import {
  diffSessionTypes,
  HubConfirmDialog,
  HubNameField,
  SessionTypeRows,
  sessionTypeCount,
  useConfirmedSave,
  useSessionTypeGroups,
  withCodes,
} from "./session-types";

type EditFormValues = z.infer<typeof EditHubFormSchema>;

/** The hub settings for a super admin. */
export default function HubSettingsForm({
  hub,
  sessionNames,
}: {
  hub: { id: string; hubName: string };
  sessionNames: HubSessionName[];
}) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(EditHubFormSchema),
    defaultValues: {
      hubName: hub.hubName,
      sessionTypes: sessionNames.map((n) => ({
        sessionNameId: n.id,
        type: n.sessionType,
        label: n.sessionLabel,
        amount: n.amount,
      })),
    },
  });
  const storedById = new Map(sessionNames.map((n) => [n.id, n]));
  const storedSessionTypes = sessionNames.map((n) => ({
    code: n.sessionName,
    label: n.sessionLabel,
    amount: n.amount,
  }));

  const [hubName, sessionTypes] = useWatch({
    control: form.control,
    name: ["hubName", "sessionTypes"],
  });
  const unsavedChangeCount =
    diffSessionTypes(storedSessionTypes, withCodes(sessionTypes, storedById)).length +
    (hubName.trim() === hub.hubName ? 0 : 1);
  useLeaveGuard(unsavedChangeCount > 0);

  const { pending, setPending, isSaving, confirm } = useConfirmedSave<EditFormValues>((saved) =>
    updateHub({ hubId: hub.id, loadedSessionNameIds: sessionNames.map((n) => n.id), ...saved }),
  );
  const changes = pending
    ? diffSessionTypes(storedSessionTypes, withCodes(pending.sessionTypes, storedById))
    : [];
  const renamed = pending !== null && pending.hubName !== hub.hubName;

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(setPending))}>
        <SettingsSection title="Hub details" description={HUB_DETAILS_DESCRIPTION}>
          <div className="max-w-md">
            <HubNameField storedName={hub.hubName} />
          </div>
        </SettingsSection>
        <SettingsSection title="Session types" description={SESSION_TYPES_DESCRIPTION}>
          <p className="flex items-start gap-2 rounded-lg border border-info-border bg-info-bg px-4 py-3 text-sm text-foreground">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Attendance marked after you save is paid at the new amount. Payouts already recorded
            keep their amount, including when attendance is unmarked.
          </p>
          <SessionTypeGroups storedById={storedById} />
        </SettingsSection>
        {unsavedChangeCount > 0 && (
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t bg-white px-4 py-3">
            <output className="text-sm font-medium">
              {unsavedChangeCount} unsaved {unsavedChangeCount === 1 ? "change" : "changes"}
            </output>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Discard
              </Button>
              <Button type="submit">Review and save</Button>
            </div>
          </div>
        )}
      </form>
      <HubConfirmDialog
        open={pending !== null}
        title="Save changes to hub?"
        summary={
          renamed ? (
            <>
              <span className="font-semibold text-foreground">{hub.hubName}</span> will be renamed
              to <span className="font-semibold text-foreground">{pending.hubName}</span>.
            </>
          ) : (
            <>
              You are about to update{" "}
              <span className="font-semibold text-foreground">{hub.hubName}</span>.
            </>
          )
        }
        changes={changes}
        changesHeading={`${sessionTypeCount(changes.length)} will change`}
        emptyText="Session types stay as they are."
        confirmLabel="Save changes"
        isSaving={isSaving}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        onConfirm={toastOnError(confirm)}
      />
    </Form>
  );
}

function SessionTypeGroups({ storedById }: { storedById: ReadonlyMap<string, HubSessionName> }) {
  const { groups, addRow, remove } = useSessionTypeGroups(storedById);
  return groups.map((group) => {
    const { category } = group;
    const addButton = category && (
      <Button
        type="button"
        variant="ghost"
        className="gap-1.5 px-2 text-primary hover:bg-info-bg hover:text-primary"
        onClick={() => addRow(category)}
      >
        <Plus aria-hidden className="h-4 w-4" />
        Add {group.noun}
      </Button>
    );
    return (
      <div key={group.type} className="space-y-2">
        {group.rows.length === 0 ? (
          <>
            <SessionGroupHeading label={group.label} count={0} />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-4 py-2">
              <p className="text-sm text-muted-foreground">No {group.noun}s at this hub.</p>
              {addButton}
            </div>
          </>
        ) : (
          <>
            <SessionGroupHeading label={group.label} count={group.rows.length}>
              {addButton}
            </SessionGroupHeading>
            <div className="rounded-lg border p-3">
              <SessionTypeRows group={group} storedById={storedById} onRemove={remove} />
            </div>
          </>
        )}
      </div>
    );
  });
}
