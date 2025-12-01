import { redirect } from "next/navigation";

export default async function AdminSchoolsPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  redirect(`/admin/schools/${visibleId}/supervisors`);
}
