import { createFileRoute } from "@tanstack/react-router";
import { TrackersScreen } from "@/components/desk/TrackersScreen";
import { useDeskModals } from "@/components/desk/desk-modals";

type TrackersSearch = {
  stream?: string;
};

export const Route = createFileRoute("/_desk/trackers")({
  validateSearch: (search: Record<string, unknown>): TrackersSearch => ({
    stream: typeof search.stream === "string" ? search.stream : undefined,
  }),
  component: TrackersPage,
});

function TrackersPage() {
  const { stream } = Route.useSearch();
  const { setDrawerClientId, setSelectedObligation } = useDeskModals();
  return (
    <TrackersScreen
      initialStream={stream}
      onOpenClientDrawer={(cid) => setDrawerClientId(cid)}
      onSelectObligation={(ob) => setSelectedObligation(ob)}
    />
  );
}
