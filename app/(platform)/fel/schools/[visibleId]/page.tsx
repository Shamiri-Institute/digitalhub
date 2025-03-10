import { redirect } from "next/navigation";

export default function SchoolsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  redirect(`/fel/schools/${visibleId}/sessions`);
}
