import { createFileRoute } from "@tanstack/react-router";
import { TodayScreen } from "@/components/desk/TodayScreen";
import { useDeskModals } from "@/components/desk/desk-modals";

export const Route = createFileRoute("/_desk/")({
  component: TodayPage,
});

function TodayPage() {
  const { setDrawerClientId, setSelectedObligation, openAddObligation } = useDeskModals();
  return (
    <TodayScreen
      onOpenClientDrawer={(cid) => setDrawerClientId(cid)}
      onSelectObligation={(ob) => setSelectedObligation(ob)}
      onAddObligation={() => openAddObligation(null)}
    />
  );
}
