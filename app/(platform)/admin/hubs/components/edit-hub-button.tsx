"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { fetchHubSessionNames, type HubSessionName } from "#/lib/actions/admin/hubs";
import type { AdminHubDetail } from "../queries";
import HubDialog from "./hub-dialog";

export default function EditHubButton({ hub }: { hub: AdminHubDetail }) {
  const [showEdit, setShowEdit] = useState(false);
  const [sessionNames, setSessionNames] = useState<HubSessionName[]>([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const openEdit = async () => {
    if (isLoadingEdit) return;
    setIsLoadingEdit(true);
    try {
      const response = await fetchHubSessionNames(hub.id);
      if (!response.success || !response.data) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      setSessionNames(response.data);
      setShowEdit(true);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="flex gap-2"
        loading={isLoadingEdit}
        onClick={toastOnError(openEdit)}
      >
        <Pencil className="h-4 w-4" />
        Edit hub
      </Button>
      <HubDialog open={showEdit} onOpenChange={setShowEdit} edit={{ hub, sessionNames }} />
    </>
  );
}
