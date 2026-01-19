import { ImplementerRole } from "@prisma/client";
import FilesDatatableSkeleton from "#/components/common/files/files-datatable-skeleton";

export default function Loading() {
  return <FilesDatatableSkeleton role={ImplementerRole.FELLOW} />;
}
