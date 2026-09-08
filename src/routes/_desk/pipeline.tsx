import { createFileRoute } from "@tanstack/react-router";
import { PipelineScreen } from "@/components/desk/PipelineScreen";
import { useDeskModals } from "@/components/desk/desk-modals";

export const Route = createFileRoute("/_desk/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const { setDrawerClientId, setSelectedObligation } = useDeskModals();
  return (
    <PipelineScreen
      onOpenClientDrawer={(cid) => setDrawerClientId(cid)}
      onSelectObligation={(ob) => setSelectedObligation(ob)}
    />
  );
}
