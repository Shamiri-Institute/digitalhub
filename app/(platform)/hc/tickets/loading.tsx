import TicketsLoading from "#/components/common/ticket/loading";

export default function Loading() {
  return <TicketsLoading showCreateButton={false} userRole="HUB_COORDINATOR" />;
}
