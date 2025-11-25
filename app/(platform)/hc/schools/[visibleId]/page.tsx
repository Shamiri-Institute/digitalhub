import { redirect } from "next/navigation";

export default async function SchoolsPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

  redirect(`/hc/schools/${visibleId}/supervisors`);
}
