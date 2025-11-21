import { redirect } from "next/navigation";

export default async function SchoolsPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  redirect(`/sc/schools/${visibleId}/fellows`);
}
