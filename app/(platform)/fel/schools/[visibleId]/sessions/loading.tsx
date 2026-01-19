import { ImplementerRole } from "@prisma/client";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";

export default function Loading() {
  return <SessionsDatatableSkeleton role={ImplementerRole.FELLOW} />;
}
