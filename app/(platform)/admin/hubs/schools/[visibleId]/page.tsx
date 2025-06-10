import { redirect } from "next/navigation";

export default function AdminSchoolsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  redirect(`/admin/schools/${visibleId}/supervisors`);
}
