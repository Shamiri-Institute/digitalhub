import { ImplementerRole } from "#/db/enums";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";

export default function Loading() {
  return <SessionsDatatableSkeleton role={ImplementerRole.FELLOW} />;
}
