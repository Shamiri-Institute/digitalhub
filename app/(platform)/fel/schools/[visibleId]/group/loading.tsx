import { ImplementerRole } from "#/db/enums";
import GroupsDatatableSkeleton from "#/components/common/group/groups-datatable-skeleton";

export default function Loading() {
  return <GroupsDatatableSkeleton role={ImplementerRole.FELLOW} rows={1} />;
}
