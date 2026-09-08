import { createFileRoute } from "@tanstack/react-router";
import { ClientsScreen } from "@/components/desk/ClientsScreen";
import { useDeskModals } from "@/components/desk/desk-modals";

export const Route = createFileRoute("/_desk/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const { setDrawerClientId } = useDeskModals();
  return <ClientsScreen onSelectClient={(cid) => setDrawerClientId(cid)} />;
}
