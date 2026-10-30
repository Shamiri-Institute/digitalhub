import { redirect } from "next/navigation";

export default async function HubPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  redirect(`/admin/hubs/${hubId}/schools`);
}
