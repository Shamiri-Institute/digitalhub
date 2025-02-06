import { redirect } from "next/navigation";

export default function SchoolsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  redirect(`/sc/schools/${visibleId}/fellows`);
}
